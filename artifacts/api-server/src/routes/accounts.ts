import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bankAccountsTable } from "@workspace/db";
import {
  CreateBankAccountBody,
  UpdateBankAccountParams,
  UpdateBankAccountBody,
  DeleteBankAccountParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole, type JwtPayload } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

function formatAccount(a: typeof bankAccountsTable.$inferSelect) {
  return {
    id: a.id,
    label: a.label,
    accountNumber: a.accountNumber,
    bankName: a.bankName,
    isActive: a.isActive,
    balance: a.balance != null ? parseFloat(a.balance) : null,
    currency: a.currency,
  };
}

router.get("/accounts", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const accounts = await db.select().from(bankAccountsTable).orderBy(bankAccountsTable.id);
  res.json(accounts.map(formatAccount));
});

router.post("/accounts", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const jwtUser = (req as typeof req & { user: JwtPayload }).user;
  const parsed = CreateBankAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [account] = await db
    .insert(bankAccountsTable)
    .values({
      label: parsed.data.label,
      accountNumber: parsed.data.accountNumber,
      bankName: parsed.data.bankName,
      currency: parsed.data.currency ?? "NGN",
    })
    .returning();

  await logAudit("BANK_ACCOUNT_ADDED", jwtUser, `Added account ${parsed.data.label}`, req);

  res.status(201).json(formatAccount(account));
});

router.patch(
  "/accounts/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const jwtUser = (req as typeof req & { user: JwtPayload }).user;
    const params = UpdateBankAccountParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateBankAccountBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [account] = await db
      .update(bankAccountsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(bankAccountsTable.id, params.data.id))
      .returning();

    if (!account) {
      res.status(404).json({ error: "Bank account not found" });
      return;
    }

    await logAudit("BANK_ACCOUNT_UPDATED", jwtUser, `Updated account ${account.label}`, req);

    res.json(formatAccount(account));
  }
);

router.delete(
  "/accounts/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const jwtUser = (req as typeof req & { user: JwtPayload }).user;
    const params = DeleteBankAccountParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [account] = await db
      .delete(bankAccountsTable)
      .where(eq(bankAccountsTable.id, params.data.id))
      .returning();

    if (!account) {
      res.status(404).json({ error: "Bank account not found" });
      return;
    }

    await logAudit("BANK_ACCOUNT_REMOVED", jwtUser, `Removed account ${account.label}`, req);

    res.json({ message: "Bank account removed" });
  }
);

export default router;

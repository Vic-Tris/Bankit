import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, beneficiariesTable } from "@workspace/db";
import {
  CreateBeneficiaryBody,
  DeleteBeneficiaryParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole, type JwtPayload } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

router.get("/beneficiaries", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const bens = await db.select().from(beneficiariesTable).orderBy(beneficiariesTable.name);
  res.json(
    bens.map((b) => ({
      id: b.id,
      name: b.name,
      accountNumber: b.accountNumber,
      bankName: b.bankName,
      email: b.email ?? null,
    }))
  );
});

router.post("/beneficiaries", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const jwtUser = (req as typeof req & { user: JwtPayload }).user;
  const parsed = CreateBeneficiaryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ben] = await db
    .insert(beneficiariesTable)
    .values({
      name: parsed.data.name,
      accountNumber: parsed.data.accountNumber,
      bankName: parsed.data.bankName,
      email: parsed.data.email ?? null,
    })
    .returning();

  await logAudit("BENEFICIARY_ADDED", jwtUser, `Added beneficiary ${ben.name}`, req);

  res.status(201).json({ id: ben.id, name: ben.name, accountNumber: ben.accountNumber, bankName: ben.bankName, email: ben.email ?? null });
});

router.delete(
  "/beneficiaries/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const jwtUser = (req as typeof req & { user: JwtPayload }).user;
    const params = DeleteBeneficiaryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [ben] = await db
      .delete(beneficiariesTable)
      .where(eq(beneficiariesTable.id, params.data.id))
      .returning();

    if (!ben) {
      res.status(404).json({ error: "Beneficiary not found" });
      return;
    }

    await logAudit("BENEFICIARY_REMOVED", jwtUser, `Removed beneficiary ${ben.name}`, req);

    res.json({ message: "Beneficiary removed" });
  }
);

export default router;

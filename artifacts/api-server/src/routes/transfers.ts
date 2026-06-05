import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, transfersTable, beneficiariesTable } from "@workspace/db";
import {
  ListTransfersQueryParams,
  GetTransferParams,
  InitiateTransferBody,
  ApproveTransferParams,
  RejectTransferParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole, type JwtPayload } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

async function formatTransfer(t: typeof transfersTable.$inferSelect) {
  const [ben] = await db
    .select({ name: beneficiariesTable.name })
    .from(beneficiariesTable)
    .where(eq(beneficiariesTable.id, t.beneficiaryId))
    .limit(1);

  return {
    id: t.id,
    amount: parseFloat(t.amount),
    fromAccountId: t.fromAccountId ?? null,
    beneficiaryId: t.beneficiaryId,
    beneficiaryName: ben?.name ?? null,
    narration: t.narration ?? null,
    status: t.status,
    initiatedBy: t.initiatedBy,
    approvedBy: t.approvedBy ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt?.toISOString() ?? null,
  };
}

router.get(
  "/transfers",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = ListTransfersQueryParams.safeParse(req.query);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const { page = 1, limit = 20 } = params.data;
    const offset = ((page as number) - 1) * (limit as number);

    const rows = await db
      .select()
      .from(transfersTable)
      .orderBy(sql`${transfersTable.createdAt} DESC`)
      .limit(limit as number)
      .offset(offset);

    const formatted = await Promise.all(rows.map(formatTransfer));
    res.json(formatted);
  }
);

router.post(
  "/transfers",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const jwtUser = (req as typeof req & { user: JwtPayload }).user;
    const parsed = InitiateTransferBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [transfer] = await db
      .insert(transfersTable)
      .values({
        amount: String(parsed.data.amount),
        beneficiaryId: parsed.data.beneficiaryId,
        fromAccountId: parsed.data.fromAccountId ?? null,
        narration: parsed.data.narration ?? null,
        initiatedBy: jwtUser.userId,
        status: "pending",
      })
      .returning();

    await logAudit(
      "TRANSFER_INITIATED",
      jwtUser,
      `Initiated transfer of ${parsed.data.amount}`,
      req
    );

    res.status(201).json(await formatTransfer(transfer));
  }
);

router.get(
  "/transfers/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = GetTransferParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [transfer] = await db
      .select()
      .from(transfersTable)
      .where(eq(transfersTable.id, params.data.id))
      .limit(1);

    if (!transfer) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }

    res.json(await formatTransfer(transfer));
  }
);

router.post(
  "/transfers/:id/approve",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const jwtUser = (req as typeof req & { user: JwtPayload }).user;
    const params = ApproveTransferParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [transfer] = await db
      .update(transfersTable)
      .set({
        status: "approved",
        approvedBy: jwtUser.userId,
        updatedAt: new Date(),
      })
      .where(eq(transfersTable.id, params.data.id))
      .returning();

    if (!transfer) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }

    await logAudit("TRANSFER_APPROVED", jwtUser, `Approved transfer #${transfer.id}`, req);

    res.json(await formatTransfer(transfer));
  }
);

router.post(
  "/transfers/:id/reject",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const jwtUser = (req as typeof req & { user: JwtPayload }).user;
    const params = RejectTransferParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [transfer] = await db
      .update(transfersTable)
      .set({
        status: "rejected",
        approvedBy: jwtUser.userId,
        updatedAt: new Date(),
      })
      .where(eq(transfersTable.id, params.data.id))
      .returning();

    if (!transfer) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }

    await logAudit("TRANSFER_REJECTED", jwtUser, `Rejected transfer #${transfer.id}`, req);

    res.json(await formatTransfer(transfer));
  }
);

export default router;

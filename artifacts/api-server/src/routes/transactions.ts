import { Router, type IRouter } from "express";
import { eq, ilike, and, gte, lte, or, count, sql } from "drizzle-orm";
import { db, transactionsTable, receiptsTable } from "@workspace/db";
import {
  ListTransactionsQueryParams,
  GetTransactionParams,
  GetTransactionReceiptParams,
  VerifyPaymentBody,
} from "@workspace/api-zod";
import { requireAuth, type JwtPayload } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

function formatTx(t: typeof transactionsTable.$inferSelect) {
  return {
    id: t.id,
    cplid: t.cplid,
    amount: parseFloat(t.amount),
    customerName: t.customerName,
    customerAccountNumber: t.customerAccountNumber,
    bankName: t.bankName,
    date: t.date.toISOString(),
    status: t.status,
    referenceNumber: t.referenceNumber,
    description: t.description ?? null,
    verifiedBy: t.verifiedBy ?? null,
    verifiedAt: t.verifiedAt?.toISOString() ?? null,
  };
}

router.get("/transactions", requireAuth, async (req, res): Promise<void> => {
  const params = ListTransactionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { search, status, startDate, endDate, page = 1, limit = 20 } = params.data;
  const offset = ((page as number) - 1) * (limit as number);

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(transactionsTable.customerName, `%${search}%`),
        ilike(transactionsTable.cplid, `%${search}%`),
        ilike(transactionsTable.referenceNumber, `%${search}%`)
      )
    );
  }
  if (status) {
    conditions.push(eq(transactionsTable.status, status as "verified" | "pending" | "failed"));
  }
  if (startDate) {
    conditions.push(gte(transactionsTable.date, new Date(startDate as string)));
  }
  if (endDate) {
    conditions.push(lte(transactionsTable.date, new Date(endDate as string)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(transactionsTable)
      .where(where)
      .orderBy(sql`${transactionsTable.date} DESC`)
      .limit(limit as number)
      .offset(offset),
    db.select({ total: count() }).from(transactionsTable).where(where),
  ]);

  res.json({
    data: rows.map(formatTx),
    total: Number(totalRow?.total ?? 0),
    page: page as number,
    limit: limit as number,
  });
});

router.get("/transactions/recent", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(transactionsTable)
    .orderBy(sql`${transactionsTable.date} DESC`)
    .limit(10);
  res.json(rows.map(formatTx));
});

router.get("/transactions/summary", requireAuth, async (_req, res): Promise<void> => {
  const all = await db.select().from(transactionsTable);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTxs = all.filter((t) => new Date(t.date) >= today);
  res.json({
    verified: all.filter((t) => t.status === "verified").length,
    pending: all.filter((t) => t.status === "pending").length,
    failed: all.filter((t) => t.status === "failed").length,
    totalCount: all.length,
    todayCount: todayTxs.length,
  });
});

router.get("/transactions/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [tx] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.id, params.data.id))
    .limit(1);

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json(formatTx(tx));
});

router.get("/transactions/:id/receipt", requireAuth, async (req, res): Promise<void> => {
  const params = GetTransactionReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [tx] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.id, params.data.id))
    .limit(1);

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  // Find or create receipt
  let [receipt] = await db
    .select()
    .from(receiptsTable)
    .where(eq(receiptsTable.transactionId, tx.id))
    .limit(1);

  if (!receipt) {
    const baseUrl = process.env.BASE_URL ?? "https://bankit.app";
    const qrData = `${baseUrl}/verify/${tx.cplid}`;
    [receipt] = await db
      .insert(receiptsTable)
      .values({
        transactionId: tx.id,
        cplid: tx.cplid,
        customerName: tx.customerName,
        amount: tx.amount,
        status: tx.status,
        referenceNumber: tx.referenceNumber,
        qrCodeData: qrData,
      })
      .returning();
  }

  res.json({
    id: receipt.id,
    transactionId: receipt.transactionId,
    cplid: receipt.cplid,
    customerName: receipt.customerName,
    amount: parseFloat(receipt.amount),
    status: receipt.status,
    referenceNumber: receipt.referenceNumber,
    issuedAt: receipt.issuedAt.toISOString(),
    qrCodeData: receipt.qrCodeData ?? null,
  });
});

router.post("/transactions/verify", requireAuth, async (req, res): Promise<void> => {
  const jwtUser = (req as typeof req & { user: JwtPayload }).user;
  const parsed = VerifyPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const q = parsed.data.query.trim();
  const [tx] = await db
    .select()
    .from(transactionsTable)
    .where(
      or(
        ilike(transactionsTable.cplid, q),
        ilike(transactionsTable.referenceNumber, q),
        ilike(transactionsTable.invoiceNumber, q),
        ilike(transactionsTable.customerPhone, q)
      )
    )
    .limit(1);

  await logAudit("PAYMENT_VERIFICATION", jwtUser, `Searched for: ${q}`, req);

  if (!tx) {
    res.json({ found: false, status: null, customerName: null, amount: null, paymentDate: null, referenceNumber: null, cplid: null });
    return;
  }

  // Role-masked: sales_rep only sees verification result, not revenue totals
  res.json({
    found: true,
    status: tx.status,
    customerName: tx.customerName,
    amount: parseFloat(tx.amount),
    paymentDate: tx.date.toISOString(),
    referenceNumber: tx.referenceNumber,
    cplid: tx.cplid,
  });
});

// Public endpoint — no auth required
router.get("/verify/:cplid", async (req, res): Promise<void> => {
  const cplid = Array.isArray(req.params.cplid) ? req.params.cplid[0] : req.params.cplid;

  const [tx] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.cplid, cplid))
    .limit(1);

  if (!tx) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.json({
    status: tx.status,
    customerName: tx.customerName,
    amount: parseFloat(tx.amount),
    paymentDate: tx.date.toISOString(),
    companyName: "Bankit Enterprise",
    cplid: tx.cplid,
  });
});

export default router;

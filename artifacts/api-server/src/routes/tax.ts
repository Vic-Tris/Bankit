import { Router, type IRouter } from "express";
import { gte, and, eq } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

const VAT_RATE = 0.075; // 7.5% Nigeria VAT
const CIT_RATE = 0.30; // 30% corporate income tax
const WITHOLDING_RATE = 0.05; // 5% withholding

router.get("/tax/dashboard", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const verifiedTxs = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.status, "verified"));

  const todayAmount = verifiedTxs
    .filter((t) => new Date(t.date) >= todayStart)
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  const monthAmount = verifiedTxs
    .filter((t) => new Date(t.date) >= monthStart)
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  const yearAmount = verifiedTxs
    .filter((t) => new Date(t.date) >= yearStart)
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  const totalAmount = verifiedTxs.reduce((s, t) => s + parseFloat(t.amount), 0);

  const dailyEstimate = todayAmount * CIT_RATE;
  const monthlyEstimate = monthAmount * CIT_RATE;
  const annualEstimate = yearAmount * CIT_RATE;
  const vatTotal = totalAmount * VAT_RATE;
  const revenueProjection = yearAmount * 1.15; // 15% growth projection

  res.json({
    dailyEstimate,
    monthlyEstimate,
    annualEstimate,
    vatTotal,
    revenueProjection,
    breakdown: [
      { label: "Corporate Income Tax (30%)", amount: annualEstimate, rate: CIT_RATE },
      { label: "Value Added Tax (7.5%)", amount: vatTotal, rate: VAT_RATE },
      { label: "Withholding Tax (5%)", amount: totalAmount * WITHOLDING_RATE, rate: WITHOLDING_RATE },
    ],
  });
});

export default router;

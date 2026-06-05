import { Router, type IRouter } from "express";
import { gte, lte, and, sql, eq } from "drizzle-orm";
import { db, transactionsTable, transfersTable, auditLogsTable, usersTable } from "@workspace/db";
import { GetRevenueReportQueryParams, ExportReportQueryParams } from "@workspace/api-zod";
import { requireAuth, requireRole, type JwtPayload } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;

  if (period === "daily") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    start = new Date(now);
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (period === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    // annual
    start = new Date(now.getFullYear(), 0, 1);
  }

  return { start, end };
}

router.get(
  "/reports/revenue",
  requireAuth,
  requireRole("admin", "account_officer"),
  async (req, res): Promise<void> => {
    const params = GetRevenueReportQueryParams.safeParse(req.query);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const period = (params.data.period as string) ?? "monthly";
    const { start, end } = getDateRange(period);

    const txs = await db
      .select()
      .from(transactionsTable)
      .where(
        and(
          gte(transactionsTable.date, start),
          lte(transactionsTable.date, end),
          eq(transactionsTable.status, "verified")
        )
      );

    const totalRevenue = txs.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Build breakdown
    let breakdownMap: Record<string, { amount: number; count: number }> = {};
    for (const tx of txs) {
      let label: string;
      const d = new Date(tx.date);
      if (period === "daily") {
        label = `${d.getHours()}:00`;
      } else if (period === "weekly") {
        label = d.toLocaleDateString("en-US", { weekday: "short" });
      } else if (period === "monthly") {
        label = `Week ${Math.ceil(d.getDate() / 7)}`;
      } else {
        label = d.toLocaleDateString("en-US", { month: "short" });
      }

      if (!breakdownMap[label]) breakdownMap[label] = { amount: 0, count: 0 };
      breakdownMap[label].amount += parseFloat(tx.amount);
      breakdownMap[label].count += 1;
    }

    res.json({
      period,
      totalRevenue,
      transactionCount: txs.length,
      periodBreakdown: Object.entries(breakdownMap).map(([label, v]) => ({
        label,
        amount: v.amount,
        count: v.count,
      })),
    });
  }
);

router.get("/reports/dashboard", requireAuth, async (req, res): Promise<void> => {
  const jwtUser = (req as typeof req & { user: JwtPayload }).user;
  const role = jwtUser.role;

  const allTxs = await db.select().from(transactionsTable);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTxs = allTxs.filter((t) => new Date(t.date) >= today);
  const verifiedTxs = allTxs.filter((t) => t.status === "verified");
  const pendingTxs = allTxs.filter((t) => t.status === "pending");

  const todayRevenue =
    role !== "sales_rep"
      ? todayTxs.filter((t) => t.status === "verified").reduce((s, t) => s + parseFloat(t.amount), 0)
      : null;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weeklyRevenue =
    role !== "sales_rep"
      ? verifiedTxs.filter((t) => new Date(t.date) >= weekStart).reduce((s, t) => s + parseFloat(t.amount), 0)
      : null;

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthlyRevenue =
    role !== "sales_rep"
      ? verifiedTxs.filter((t) => new Date(t.date) >= monthStart).reduce((s, t) => s + parseFloat(t.amount), 0)
      : null;

  const grossRevenue =
    role === "admin"
      ? verifiedTxs.reduce((s, t) => s + parseFloat(t.amount), 0)
      : null;

  const yearStart = new Date(today.getFullYear(), 0, 1);
  const annualRevenue =
    role === "admin"
      ? verifiedTxs.filter((t) => new Date(t.date) >= yearStart).reduce((s, t) => s + parseFloat(t.amount), 0)
      : null;

  let totalUsers = null;
  let pendingTransfers = null;

  if (role === "admin") {
    const users = await db.select({ id: usersTable.id }).from(usersTable);
    totalUsers = users.length;

    const transfers = await db
      .select()
      .from(transfersTable)
      .where(eq(transfersTable.status, "pending"));
    pendingTransfers = transfers.length;
  }

  res.json({
    role,
    recentVerifications: verifiedTxs.slice(-10).length,
    pendingVerifications: pendingTxs.length,
    todayRevenue,
    weeklyRevenue,
    monthlyRevenue,
    grossRevenue,
    annualRevenue,
    totalUsers,
    pendingTransfers,
    totalTransactions: allTxs.length,
    verifiedToday: todayTxs.filter((t) => t.status === "verified").length,
  });
});

router.get(
  "/reports/export",
  requireAuth,
  requireRole("admin", "account_officer"),
  async (req, res): Promise<void> => {
    const jwtUser = (req as typeof req & { user: JwtPayload }).user;
    const params = ExportReportQueryParams.safeParse(req.query);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const type = (params.data.type as string) ?? "transactions";
    const period = (params.data.period as string) ?? "monthly";
    const { start, end } = getDateRange(period);

    let data: object[] = [];

    if (type === "revenue") {
      const txs = await db
        .select()
        .from(transactionsTable)
        .where(and(gte(transactionsTable.date, start), lte(transactionsTable.date, end)));
      data = txs.map((t) => ({
        cplid: t.cplid,
        amount: parseFloat(t.amount),
        status: t.status,
        date: t.date,
        customerName: t.customerName,
      }));
    } else if (type === "transactions") {
      const txs = await db
        .select()
        .from(transactionsTable)
        .where(and(gte(transactionsTable.date, start), lte(transactionsTable.date, end)));
      data = txs.map((t) => ({
        id: t.id,
        cplid: t.cplid,
        customerName: t.customerName,
        amount: parseFloat(t.amount),
        status: t.status,
        referenceNumber: t.referenceNumber,
        date: t.date,
      }));
    } else if (type === "audit") {
      const logs = await db
        .select()
        .from(auditLogsTable)
        .where(and(gte(auditLogsTable.createdAt, start), lte(auditLogsTable.createdAt, end)));
      data = logs.map((l) => ({
        id: l.id,
        action: l.action,
        userName: l.userName,
        userRole: l.userRole,
        details: l.details,
        createdAt: l.createdAt,
      }));
    }

    await logAudit("REPORT_DOWNLOAD", jwtUser, `Downloaded ${type} report (${period})`, req);

    res.json({
      type,
      period,
      generatedAt: new Date().toISOString(),
      data,
    });
  }
);

export default router;

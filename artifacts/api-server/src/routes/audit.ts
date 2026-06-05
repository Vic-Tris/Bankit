import { Router, type IRouter } from "express";
import { eq, gte, lte, and, count, sql } from "drizzle-orm";
import { db, auditLogsTable } from "@workspace/db";
import { ListAuditLogsQueryParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

function formatLog(l: typeof auditLogsTable.$inferSelect) {
  return {
    id: l.id,
    action: l.action,
    userId: l.userId ?? 0,
    userName: l.userName,
    userRole: l.userRole ?? null,
    details: l.details ?? null,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt.toISOString(),
  };
}

router.get(
  "/audit/logs",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = ListAuditLogsQueryParams.safeParse(req.query);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const { action, userId, startDate, endDate, page = 1, limit = 50 } = params.data;
    const offset = ((page as number) - 1) * (limit as number);

    const conditions = [];
    if (action) conditions.push(eq(auditLogsTable.action, action as string));
    if (userId) conditions.push(eq(auditLogsTable.userId, userId as number));
    if (startDate) conditions.push(gte(auditLogsTable.createdAt, new Date(startDate as string)));
    if (endDate) conditions.push(lte(auditLogsTable.createdAt, new Date(endDate as string)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [totalRow]] = await Promise.all([
      db
        .select()
        .from(auditLogsTable)
        .where(where)
        .orderBy(sql`${auditLogsTable.createdAt} DESC`)
        .limit(limit as number)
        .offset(offset),
      db.select({ total: count() }).from(auditLogsTable).where(where),
    ]);

    res.json({
      data: rows.map(formatLog),
      total: Number(totalRow?.total ?? 0),
      page: page as number,
      limit: limit as number,
    });
  }
);

router.get(
  "/audit/summary",
  requireAuth,
  requireRole("admin"),
  async (_req, res): Promise<void> => {
    const all = await db
      .select()
      .from(auditLogsTable)
      .orderBy(sql`${auditLogsTable.createdAt} DESC`);

    const summary = {
      totalEvents: all.length,
      logins: all.filter((l) => l.action === "LOGIN").length,
      verifications: all.filter((l) => l.action === "PAYMENT_VERIFICATION").length,
      transfers: all.filter((l) => l.action.startsWith("TRANSFER")).length,
      userChanges: all.filter((l) => l.action.startsWith("USER") || l.action === "PERMISSION_CHANGE").length,
      recentActivity: all.slice(0, 10).map(formatLog),
    };

    res.json(summary);
  }
);

export default router;

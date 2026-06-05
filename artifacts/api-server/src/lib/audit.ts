import { db, auditLogsTable } from "@workspace/db";
import type { Request } from "express";
import type { JwtPayload } from "./auth";

export async function logAudit(
  action: string,
  user: JwtPayload | null,
  details: string | null,
  req: Request
): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      action,
      userId: user?.userId ?? null,
      userName: user?.email ?? "system",
      userRole: user?.role ?? null,
      details,
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "",
    });
  } catch {
    // Audit logging should never crash the main flow
  }
}

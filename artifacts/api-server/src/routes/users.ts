import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  CreateUserBody,
  UpdateUserBody,
  GetUserParams,
  UpdateUserParams,
  DeleteUserParams,
  UpdateUserRoleParams,
  UpdateUserRoleBody,
} from "@workspace/api-zod";
import { requireAuth, requireRole, hashPassword, type JwtPayload } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    lastLogin: u.lastLogin?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/users", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users.map(formatUser));
});

router.get("/users/stats", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const all = await db.select().from(usersTable);
  const stats = {
    total: all.length,
    admins: all.filter((u) => u.role === "admin").length,
    accountOfficers: all.filter((u) => u.role === "account_officer").length,
    salesReps: all.filter((u) => u.role === "sales_rep").length,
    active: all.filter((u) => u.isActive).length,
    inactive: all.filter((u) => !u.isActive).length,
  };
  res.json(stats);
});

router.post("/users", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const jwtUser = (req as typeof req & { user: JwtPayload }).user;
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, parsed.data.email))
    .limit(1);

  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await db
    .insert(usersTable)
    .values({
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role as "admin" | "account_officer" | "sales_rep",
      passwordHash,
    })
    .returning();

  await logAudit("USER_CREATED", jwtUser, `Created user ${user.email}`, req);

  res.status(201).json(formatUser(user));
});

router.get("/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

router.patch("/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const jwtUser = (req as typeof req & { user: JwtPayload }).user;
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await logAudit("USER_UPDATED", jwtUser, `Updated user ${user.email}`, req);

  res.json(formatUser(user));
});

router.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const jwtUser = (req as typeof req & { user: JwtPayload }).user;
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await logAudit("USER_DELETED", jwtUser, `Deleted user ${user.email}`, req);

  res.json({ message: "User deleted" });
});

router.patch(
  "/users/:id/role",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const jwtUser = (req as typeof req & { user: JwtPayload }).user;
    const params = UpdateUserRoleParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateUserRoleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [user] = await db
      .update(usersTable)
      .set({ role: parsed.data.role as "admin" | "account_officer" | "sales_rep", updatedAt: new Date() })
      .where(eq(usersTable.id, params.data.id))
      .returning();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await logAudit(
      "PERMISSION_CHANGE",
      jwtUser,
      `Changed role of ${user.email} to ${parsed.data.role}`,
      req
    );

    res.json(formatUser(user));
  }
);

export default router;

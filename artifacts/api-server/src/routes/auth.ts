import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  LoginBody,
  RefreshTokenBody,
  ChangePasswordBody,
} from "@workspace/api-zod";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  hashPassword,
  comparePassword,
  requireAuth,
  type JwtPayload,
} from "../lib/auth";
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

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, parsed.data.email))
    .limit(1);

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await db
    .update(usersTable)
    .set({ refreshToken, lastLogin: new Date() })
    .where(eq(usersTable.id, user.id));

  await logAudit("LOGIN", payload, `User ${user.email} logged in`, req);

  res.json({ accessToken, refreshToken, user: formatUser({ ...user, lastLogin: new Date() }) });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: JwtPayload }).user;
  await db
    .update(usersTable)
    .set({ refreshToken: null })
    .where(eq(usersTable.id, user.userId));

  await logAudit("LOGOUT", user, `User ${user.email} logged out`, req);

  res.json({ message: "Logged out" });
});

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const parsed = RefreshTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "refreshToken required" });
    return;
  }

  let payload: JwtPayload;
  try {
    payload = verifyToken(parsed.data.refreshToken);
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payload.userId))
    .limit(1);

  if (!user || user.refreshToken !== parsed.data.refreshToken || !user.isActive) {
    res.status(401).json({ error: "Invalid refresh token" });
    return;
  }

  const newPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(newPayload);
  const refreshToken = signRefreshToken(newPayload);

  await db
    .update(usersTable)
    .set({ refreshToken })
    .where(eq(usersTable.id, user.id));

  res.json({ accessToken, refreshToken, user: formatUser(user) });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const jwtUser = (req as typeof req & { user: JwtPayload }).user;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, jwtUser.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const jwtUser = (req as typeof req & { user: JwtPayload }).user;
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, jwtUser.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const valid = await comparePassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await db
    .update(usersTable)
    .set({ passwordHash: newHash })
    .where(eq(usersTable.id, user.id));

  await logAudit("PASSWORD_CHANGE", jwtUser, "Password changed", req);

  res.json({ message: "Password changed successfully" });
});

export default router;

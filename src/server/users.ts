import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { LoginInput, RegisterInput } from "@/lib/validation";

const SAFE = { id: true, email: true, name: true, phone: true, role: true } as const;
// Pre-computed hash used to keep login timing uniform when the email is unknown.
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8DPLKXt1FYlwYpQW4mKMZ1fQ8lH0yC";

export async function registerUser(input: RegisterInput) {
  const exists = await db.user.findUnique({ where: { email: input.email } });
  if (exists) throw new AppError("CONFLICT", "An account with this email already exists");
  const passwordHash = await bcrypt.hash(input.password, 10);
  return db.user.create({
    data: { email: input.email, name: input.name, phone: input.phone || null, passwordHash, role: input.accountType === "PARTNER" ? "PARTNER" : "CUSTOMER" },
    select: SAFE,
  });
}

export async function authenticate(input: LoginInput) {
  const user = await db.user.findUnique({ where: { email: input.email } });
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError("UNAUTHORIZED", "Incorrect email or password");
  if (!user.isActive) throw new AppError("FORBIDDEN", "This account has been deactivated");
  return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role };
}

export async function updateProfile(userId: string, data: { name: string; phone?: string }) {
  return db.user.update({ where: { id: userId }, data: { name: data.name, phone: data.phone || null }, select: SAFE });
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(current, user.passwordHash))) throw new AppError("BAD_REQUEST", "Your current password is incorrect");
  await db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  await db.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
}

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/**
 * Start a password reset. Always succeeds from the caller's point of view (no account enumeration).
 * The reset link is recorded in the email outbox; no email provider is connected in this build.
 */
export async function requestPasswordReset(email: string, origin: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;
  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  const link = `${origin}/reset-password?token=${token}`;
  await db.emailMessage.create({
    data: { to: user.email, kind: "password_reset", subject: "Reset your ViewStay password", body: `Hi ${user.name},\n\nUse this link within 30 minutes to choose a new password:\n${link}\n\nIf you didn't ask for this, you can ignore this email.` },
  });
  if (process.env.NODE_ENV !== "production") console.info(`[viewstay] password reset link for ${user.email}: ${link}`);
}

export async function resetPassword(token: string, password: string) {
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) throw new AppError("BAD_REQUEST", "This reset link is invalid or has expired. Request a new one.");
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(password, 10) } }),
    db.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
}

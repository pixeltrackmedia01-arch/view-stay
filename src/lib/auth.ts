import "server-only";
import { cookies } from "next/headers";
import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { AppError } from "./errors";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./session";

export type SafeUser = Pick<User, "id" | "email" | "name" | "phone" | "role">;

export async function createSessionCookie(user: SafeUser) {
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Current user, re-read from the database so role changes and deactivation apply immediately. */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, phone: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role };
}

export async function requireUser(...roles: Role[]): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Please sign in to continue");
  if (roles.length && !roles.includes(user.role)) {
    throw new AppError("FORBIDDEN", "You do not have access to this resource");
  }
  return user;
}

import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "vs_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionRole = "CUSTOMER" | "PARTNER" | "ADMIN";
export interface SessionPayload {
  sub: string;
  role: SessionRole;
  name: string;
}

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { sub: payload.sub, role: payload.role as SessionRole, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}

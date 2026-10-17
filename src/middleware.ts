import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PROTECTED: { prefix: string; roles?: string[] }[] = [
  { prefix: "/account" },
  { prefix: "/checkout" },
  { prefix: "/bookings" },
  { prefix: "/partner", roles: ["PARTNER", "ADMIN"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

/** Coarse page guard. Every API and page still re-checks the user against the database. */
export async function middleware(req: NextRequest) {
  const rule = PROTECTED.find((r) => req.nextUrl.pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next();
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  if (rule.roles && !rule.roles.includes(session.role)) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/account/:path*", "/checkout/:path*", "/bookings/:path*", "/partner/:path*", "/admin/:path*"] };

import "server-only";
import { db } from "./db";

export async function wishlistIds(userId: string | undefined) {
  if (!userId) return new Set<string>();
  const rows = await db.wishlist.findMany({ where: { userId }, select: { hotelId: true } });
  return new Set(rows.map((r) => r.hotelId));
}

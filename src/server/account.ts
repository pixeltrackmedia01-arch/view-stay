import { db } from "@/lib/db";
import { todayUtc } from "@/lib/dates";
import { completePastStays } from "./bookings";

export type BookingTab = "upcoming" | "past" | "cancelled";

/** The customer's bookings for one tab, grouped by checkout (multi-room bookings share a group code). */
export async function customerBookings(userId: string, tab: BookingTab) {
  await completePastStays();
  const today = todayUtc();
  const where =
    tab === "upcoming" ? { userId, status: "CONFIRMED" as const, checkOut: { gt: today } } :
    tab === "past" ? { userId, status: "COMPLETED" as const } :
    { userId, status: "CANCELLED" as const };
  const rows = await db.booking.findMany({
    where,
    include: {
      hotel: { select: { name: true, slug: true, destination: { select: { name: true } } } },
      room: { select: { id: true, number: true, viewType: true, floor: { select: { name: true } }, roomType: { select: { name: true } }, photos: { where: { isPrimary: true }, take: 1, select: { asset: { select: { path: true } } } } } },
      review: { select: { id: true } },
    },
    orderBy: tab === "upcoming" ? { checkIn: "asc" } : { checkIn: "desc" },
    take: 100,
  });
  const groups = new Map<string, typeof rows>();
  for (const b of rows) {
    const key = b.groupCode ?? b.code;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  return [...groups.entries()].map(([code, bookings]) => ({ code, bookings }));
}

export async function bookingCounts(userId: string) {
  await completePastStays();
  const today = todayUtc();
  const [upcoming, past, cancelled, saved, toReview] = await Promise.all([
    db.booking.count({ where: { userId, status: "CONFIRMED", checkOut: { gt: today } } }),
    db.booking.count({ where: { userId, status: "COMPLETED" } }),
    db.booking.count({ where: { userId, status: "CANCELLED" } }),
    db.wishlist.count({ where: { userId } }),
    db.booking.count({ where: { userId, status: "COMPLETED", review: null } }),
  ]);
  return { upcoming, past, cancelled, saved, toReview };
}

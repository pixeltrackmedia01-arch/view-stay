import type { HotelStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

async function audit(actorId: string, action: string, entity: string, entityId: string, details?: Prisma.InputJsonValue) {
  await db.auditLog.create({ data: { actorId, action, entity, entityId, details } });
}

export async function setHotelStatus(adminId: string, hotelId: string, status: HotelStatus) {
  const hotel = await db.hotel.update({ where: { id: hotelId }, data: { status } });
  await audit(adminId, `hotel.${status.toLowerCase()}`, "Hotel", hotelId);
  return hotel;
}

export async function setHotelFeatured(adminId: string, hotelId: string, featured: boolean) {
  const hotel = await db.hotel.update({ where: { id: hotelId }, data: { featured } });
  await audit(adminId, featured ? "hotel.featured" : "hotel.unfeatured", "Hotel", hotelId);
  return hotel;
}

export async function setUserActive(adminId: string, userId: string, isActive: boolean) {
  if (adminId === userId) throw new AppError("BAD_REQUEST", "You cannot deactivate your own account");
  const user = await db.user.update({ where: { id: userId }, data: { isActive }, select: { id: true, isActive: true } });
  await audit(adminId, isActive ? "user.activated" : "user.deactivated", "User", userId);
  return user;
}

export async function updateDestination(adminId: string, id: string, data: { tagline?: string; description?: string; featured?: boolean; attractions?: string[] }) {
  const dest = await db.destination.update({ where: { id }, data });
  await audit(adminId, "destination.updated", "Destination", id, data as Prisma.InputJsonValue);
  return dest;
}

export async function platformStats() {
  const [users, partners, hotels, pendingHotels, bookings, revenue] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.user.count({ where: { role: "PARTNER" } }),
    db.hotel.count({ where: { status: "APPROVED" } }),
    db.hotel.count({ where: { status: "PENDING" } }),
    db.booking.count(),
    db.booking.aggregate({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } }, _sum: { total: true, commission: true } }),
  ]);
  return { users, partners, hotels, pendingHotels, bookings, gmv: revenue._sum.total ?? 0, commission: revenue._sum.commission ?? 0 };
}

/** Commission earned per partner over a period (bookings created in the window, excluding cancellations). */
export async function commissionReport(from: Date, to: Date) {
  const rows = await db.$queryRaw<{ ownerId: string; name: string; email: string; bookings: number; gmv: number; commission: number }[]>`
    SELECT u.id AS "ownerId", u.name, u.email, count(b.id)::int AS bookings, coalesce(sum(b.total), 0)::int AS gmv, coalesce(sum(b.commission), 0)::int AS commission
    FROM "User" u
    JOIN "Hotel" h ON h."ownerId" = u.id
    LEFT JOIN "Booking" b ON b."hotelId" = h.id AND b.status <> 'CANCELLED' AND b."createdAt" >= ${from} AND b."createdAt" < ${to}
    WHERE u.role = 'PARTNER'
    GROUP BY u.id
    ORDER BY commission DESC`;
  return rows;
}

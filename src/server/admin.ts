import type { HotelStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function setHotelStatus(adminId: string, hotelId: string, status: HotelStatus) {
  const hotel = await db.hotel.update({ where: { id: hotelId }, data: { status } });
  await db.auditLog.create({ data: { actorId: adminId, action: `hotel.${status.toLowerCase()}`, entity: "Hotel", entityId: hotelId } });
  return hotel;
}

export async function setUserActive(adminId: string, userId: string, isActive: boolean) {
  if (adminId === userId) throw new AppError("BAD_REQUEST", "You cannot deactivate your own account");
  const user = await db.user.update({ where: { id: userId }, data: { isActive }, select: { id: true, isActive: true } });
  await db.auditLog.create({
    data: { actorId: adminId, action: isActive ? "user.activated" : "user.deactivated", entity: "User", entityId: userId },
  });
  return user;
}

export async function platformStats() {
  const [users, hotels, pendingHotels, bookings, revenue] = await Promise.all([
    db.user.count(),
    db.hotel.count({ where: { status: "APPROVED" } }),
    db.hotel.count({ where: { status: "PENDING" } }),
    db.booking.count(),
    db.booking.aggregate({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } }, _sum: { total: true } }),
  ]);
  return { users, hotels, pendingHotels, bookings, gmv: revenue._sum.total ?? 0 };
}

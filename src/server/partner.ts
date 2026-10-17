import type { ViewType } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { addDays, nightsBetween, parseDateOnly, toDateOnlyString, todayUtc } from "@/lib/dates";
import { slugify } from "@/lib/utils";
import type { HotelCreateInput } from "@/lib/validation";
import type { z } from "zod";
import type { roomUpdateInput } from "@/lib/validation";
import { lockRoom } from "./holds";

type Actor = { id: string; role: string };

/** Partners only see their own hotels; admins see any. Anything else is reported as not found. */
export async function assertHotelAccess(actor: Actor, hotelId: string) {
  const hotel = await db.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel || (actor.role !== "ADMIN" && hotel.ownerId !== actor.id)) {
    throw new AppError("NOT_FOUND", "Hotel not found");
  }
  return hotel;
}

async function assertRoomAccess(actor: Actor, roomId: string) {
  const room = await db.room.findUnique({ where: { id: roomId }, include: { hotel: true } });
  if (!room || (actor.role !== "ADMIN" && room.hotel.ownerId !== actor.id)) {
    throw new AppError("NOT_FOUND", "Room not found");
  }
  return room;
}

export async function listPartnerHotels(ownerId: string) {
  return db.hotel.findMany({
    where: { ownerId },
    include: { _count: { select: { rooms: true, bookings: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateRoom(actor: Actor, roomId: string, data: z.infer<typeof roomUpdateInput>) {
  await assertRoomAccess(actor, roomId);
  const room = await db.room.update({ where: { id: roomId }, data });
  await db.auditLog.create({ data: { actorId: actor.id, action: "room.updated", entity: "Room", entityId: roomId, details: data } });
  return room;
}

export async function addRoomBlock(actor: Actor, roomId: string, input: { startDate: string; endDate: string; reason: string }) {
  await assertRoomAccess(actor, roomId);
  const startDate = parseDateOnly(input.startDate)!;
  const endDate = parseDateOnly(input.endDate)!;
  return db.$transaction(async (tx) => {
    await lockRoom(tx, roomId);
    const clash = await tx.booking.findFirst({
      where: { roomId, status: { not: "CANCELLED" }, checkIn: { lt: endDate }, checkOut: { gt: startDate } },
      select: { code: true },
    });
    if (clash) throw new AppError("CONFLICT", `Booking ${clash.code} overlaps these dates; cancel or move it first`);
    return tx.roomBlock.create({ data: { roomId, startDate, endDate, reason: input.reason } });
  });
}

export async function removeRoomBlock(actor: Actor, blockId: string) {
  const block = await db.roomBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new AppError("NOT_FOUND", "Block not found");
  await assertRoomAccess(actor, block.roomId);
  await db.roomBlock.delete({ where: { id: blockId } });
}

const HUES = [12, 38, 160, 190, 210, 260, 330];

/** Create a hotel with an auto-generated floor plan. New hotels await admin approval. */
export async function createHotel(ownerId: string, input: HotelCreateInput) {
  let slug = slugify(`${input.name}-${input.city}`);
  if (await db.hotel.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  const width = input.roomsPerFloor * 2 + 2;

  return db.$transaction(async (tx) => {
    const hotel = await tx.hotel.create({
      data: {
        slug,
        ownerId,
        name: input.name,
        description: input.description,
        city: input.city,
        country: input.country,
        address: input.address,
        starRating: input.starRating,
        amenities: input.amenities,
        coverHue: HUES[slug.length % HUES.length],
        status: "PENDING",
      },
    });
    const roomType = await tx.roomType.create({
      data: {
        hotelId: hotel.id,
        name: input.roomTypeName,
        description: `${input.roomTypeName} room`,
        bedType: input.maxGuests > 2 ? "King + Sofa bed" : "Queen",
        maxGuests: input.maxGuests,
        sizeSqm: 24,
        basePrice: input.basePrice,
      },
    });
    for (let level = 1; level <= input.floors; level++) {
      const floor = await tx.floor.create({
        data: {
          hotelId: hotel.id,
          level,
          name: `Floor ${level}`,
          width,
          height: 6,
          elements: {
            create: [
              { kind: "CORRIDOR", label: "Corridor", x: 0, y: 2, w: width, h: 2 },
              { kind: "ELEVATOR", label: "Lift", x: width - 2, y: 0, w: 2, h: 2 },
              { kind: "STAIRS", label: "Stairs", x: width - 2, y: 4, w: 2, h: 2 },
            ],
          },
        },
      });
      const half = Math.ceil(input.roomsPerFloor / 2);
      const rows = [
        { y: 0, count: half, view: input.primaryView as ViewType },
        { y: 4, count: input.roomsPerFloor - half, view: "COURTYARD" as ViewType },
      ];
      let n = 1;
      for (const row of rows) {
        for (let i = 0; i < row.count; i++) {
          const corner = i === 0;
          await tx.room.create({
            data: {
              hotelId: hotel.id,
              floorId: floor.id,
              roomTypeId: roomType.id,
              number: `${level}${String(n++).padStart(2, "0")}`,
              x: i * 2,
              y: row.y,
              w: 2,
              h: 2,
              viewType: row.view,
              viewScore: row.view === "COURTYARD" ? 40 : Math.min(95, 55 + level * 6),
              isCorner: corner,
              windowCount: corner ? 2 : 1,
              nearElevator: i === row.count - 1,
            },
          });
        }
      }
    }
    await tx.auditLog.create({ data: { actorId: ownerId, action: "hotel.created", entity: "Hotel", entityId: hotel.id } });
    return hotel;
  });
}

export async function partnerAnalytics(ownerId: string | null, now: Date = new Date()) {
  const hotelFilter = ownerId ? { hotel: { ownerId } } : {};
  const today = todayUtc(now);
  const start = addDays(today, -29);
  const horizon = addDays(today, 30);

  const [recent, upcoming, roomCount, statusCounts] = await Promise.all([
    db.booking.findMany({
      where: { ...hotelFilter, createdAt: { gte: start }, status: { not: "CANCELLED" } },
      select: { createdAt: true, total: true },
    }),
    db.booking.findMany({
      where: { ...hotelFilter, status: { not: "CANCELLED" }, checkIn: { lt: horizon }, checkOut: { gt: today } },
      select: { checkIn: true, checkOut: true },
    }),
    db.room.count({ where: { ...(ownerId ? { hotel: { ownerId } } : {}), status: "ACTIVE" } }),
    db.booking.groupBy({ by: ["status"], where: hotelFilter, _count: true, _sum: { total: true } }),
  ]);

  const revenueByDay = Array.from({ length: 30 }, (_, i) => {
    const day = toDateOnlyString(addDays(start, i));
    return { day: day.slice(5), revenue: 0, bookings: 0 };
  });
  for (const b of recent) {
    const idx = nightsBetween(start, todayUtc(b.createdAt));
    if (idx >= 0 && idx < 30) {
      revenueByDay[idx].revenue += b.total / 100;
      revenueByDay[idx].bookings += 1;
    }
  }

  let occupiedNights = 0;
  for (const b of upcoming) {
    const s = b.checkIn > today ? b.checkIn : today;
    const e = b.checkOut < horizon ? b.checkOut : horizon;
    occupiedNights += Math.max(0, nightsBetween(s, e));
  }
  const occupancy30 = roomCount ? occupiedNights / (roomCount * 30) : 0;

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, { count: s._count, total: s._sum.total ?? 0 }]));
  const revenue = (byStatus.CONFIRMED?.total ?? 0) + (byStatus.COMPLETED?.total ?? 0);
  return { revenueByDay, occupancy30, roomCount, byStatus, revenue };
}

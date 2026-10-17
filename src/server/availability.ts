import type { Prisma, RoomStatus } from "@prisma/client";
import { db } from "@/lib/db";

export type RoomAvailability =
  | "AVAILABLE"
  | "BOOKED"
  | "HELD"
  | "HELD_BY_YOU"
  | "BLOCKED"
  | "UNAVAILABLE"
  | "TOO_SMALL";

type Tx = Prisma.TransactionClient | typeof db;

/** Overlap filter for half-open [checkIn, checkOut) stays. */
export function overlapping(checkIn: Date, checkOut: Date) {
  return { checkIn: { lt: checkOut }, checkOut: { gt: checkIn } };
}

export async function roomConflicts(
  tx: Tx,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  opts: { ignoreHoldOfUser?: string; now?: Date } = {},
) {
  const now = opts.now ?? new Date();
  const [booking, block, hold] = await Promise.all([
    tx.booking.findFirst({
      where: { roomId, status: { not: "CANCELLED" }, ...overlapping(checkIn, checkOut) },
      select: { id: true },
    }),
    tx.roomBlock.findFirst({
      where: { roomId, startDate: { lt: checkOut }, endDate: { gt: checkIn } },
      select: { id: true },
    }),
    tx.roomHold.findFirst({
      where: {
        roomId,
        expiresAt: { gt: now },
        ...overlapping(checkIn, checkOut),
        ...(opts.ignoreHoldOfUser ? { userId: { not: opts.ignoreHoldOfUser } } : {}),
      },
      select: { id: true },
    }),
  ]);
  return { booked: !!booking, blocked: !!block, held: !!hold };
}

export function statusFor(args: {
  roomStatus: RoomStatus;
  maxGuests: number;
  guests: number;
  booked: boolean;
  blocked: boolean;
  heldByOther: boolean;
  heldByYou: boolean;
}): RoomAvailability {
  if (args.roomStatus !== "ACTIVE") return "UNAVAILABLE";
  if (args.booked) return "BOOKED";
  if (args.blocked) return "BLOCKED";
  if (args.heldByYou) return "HELD_BY_YOU";
  if (args.heldByOther) return "HELD";
  if (args.guests > args.maxGuests) return "TOO_SMALL";
  return "AVAILABLE";
}

/** Status of every room of a hotel for a stay, computed with 3 queries regardless of hotel size. */
export async function hotelRoomAvailability(
  hotelId: string,
  checkIn: Date,
  checkOut: Date,
  guests: number,
  userId?: string,
  now: Date = new Date(),
) {
  const [rooms, bookings, blocks, holds] = await Promise.all([
    db.room.findMany({
      where: { hotelId },
      include: { roomType: true },
      orderBy: { number: "asc" },
    }),
    db.booking.findMany({
      where: { hotelId, status: { not: "CANCELLED" }, ...overlapping(checkIn, checkOut) },
      select: { roomId: true },
    }),
    db.roomBlock.findMany({
      where: { room: { hotelId }, startDate: { lt: checkOut }, endDate: { gt: checkIn } },
      select: { roomId: true },
    }),
    db.roomHold.findMany({
      where: { room: { hotelId }, expiresAt: { gt: now }, ...overlapping(checkIn, checkOut) },
      select: { roomId: true, userId: true, id: true, expiresAt: true },
    }),
  ]);
  const booked = new Set(bookings.map((b) => b.roomId));
  const blocked = new Set(blocks.map((b) => b.roomId));
  return rooms.map((room) => {
    const roomHolds = holds.filter((h) => h.roomId === room.id);
    const yours = userId ? roomHolds.find((h) => h.userId === userId) : undefined;
    const status = statusFor({
      roomStatus: room.status,
      maxGuests: room.roomType.maxGuests,
      guests,
      booked: booked.has(room.id),
      blocked: blocked.has(room.id),
      heldByOther: roomHolds.some((h) => h.userId !== userId),
      heldByYou: !!yours,
    });
    return { room, status, holdId: yours?.id ?? null };
  });
}

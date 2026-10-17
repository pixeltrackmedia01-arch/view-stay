import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { nightsBetween, parseDateOnly } from "@/lib/dates";
import type { HoldInput } from "@/lib/validation";
import { roomConflicts } from "./availability";

export function holdMinutes() {
  const n = Number(process.env.HOLD_MINUTES ?? 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

/** Serialize all writes that touch one room's calendar. */
export async function lockRoom(tx: { $executeRaw: typeof db.$executeRaw }, roomId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${roomId}))`;
}

/**
 * Temporarily reserve a specific room for a user. A user holds at most one room at a time:
 * creating a new hold releases their previous holds.
 */
export async function createHold(userId: string, input: HoldInput, now: Date = new Date()) {
  const checkIn = parseDateOnly(input.checkIn)!;
  const checkOut = parseDateOnly(input.checkOut)!;
  if (nightsBetween(checkIn, checkOut) < 1) throw new AppError("BAD_REQUEST", "Invalid dates");

  return db.$transaction(async (tx) => {
    await lockRoom(tx, input.roomId);
    const room = await tx.room.findUnique({
      where: { id: input.roomId },
      include: { roomType: true, hotel: { select: { status: true } } },
    });
    if (!room || room.hotel.status !== "APPROVED") throw new AppError("NOT_FOUND", "Room not found");
    if (room.status !== "ACTIVE") throw new AppError("CONFLICT", "This room is not currently bookable");
    if (input.guests > room.roomType.maxGuests) {
      throw new AppError("BAD_REQUEST", `Room ${room.number} sleeps at most ${room.roomType.maxGuests} guests`);
    }

    const c = await roomConflicts(tx, room.id, checkIn, checkOut, { ignoreHoldOfUser: userId, now });
    if (c.booked || c.blocked) throw new AppError("CONFLICT", `Room ${room.number} is not available for these dates`);
    if (c.held) throw new AppError("CONFLICT", `Room ${room.number} is being booked by another guest. Try again shortly.`);

    await tx.roomHold.deleteMany({ where: { userId } });
    return tx.roomHold.create({
      data: {
        roomId: room.id,
        userId,
        checkIn,
        checkOut,
        guests: input.guests,
        expiresAt: new Date(now.getTime() + holdMinutes() * 60_000),
      },
    });
  });
}

export async function releaseHold(userId: string, holdId: string) {
  const { count } = await db.roomHold.deleteMany({ where: { id: holdId, userId } });
  if (!count) throw new AppError("NOT_FOUND", "Hold not found");
}

export async function getHoldForUser(userId: string, holdId: string) {
  const hold = await db.roomHold.findFirst({
    where: { id: holdId, userId },
    include: { room: { include: { roomType: true, floor: true, hotel: true } } },
  });
  if (!hold) throw new AppError("NOT_FOUND", "Your room hold was not found. Please pick a room again.");
  return hold;
}

export async function purgeExpiredHolds(now: Date = new Date()) {
  const { count } = await db.roomHold.deleteMany({ where: { expiresAt: { lte: now } } });
  return count;
}

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { holdMinutes, MAX_ROOMS_PER_BOOKING } from "@/lib/config";
import { nightsBetween, parseDateOnly } from "@/lib/dates";
import { quoteStay, roomNightlyRate } from "@/lib/pricing";
import type { HoldInput } from "@/lib/validation";
import { roomConflicts } from "./availability";

export { holdMinutes };

/** Serialize all writes that touch one room's calendar. */
export async function lockRoom(tx: { $executeRaw: typeof db.$executeRaw }, roomId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${roomId}))`;
}

/** Split a party across rooms as evenly as capacity allows. Returns null if it cannot fit. */
export function distributeGuests(guests: number, capacities: number[]): number[] | null {
  if (guests < capacities.length) return null;
  if (capacities.reduce((a, b) => a + b, 0) < guests) return null;
  const out = capacities.map(() => 1);
  let left = guests - capacities.length;
  while (left > 0) {
    let best = -1;
    for (let i = 0; i < out.length; i++) if (out[i] < capacities[i] && (best < 0 || out[i] < out[best])) best = i;
    out[best]++;
    left--;
  }
  return out;
}

/**
 * Temporarily reserve one or more specific physical rooms for a user as a single group.
 * Either every requested room is held, or none is. A user has at most one active hold group:
 * creating a new one releases their previous holds.
 */
export async function createHoldGroup(userId: string, input: HoldInput, now: Date = new Date()) {
  const checkIn = parseDateOnly(input.checkIn)!;
  const checkOut = parseDateOnly(input.checkOut)!;
  if (nightsBetween(checkIn, checkOut) < 1) throw new AppError("BAD_REQUEST", "Invalid dates");
  const roomIds = [...new Set(input.roomIds)];
  if (!roomIds.length || roomIds.length > MAX_ROOMS_PER_BOOKING) throw new AppError("BAD_REQUEST", `Select between 1 and ${MAX_ROOMS_PER_BOOKING} rooms`);

  return db.$transaction(async (tx) => {
    // Lock in a stable order so two overlapping multi-room requests cannot deadlock.
    for (const id of [...roomIds].sort()) await lockRoom(tx, id);
    const rooms = await tx.room.findMany({
      where: { id: { in: roomIds } },
      include: { roomType: true, hotel: { select: { id: true, status: true } } },
    });
    if (rooms.length !== roomIds.length) throw new AppError("NOT_FOUND", "One of the selected rooms no longer exists");
    const hotelIds = new Set(rooms.map((r) => r.hotelId));
    if (hotelIds.size > 1) throw new AppError("BAD_REQUEST", "All rooms in one booking must be at the same property");
    if (rooms[0].hotel.status !== "APPROVED") throw new AppError("NOT_FOUND", "This property is not accepting bookings");

    const ordered = roomIds.map((id) => rooms.find((r) => r.id === id)!);
    const split = distributeGuests(input.guests, ordered.map((r) => r.roomType.maxGuests));
    if (!split) {
      const cap = ordered.reduce((s, r) => s + r.roomType.maxGuests, 0);
      throw new AppError("BAD_REQUEST", input.guests < ordered.length ? "Each room needs at least one guest" : `These rooms sleep ${cap} guests in total; your party has ${input.guests}`);
    }
    for (const room of ordered) {
      if (room.status !== "ACTIVE") throw new AppError("CONFLICT", `Room ${room.number} is not currently bookable`);
      const c = await roomConflicts(tx, room.id, checkIn, checkOut, { ignoreHoldOfUser: userId, now });
      if (c.booked || c.blocked) throw new AppError("CONFLICT", `Room ${room.number} is not available for these dates`);
      if (c.held) throw new AppError("CONFLICT", `Room ${room.number} is being booked by another guest. Try again in a few minutes.`);
    }

    await tx.roomHold.deleteMany({ where: { userId } });
    const groupId = randomUUID();
    const expiresAt = new Date(now.getTime() + holdMinutes() * 60_000);
    await tx.roomHold.createMany({
      data: ordered.map((room, i) => ({
        groupId,
        roomId: room.id,
        userId,
        checkIn,
        checkOut,
        guests: split[i],
        quotedTotal: quoteStay(roomNightlyRate(room.roomType.basePrice, room.priceAdjustment), checkIn, checkOut).total,
        expiresAt,
      })),
    });
    return { groupId, expiresAt, roomIds: ordered.map((r) => r.id) };
  });
}

export async function releaseHoldGroup(userId: string, groupId: string) {
  const { count } = await db.roomHold.deleteMany({ where: { groupId, userId } });
  if (!count) throw new AppError("NOT_FOUND", "Hold not found");
}

export async function getHoldGroupForUser(userId: string, groupId: string) {
  const holds = await db.roomHold.findMany({
    where: { groupId, userId },
    include: {
      room: {
        include: {
          roomType: true,
          floor: true,
          hotel: { include: { destination: { select: { name: true, slug: true } } } },
          photos: { where: { isPrimary: true }, include: { asset: { select: { path: true } } }, take: 1 },
        },
      },
    },
    orderBy: { room: { number: "asc" } },
  });
  if (!holds.length) throw new AppError("NOT_FOUND", "Your room hold was not found. Please pick your room again.");
  return holds;
}

export async function purgeExpiredHolds(now: Date = new Date()) {
  const { count } = await db.roomHold.deleteMany({ where: { expiresAt: { lte: now } } });
  return count;
}

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { refundOnCancel } from "@/lib/cancellation";
import { COMMISSION_RATE } from "@/lib/config";
import { todayUtc } from "@/lib/dates";
import { quoteStay, roomNightlyRate } from "@/lib/pricing";
import type { CheckoutInput } from "@/lib/validation";
import { roomConflicts } from "./availability";
import { lockRoom } from "./holds";
import { charge } from "./payments";

export function bookingCode() {
  // Unambiguous alphabet (no 0/O/1/I)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let code = "VS-";
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return code;
}

function isOverlapViolation(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) return e.message.includes("Booking_no_overlap") || e.code === "P2004";
  if (e instanceof Prisma.PrismaClientUnknownRequestError) return e.message.includes("Booking_no_overlap");
  return false;
}

export interface ConfirmedGroup {
  groupCode: string;
  codes: string[];
  total: number;
  replayed: boolean;
}

/**
 * Turn a live hold group into confirmed bookings, one per physical room. Re-validates every hold and the
 * calendar under per-room locks, rejects silent price changes, charges once for the whole group and writes
 * bookings + payments atomically. Re-submitting the same hold group returns the original bookings.
 */
export async function confirmBookingGroup(userId: string, input: CheckoutInput, now: Date = new Date()): Promise<ConfirmedGroup> {
  const replay = async () => {
    const existing = await db.booking.findMany({ where: { holdGroupId: input.holdGroupId, userId }, orderBy: { code: "asc" } });
    if (!existing.length) return null;
    return { groupCode: existing[0].groupCode ?? existing[0].code, codes: existing.map((b) => b.code), total: existing.reduce((s, b) => s + b.total, 0), replayed: true };
  };
  const previous = await replay();
  if (previous) return previous;

  try {
    return await db.$transaction(async (tx) => {
      const refs = await tx.roomHold.findMany({ where: { groupId: input.holdGroupId, userId }, select: { roomId: true } });
      if (!refs.length) {
        // A concurrent submission of the same checkout may have just consumed the hold.
        const done = await tx.booking.findMany({ where: { holdGroupId: input.holdGroupId, userId }, orderBy: { code: "asc" } });
        if (done.length) return { groupCode: done[0].groupCode ?? done[0].code, codes: done.map((b) => b.code), total: done.reduce((s, b) => s + b.total, 0), replayed: true };
        throw new AppError("HOLD_EXPIRED", "Your room hold has ended. Please select your room again.");
      }
      for (const id of refs.map((r) => r.roomId).sort()) await lockRoom(tx, id);

      const holds = await tx.roomHold.findMany({
        where: { groupId: input.holdGroupId, userId },
        include: { room: { include: { roomType: true, hotel: true } } },
        orderBy: { room: { number: "asc" } },
      });
      if (!holds.length) {
        // Lost the race to a duplicate submission that completed while we waited for the room locks.
        const done = await tx.booking.findMany({ where: { holdGroupId: input.holdGroupId, userId }, orderBy: { code: "asc" } });
        if (done.length) return { groupCode: done[0].groupCode ?? done[0].code, codes: done.map((b) => b.code), total: done.reduce((s, b) => s + b.total, 0), replayed: true };
      }
      if (!holds.length || holds.some((h) => h.expiresAt <= now)) {
        await tx.roomHold.deleteMany({ where: { groupId: input.holdGroupId } });
        throw new AppError("HOLD_EXPIRED", "Your room hold has expired. Your rooms may still be free; please select them again.");
      }
      for (const { room, checkIn, checkOut } of holds) {
        if (room.status !== "ACTIVE" || room.hotel.status !== "APPROVED") throw new AppError("CONFLICT", `Room ${room.number} is no longer bookable`);
        const c = await roomConflicts(tx, room.id, checkIn, checkOut, { ignoreHoldOfUser: userId, now });
        if (c.booked || c.blocked || c.held) throw new AppError("CONFLICT", `Room ${room.number} was just taken for these dates. We have not booked a different room.`);
      }

      const quotes = holds.map((h) => quoteStay(roomNightlyRate(h.room.roomType.basePrice, h.room.priceAdjustment), h.checkIn, h.checkOut, input.ratePlan));
      const total = quotes.reduce((s, q) => s + q.total, 0);
      if (total !== input.expectedTotal) {
        throw new AppError("PRICE_CHANGED", "The price for your selected rooms has changed. Please review the new total before paying.", { newTotal: total, previousTotal: input.expectedTotal });
      }

      const result = charge({ amount: total, cardNumber: input.card.cardNumber, expiry: input.card.expiry, cvc: input.card.cvc }, now);
      if (!result.ok) {
        // Record the failed attempt outside this (rolled back) transaction; the holds stay in place.
        await db.payment.create({ data: { reference: result.reference, amount: total, cardLast4: result.last4, status: "FAILED", message: result.message } });
        throw new AppError("PAYMENT_FAILED", `${result.message}. Your rooms are still held; try another card.`);
      }

      const groupCode = bookingCode();
      const codes: string[] = [];
      for (const [i, hold] of holds.entries()) {
        const q = quotes[i];
        const code = holds.length === 1 ? groupCode : `${groupCode}-${i + 1}`;
        codes.push(code);
        const booking = await tx.booking.create({
          data: {
            code,
            groupCode,
            holdGroupId: input.holdGroupId,
            userId,
            hotelId: hold.room.hotelId,
            roomId: hold.room.id,
            checkIn: hold.checkIn,
            checkOut: hold.checkOut,
            nights: q.nights.length,
            guests: hold.guests,
            guestName: input.guest.guestName,
            guestEmail: input.guest.guestEmail,
            guestPhone: input.guest.guestPhone,
            specialRequest: input.guest.specialRequest || null,
            ratePlan: input.ratePlan,
            nightlyRate: q.nightlyBase,
            subtotal: q.subtotal,
            discount: q.discount,
            taxes: q.taxes,
            total: q.total,
            commission: Math.round(q.total * COMMISSION_RATE),
            payments: { create: { reference: holds.length === 1 ? result.reference : `${result.reference}-${i + 1}`, amount: q.total, cardLast4: result.last4, status: "SUCCEEDED" } },
          },
        });
        await tx.auditLog.create({ data: { actorId: userId, action: "booking.confirmed", entity: "Booking", entityId: booking.id, details: { code, total: q.total, ratePlan: input.ratePlan } } });
      }
      await tx.roomHold.deleteMany({ where: { groupId: input.holdGroupId } });
      return { groupCode, codes, total, replayed: false };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // A concurrent duplicate submission won the race; return its result.
      const won = await replay();
      if (won) return won;
    }
    if (isOverlapViolation(e)) throw new AppError("CONFLICT", "One of your rooms was just booked by someone else for these dates. We have not booked a different room.");
    throw e;
  }
}

/** Cancel a booking. Refunds follow the property's policy and the booking's rate plan. */
export async function cancelBooking(actor: { id: string; role: string }, code: string, now: Date = new Date()) {
  const booking = await db.booking.findUnique({ where: { code }, include: { hotel: true, payments: true } });
  if (!booking) throw new AppError("NOT_FOUND", "Booking not found");
  const isOwner = booking.userId === actor.id;
  const isPartner = actor.role === "PARTNER" && booking.hotel.ownerId === actor.id;
  const isAdmin = actor.role === "ADMIN";
  if (!isOwner && !isPartner && !isAdmin) throw new AppError("NOT_FOUND", "Booking not found");
  if (booking.status !== "CONFIRMED") throw new AppError("CONFLICT", "Only confirmed bookings can be cancelled");
  if (booking.checkIn <= todayUtc(now) && !isAdmin) throw new AppError("CONFLICT", "Bookings can only be cancelled before the check-in date");
  // Cancellations initiated by the property or ViewStay are always refunded.
  const refunded = isPartner || isAdmin || refundOnCancel(booking.hotel.cancellationPolicy, booking.ratePlan, booking.checkIn, now);
  const paid = booking.payments.find((p) => p.status === "SUCCEEDED");
  return db.$transaction(async (tx) => {
    const updated = await tx.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED", cancelledAt: now, commission: refunded ? 0 : booking.commission } });
    if (paid) await tx.payment.update({ where: { id: paid.id }, data: refunded ? { status: "REFUNDED", message: "Refunded on cancellation" } : { message: "Cancelled outside the free-cancellation window; not refunded" } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "booking.cancelled", entity: "Booking", entityId: booking.id, details: { code, refunded } } });
    return { ...updated, refunded };
  });
}

/** Mark stays whose check-out has passed as completed. Idempotent; called lazily from dashboards. */
export async function completePastStays(now: Date = new Date()) {
  const { count } = await db.booking.updateMany({ where: { status: "CONFIRMED", checkOut: { lte: todayUtc(now) } }, data: { status: "COMPLETED" } });
  return count;
}

export async function getBookingForViewer(viewer: { id: string; role: string }, code: string) {
  const booking = await db.booking.findUnique({
    where: { code },
    include: {
      hotel: { include: { destination: { select: { name: true, slug: true } }, photos: { where: { isCover: true }, include: { asset: true }, take: 1 } } },
      room: { include: { roomType: true, floor: true, photos: { orderBy: { sortOrder: "asc" }, include: { asset: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      review: true,
    },
  });
  if (!booking) throw new AppError("NOT_FOUND", "Booking not found");
  const allowed = booking.userId === viewer.id || viewer.role === "ADMIN" || (viewer.role === "PARTNER" && booking.hotel.ownerId === viewer.id);
  if (!allowed) throw new AppError("NOT_FOUND", "Booking not found");
  const siblings = booking.groupCode
    ? await db.booking.findMany({ where: { groupCode: booking.groupCode, id: { not: booking.id } }, select: { code: true, status: true, room: { select: { number: true } } } })
    : [];
  return { ...booking, siblings };
}

export async function addReview(userId: string, code: string, rating: number, comment: string) {
  const booking = await db.booking.findUnique({ where: { code }, include: { review: true } });
  if (!booking || booking.userId !== userId) throw new AppError("NOT_FOUND", "Booking not found");
  if (booking.status !== "COMPLETED") throw new AppError("CONFLICT", "You can review a stay after check-out");
  if (booking.review) throw new AppError("CONFLICT", "You already reviewed this stay");
  return db.$transaction(async (tx) => {
    const review = await tx.review.create({ data: { bookingId: booking.id, hotelId: booking.hotelId, userId, rating, comment } });
    const agg = await tx.review.aggregate({ where: { hotelId: booking.hotelId }, _avg: { rating: true }, _count: true });
    await tx.hotel.update({ where: { id: booking.hotelId }, data: { ratingAvg: agg._avg.rating, reviewCount: agg._count } });
    return review;
  });
}

/** A booking code or a group code (multi-room checkout) → every booking in it the viewer may see. */
export async function getBookingGroupForViewer(viewer: { id: string; role: string }, code: string) {
  const bookings = await db.booking.findMany({
    where: { OR: [{ code }, { groupCode: code }] },
    include: {
      hotel: { include: { destination: { select: { name: true, slug: true } }, photos: { where: { isCover: true }, include: { asset: true }, take: 1 } } },
      room: { include: { roomType: true, floor: true, photos: { where: { isPrimary: true }, include: { asset: true }, take: 1 } } },
      payments: { orderBy: { createdAt: "desc" } },
      review: true,
    },
    orderBy: { code: "asc" },
  });
  const visible = bookings.filter((b) => b.userId === viewer.id || viewer.role === "ADMIN" || (viewer.role === "PARTNER" && b.hotel.ownerId === viewer.id));
  if (!visible.length) throw new AppError("NOT_FOUND", "Booking not found");
  return visible;
}

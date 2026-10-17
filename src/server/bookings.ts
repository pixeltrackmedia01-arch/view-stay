import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
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
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return e.message.includes("Booking_no_overlap") || e.code === "P2004";
  }
  if (e instanceof Prisma.PrismaClientUnknownRequestError) return e.message.includes("Booking_no_overlap");
  return false;
}

/**
 * Turn a live hold into a confirmed booking: re-validates the hold and calendar under a
 * per-room lock, charges the dummy gateway, then writes booking + payment atomically.
 */
export async function confirmBooking(userId: string, input: CheckoutInput, now: Date = new Date()) {
  try {
    return await db.$transaction(async (tx) => {
      const holdRef = await tx.roomHold.findFirst({ where: { id: input.holdId, userId }, select: { roomId: true } });
      if (!holdRef) throw new AppError("HOLD_EXPIRED", "Your room hold has ended. Please select the room again.");
      await lockRoom(tx, holdRef.roomId);

      const hold = await tx.roomHold.findFirst({
        where: { id: input.holdId, userId },
        include: { room: { include: { roomType: true, hotel: true } } },
      });
      if (!hold || hold.expiresAt <= now) {
        if (hold) await tx.roomHold.delete({ where: { id: hold.id } });
        throw new AppError("HOLD_EXPIRED", "Your room hold has expired. Please select the room again.");
      }
      const { room } = hold;
      if (room.status !== "ACTIVE" || room.hotel.status !== "APPROVED") {
        throw new AppError("CONFLICT", "This room is no longer bookable");
      }
      const c = await roomConflicts(tx, room.id, hold.checkIn, hold.checkOut, { ignoreHoldOfUser: userId, now });
      if (c.booked || c.blocked || c.held) {
        throw new AppError("CONFLICT", `Room ${room.number} was just taken for these dates`);
      }

      const quote = quoteStay(roomNightlyRate(room.roomType.basePrice, room.priceAdjustment), hold.checkIn, hold.checkOut);
      const result = charge({
        amount: quote.total,
        cardNumber: input.card.cardNumber,
        expiry: input.card.expiry,
        cvc: input.card.cvc,
      }, now);

      if (!result.ok) {
        // Persist the failed attempt outside this (to-be-rolled-back) transaction.
        await db.payment.create({
          data: { reference: result.reference, amount: quote.total, cardLast4: result.last4, status: "FAILED", message: result.message },
        });
        throw new AppError("PAYMENT_FAILED", `${result.message}. Your room is still held — try another card.`);
      }

      const booking = await tx.booking.create({
        data: {
          code: bookingCode(),
          userId,
          hotelId: room.hotelId,
          roomId: room.id,
          checkIn: hold.checkIn,
          checkOut: hold.checkOut,
          nights: quote.nights.length,
          guests: hold.guests,
          guestName: input.guest.guestName,
          guestEmail: input.guest.guestEmail,
          guestPhone: input.guest.guestPhone,
          specialRequest: input.guest.specialRequest || null,
          nightlyRate: quote.nightlyBase,
          subtotal: quote.subtotal,
          taxes: quote.taxes,
          total: quote.total,
          payments: {
            create: { reference: result.reference, amount: quote.total, cardLast4: result.last4, status: "SUCCEEDED" },
          },
        },
      });
      await tx.roomHold.delete({ where: { id: hold.id } });
      await tx.auditLog.create({
        data: { actorId: userId, action: "booking.confirmed", entity: "Booking", entityId: booking.id, details: { code: booking.code, total: booking.total } },
      });
      return booking;
    });
  } catch (e) {
    if (isOverlapViolation(e)) throw new AppError("CONFLICT", "This room was just booked by someone else for these dates");
    throw e;
  }
}

/** Free cancellation until check-in day; refunds are recorded against the dummy gateway. */
export async function cancelBooking(actor: { id: string; role: string }, code: string, now: Date = new Date()) {
  const booking = await db.booking.findUnique({ where: { code }, include: { hotel: true, payments: true } });
  if (!booking) throw new AppError("NOT_FOUND", "Booking not found");
  const isOwner = booking.userId === actor.id;
  const isPartner = actor.role === "PARTNER" && booking.hotel.ownerId === actor.id;
  const isAdmin = actor.role === "ADMIN";
  if (!isOwner && !isPartner && !isAdmin) throw new AppError("NOT_FOUND", "Booking not found");
  if (booking.status !== "CONFIRMED") throw new AppError("CONFLICT", "Only confirmed bookings can be cancelled");
  if (booking.checkIn <= todayUtc(now) && !isAdmin) {
    throw new AppError("CONFLICT", "Bookings can only be cancelled before the check-in date");
  }
  const paid = booking.payments.find((p) => p.status === "SUCCEEDED");
  return db.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancelledAt: now },
    });
    if (paid) await tx.payment.update({ where: { id: paid.id }, data: { status: "REFUNDED", message: "Refunded on cancellation" } });
    await tx.auditLog.create({
      data: { actorId: actor.id, action: "booking.cancelled", entity: "Booking", entityId: booking.id, details: { code } },
    });
    return updated;
  });
}

/** Mark stays whose check-out has passed as completed. Idempotent; called lazily from dashboards. */
export async function completePastStays(now: Date = new Date()) {
  const { count } = await db.booking.updateMany({
    where: { status: "CONFIRMED", checkOut: { lte: todayUtc(now) } },
    data: { status: "COMPLETED" },
  });
  return count;
}

export async function getBookingForViewer(viewer: { id: string; role: string }, code: string) {
  const booking = await db.booking.findUnique({
    where: { code },
    include: {
      hotel: true,
      room: { include: { roomType: true, floor: true } },
      payments: { orderBy: { createdAt: "desc" } },
      review: true,
    },
  });
  if (!booking) throw new AppError("NOT_FOUND", "Booking not found");
  const allowed =
    booking.userId === viewer.id ||
    viewer.role === "ADMIN" ||
    (viewer.role === "PARTNER" && booking.hotel.ownerId === viewer.id);
  if (!allowed) throw new AppError("NOT_FOUND", "Booking not found");
  return booking;
}

export async function addReview(userId: string, code: string, rating: number, comment: string) {
  const booking = await db.booking.findUnique({ where: { code }, include: { review: true } });
  if (!booking || booking.userId !== userId) throw new AppError("NOT_FOUND", "Booking not found");
  if (booking.status !== "COMPLETED") throw new AppError("CONFLICT", "You can review a stay after check-out");
  if (booking.review) throw new AppError("CONFLICT", "You already reviewed this stay");
  return db.review.create({ data: { bookingId: booking.id, hotelId: booking.hotelId, userId, rating, comment } });
}

import { expect } from "vitest";
import { db } from "@/lib/db";
import { addDays, toDateOnlyString, todayUtc } from "@/lib/dates";
import { AppError } from "@/lib/errors";

export const iso = (offset: number) => toDateOnlyString(addDays(todayUtc(), offset));
export const card = { cardName: "Test User", cardNumber: "4242424242424242", expiry: "12/30", cvc: "123" };
export const declined = { ...card, cardNumber: "4000000000000002" };
export const guest = { guestName: "Test User", guestEmail: "test@example.com", guestPhone: "+91 99999 00000" };

let offset = 400 + Math.floor(Math.random() * 200);
/** A far-future window untouched by seed data; each call returns a fresh, non-overlapping one. */
export function nextWindow(nights = 2, guests = 2) {
  offset += nights + 3;
  return { checkIn: iso(offset), checkOut: iso(offset + nights), guests };
}

export async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
}

export async function user(email: string) {
  return db.user.findUniqueOrThrow({ where: { email }, select: { id: true, role: true } });
}

/** Active rooms at one approved demo property, at least `n` of them sleeping two. */
export async function rooms(n = 3) {
  const hotel = await db.hotel.findFirstOrThrow({ where: { status: "APPROVED", rooms: { some: {} } }, orderBy: { slug: "asc" }, select: { id: true, ownerId: true, cancellationPolicy: true } });
  const list = await db.room.findMany({ where: { hotelId: hotel.id, status: "ACTIVE", roomType: { maxGuests: { gte: 2 } } }, orderBy: { number: "asc" }, take: n, include: { roomType: true } });
  return { hotel, rooms: list };
}

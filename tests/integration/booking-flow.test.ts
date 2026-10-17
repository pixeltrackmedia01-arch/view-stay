import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addDays, toDateOnlyString, todayUtc } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { hotelRoomAvailability } from "@/server/availability";
import { cancelBooking, confirmBooking } from "@/server/bookings";
import { createHold } from "@/server/holds";
import { addRoomBlock, createHotel, updateRoom } from "@/server/partner";
import { searchHotels } from "@/server/search";

const iso = (offset: number) => toDateOnlyString(addDays(todayUtc(), offset));
const card = { cardName: "Test User", cardNumber: "4242424242424242", expiry: "12/30", cvc: "123" };
const guest = { guestName: "Test User", guestEmail: "test@example.com", guestPhone: "+91 99999 00000" };

let roomId: string;
let roomNumber: string;
let hotelId: string;
let alice: string;
let bob: string;
// Far-future window untouched by seed data
let offset = 200;
function nextWindow(nights = 2) {
  offset += 5;
  return { checkIn: iso(offset), checkOut: iso(offset + nights), guests: 2 };
}

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
}

beforeEach(async () => {
  if (roomId) return;
  const room = await db.room.findFirstOrThrow({
    where: { status: "ACTIVE", hotel: { slug: "azure-bay-resort-goa" }, roomType: { maxGuests: { gte: 2 } } },
    orderBy: { number: "asc" },
  });
  roomId = room.id;
  roomNumber = room.number;
  hotelId = room.hotelId;
  alice = (await db.user.findUniqueOrThrow({ where: { email: "customer@viewstay.dev" } })).id;
  bob = (await db.user.findUniqueOrThrow({ where: { email: "guest@viewstay.dev" } })).id;
});

afterAll(async () => {
  await db.$disconnect();
});

describe("holds", () => {
  it("lets one user hold a room and blocks others while the hold is live", async () => {
    const stay = nextWindow();
    const hold = await createHold(alice, { roomId, ...stay });
    expect(hold.expiresAt.getTime()).toBeGreaterThan(Date.now());
    await expectCode(createHold(bob, { roomId, ...stay }), "CONFLICT");

    const avail = await hotelRoomAvailability(hotelId, new Date(stay.checkIn), new Date(stay.checkOut), 2, bob);
    expect(avail.find((a) => a.room.id === roomId)?.status).toBe("HELD");
    const mine = await hotelRoomAvailability(hotelId, new Date(stay.checkIn), new Date(stay.checkOut), 2, alice);
    expect(mine.find((a) => a.room.id === roomId)?.status).toBe("HELD_BY_YOU");
  });

  it("releases a user's previous hold when they pick another room", async () => {
    const stay = nextWindow();
    const other = await db.room.findFirstOrThrow({ where: { hotelId, status: "ACTIVE", id: { not: roomId } } });
    await createHold(alice, { roomId, ...stay });
    await createHold(alice, { roomId: other.id, ...stay });
    expect(await db.roomHold.count({ where: { userId: alice } })).toBe(1);
    // First room is free again for Bob
    await expect(createHold(bob, { roomId, ...stay })).resolves.toBeTruthy();
  });

  it("ignores expired holds", async () => {
    const stay = nextWindow();
    const past = new Date(Date.now() - 60 * 60 * 1000);
    await createHold(alice, { roomId, ...stay }, past); // expired 50 minutes ago
    await expect(createHold(bob, { roomId, ...stay })).resolves.toBeTruthy();
  });

  it("rejects groups larger than the room's capacity", async () => {
    const stay = { ...nextWindow(), guests: 8 };
    await expectCode(createHold(alice, { roomId, ...stay }), "BAD_REQUEST");
  });
});

describe("booking confirmation", () => {
  it("converts a hold into a paid booking and frees the hold", async () => {
    const stay = nextWindow(3);
    const hold = await createHold(alice, { roomId, ...stay });
    const booking = await confirmBooking(alice, { holdId: hold.id, guest, card });
    expect(booking.code).toMatch(/^VS-[A-Z2-9]{8}$/);
    expect(booking.nights).toBe(3);
    expect(booking.total).toBe(booking.subtotal + booking.taxes);
    expect(await db.roomHold.findUnique({ where: { id: hold.id } })).toBeNull();
    const payment = await db.payment.findFirstOrThrow({ where: { bookingId: booking.id } });
    expect(payment.status).toBe("SUCCEEDED");

    // Room now shows as booked and cannot be held for overlapping dates
    await expectCode(createHold(bob, { roomId, checkIn: stay.checkIn, checkOut: iso(offset + 1), guests: 2 }), "CONFLICT");
    // Back-to-back stay starting on check-out day is fine
    await expect(createHold(bob, { roomId, checkIn: stay.checkOut, checkOut: iso(offset + 5), guests: 2 })).resolves.toBeTruthy();
  });

  it("keeps the hold and records a failed payment when the card is declined", async () => {
    const stay = nextWindow();
    const hold = await createHold(alice, { roomId, ...stay });
    await expectCode(confirmBooking(alice, { holdId: hold.id, guest, card: { ...card, cardNumber: "4000000000000002" } }), "PAYMENT_FAILED");
    expect(await db.roomHold.findUnique({ where: { id: hold.id } })).not.toBeNull();
    expect(await db.payment.count({ where: { status: "FAILED", cardLast4: "0002" } })).toBeGreaterThan(0);
    // Retry with a good card succeeds
    await expect(confirmBooking(alice, { holdId: hold.id, guest, card })).resolves.toBeTruthy();
  });

  it("refuses to confirm an expired hold", async () => {
    const stay = nextWindow();
    const hold = await createHold(alice, { roomId, ...stay });
    await db.roomHold.update({ where: { id: hold.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expectCode(confirmBooking(alice, { holdId: hold.id, guest, card }), "HOLD_EXPIRED");
  });

  it("does not let a user confirm someone else's hold", async () => {
    const stay = nextWindow();
    const hold = await createHold(alice, { roomId, ...stay });
    await expectCode(confirmBooking(bob, { holdId: hold.id, guest, card }), "HOLD_EXPIRED");
  });

  it("allows only one of many concurrent hold attempts on the same room", async () => {
    const stay = nextWindow();
    const users = await db.user.findMany({ where: { role: { in: ["CUSTOMER", "PARTNER"] } } });
    const results = await Promise.allSettled(users.map((u) => createHold(u.id, { roomId, ...stay })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("database exclusion constraint rejects overlapping bookings even if app checks are bypassed", async () => {
    const stay = nextWindow();
    const hold = await createHold(alice, { roomId, ...stay });
    const b = await confirmBooking(alice, { holdId: hold.id, guest, card });
    const data = {
      code: "VS-DUPLICATE", userId: b.userId, hotelId: b.hotelId, roomId: b.roomId, checkIn: b.checkIn, checkOut: b.checkOut,
      nights: b.nights, guests: b.guests, guestName: b.guestName, guestEmail: b.guestEmail, guestPhone: b.guestPhone,
      nightlyRate: b.nightlyRate, subtotal: b.subtotal, taxes: b.taxes, total: b.total,
    };
    await expect(db.booking.create({ data })).rejects.toThrow(/Booking_no_overlap/);
  });
});

describe("cancellation", () => {
  it("cancels, refunds and frees the room for rebooking", async () => {
    const stay = nextWindow();
    const hold = await createHold(alice, { roomId, ...stay });
    const booking = await confirmBooking(alice, { holdId: hold.id, guest, card });
    await expectCode(cancelBooking({ id: bob, role: "CUSTOMER" }, booking.code), "NOT_FOUND");
    const cancelled = await cancelBooking({ id: alice, role: "CUSTOMER" }, booking.code);
    expect(cancelled.status).toBe("CANCELLED");
    expect((await db.payment.findFirstOrThrow({ where: { bookingId: booking.id } })).status).toBe("REFUNDED");
    // Same exact room can now be booked again
    const again = await createHold(bob, { roomId, ...stay });
    await expect(confirmBooking(bob, { holdId: again.id, guest, card })).resolves.toBeTruthy();
  });
});

describe("partner inventory", () => {
  it("blocks dates and maintenance status remove a room from sale", async () => {
    const partner = await db.user.findUniqueOrThrow({ where: { email: "partner@viewstay.dev" } });
    const stay = nextWindow();
    await addRoomBlock({ id: partner.id, role: "PARTNER" }, roomId, { startDate: stay.checkIn, endDate: stay.checkOut, reason: "Painting" });
    await expectCode(createHold(alice, { roomId, ...stay }), "CONFLICT");

    const stay2 = nextWindow();
    await updateRoom({ id: partner.id, role: "PARTNER" }, roomId, { status: "MAINTENANCE" });
    await expectCode(createHold(alice, { roomId, ...stay2 }), "CONFLICT");
    await updateRoom({ id: partner.id, role: "PARTNER" }, roomId, { status: "ACTIVE" });
  });

  it("prevents partners from editing rooms of other partners' hotels", async () => {
    const other = await db.user.findUniqueOrThrow({ where: { email: "partner2@viewstay.dev" } });
    await expectCode(updateRoom({ id: other.id, role: "PARTNER" }, roomId, { viewScore: 1 }), "NOT_FOUND");
  });

  it("creates a pending hotel with a generated floor plan that is hidden from search until approved", async () => {
    const partner = await db.user.findUniqueOrThrow({ where: { email: "partner@viewstay.dev" } });
    const hotel = await createHotel(partner.id, {
      name: "Test Harbour Inn",
      description: "A test property used by the integration suite.",
      city: "Testville",
      country: "India",
      address: "1 Test Street, Testville",
      starRating: 3,
      amenities: ["Wi-Fi"],
      floors: 2,
      roomsPerFloor: 4,
      roomTypeName: "Standard",
      basePrice: 300000,
      maxGuests: 2,
      primaryView: "SEA",
    });
    expect(await db.room.count({ where: { hotelId: hotel.id } })).toBe(8);
    expect(await db.floor.count({ where: { hotelId: hotel.id } })).toBe(2);
    const stay = nextWindow();
    const search = { city: "Testville", checkIn: new Date(stay.checkIn), checkOut: new Date(stay.checkOut), guests: 2 };
    expect(await searchHotels(search)).toHaveLength(0);
    await db.hotel.update({ where: { id: hotel.id }, data: { status: "APPROVED" } });
    const [found] = await searchHotels(search);
    expect(found.availableRooms).toBe(8);
  });
});

describe("search", () => {
  it("counts selectable rooms and filters by view", async () => {
    const stay = nextWindow();
    const res = await searchHotels({ city: "goa", checkIn: new Date(stay.checkIn), checkOut: new Date(stay.checkOut), guests: 2, view: "SEA" });
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe("Azure Bay Resort");
    expect(res[0].availableRooms).toBeGreaterThan(0);
    void roomNumber;
  });
});

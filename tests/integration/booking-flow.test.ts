import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import { quoteStay, roomNightlyRate } from "@/lib/pricing";
import { hotelRoomAvailability } from "@/server/availability";
import { cancelBooking, confirmBookingGroup } from "@/server/bookings";
import { createHoldGroup, releaseHoldGroup } from "@/server/holds";
import { checkRoomForStay } from "@/server/rooms";
import { card, declined, expectCode, guest, nextWindow, rooms, user } from "./helpers";

const quoteFor = async (roomIds: string[], stay: { checkIn: string; checkOut: string }, plan: "FLEXIBLE" | "NON_REFUNDABLE" = "FLEXIBLE") => {
  const rs = await db.room.findMany({ where: { id: { in: roomIds } }, include: { roomType: true } });
  return rs.reduce((s, r) => s + quoteStay(roomNightlyRate(r.roomType.basePrice, r.priceAdjustment), parseDateOnly(stay.checkIn)!, parseDateOnly(stay.checkOut)!, plan).total, 0);
};

describe("exact-room holds and booking", () => {
  it("holds, prices and books exactly the selected room", async () => {
    const { rooms: [room] } = await rooms(1);
    const alice = await user("customer@viewstay.dev");
    const stay = nextWindow();
    const hold = await createHoldGroup(alice.id, { roomIds: [room.id], ...stay });
    const expectedTotal = await quoteFor([room.id], stay);
    const res = await confirmBookingGroup(alice.id, { holdGroupId: hold.groupId, ratePlan: "FLEXIBLE", expectedTotal, guest, card });
    const booking = await db.booking.findUniqueOrThrow({ where: { code: res.codes[0] } });
    expect(booking.roomId).toBe(room.id);
    expect(booking.total).toBe(expectedTotal);
    expect(booking.commission).toBe(Math.round(expectedTotal * 0.15));
    expect(await db.roomHold.count({ where: { groupId: hold.groupId } })).toBe(0);
  });

  it("blocks other guests from holding a held or booked room, and never substitutes", async () => {
    const { rooms: [room] } = await rooms(1);
    const alice = await user("customer@viewstay.dev");
    const bob = await user("guest@viewstay.dev");
    const stay = nextWindow();
    const hold = await createHoldGroup(alice.id, { roomIds: [room.id], ...stay });
    await expectCode(createHoldGroup(bob.id, { roomIds: [room.id], ...stay }), "CONFLICT");
    await confirmBookingGroup(alice.id, { holdGroupId: hold.groupId, ratePlan: "FLEXIBLE", expectedTotal: await quoteFor([room.id], stay), guest, card });
    await expectCode(createHoldGroup(bob.id, { roomIds: [room.id], ...stay }), "CONFLICT");
    const avail = await hotelRoomAvailability(room.hotelId, parseDateOnly(stay.checkIn)!, parseDateOnly(stay.checkOut)!, 2, bob.id);
    expect(avail.find((a) => a.room.id === room.id)?.status).toBe("BOOKED");
  });

  it("the database rejects overlapping bookings even if application checks are bypassed", async () => {
    const { rooms: [room] } = await rooms(1);
    const alice = await user("customer@viewstay.dev");
    const stay = nextWindow();
    const hold = await createHoldGroup(alice.id, { roomIds: [room.id], ...stay });
    const res = await confirmBookingGroup(alice.id, { holdGroupId: hold.groupId, ratePlan: "FLEXIBLE", expectedTotal: await quoteFor([room.id], stay), guest, card });
    const b = await db.booking.findUniqueOrThrow({ where: { code: res.codes[0] } });
    const { id: _id, code: _code, holdGroupId: _h, createdAt: _c, updatedAt: _u, ...rest } = b;
    await expect(db.booking.create({ data: { ...rest, code: `DUP-${Date.now()}`, groupCode: null } as never })).rejects.toThrow();
  });

  it("is idempotent: replaying checkout returns the same booking and charges once", async () => {
    const { rooms: [room] } = await rooms(1);
    const alice = await user("customer@viewstay.dev");
    const stay = nextWindow();
    const hold = await createHoldGroup(alice.id, { roomIds: [room.id], ...stay });
    const input = { holdGroupId: hold.groupId, ratePlan: "FLEXIBLE" as const, expectedTotal: await quoteFor([room.id], stay), guest, card };
    const [a, b] = await Promise.all([confirmBookingGroup(alice.id, input), confirmBookingGroup(alice.id, input)]);
    expect(a.groupCode).toBe(b.groupCode);
    const again = await confirmBookingGroup(alice.id, input);
    expect(again.replayed).toBe(true);
    const bookings = await db.booking.findMany({ where: { holdGroupId: hold.groupId }, include: { payments: true } });
    expect(bookings).toHaveLength(1);
    expect(bookings[0].payments.filter((p) => p.status === "SUCCEEDED")).toHaveLength(1);
  });

  it("refuses to charge when the price changed since the guest saw it", async () => {
    const { rooms: [room] } = await rooms(1);
    const alice = await user("customer@viewstay.dev");
    const stay = nextWindow();
    const hold = await createHoldGroup(alice.id, { roomIds: [room.id], ...stay });
    const seen = await quoteFor([room.id], stay);
    await expectCode(confirmBookingGroup(alice.id, { holdGroupId: hold.groupId, ratePlan: "FLEXIBLE", expectedTotal: seen - 100, guest, card }), "PRICE_CHANGED");
    expect(await db.booking.count({ where: { holdGroupId: hold.groupId } })).toBe(0);
    // The hold survives so the guest can accept the new price.
    expect(await db.roomHold.count({ where: { groupId: hold.groupId } })).toBe(1);
    await releaseHoldGroup(alice.id, hold.groupId);
  });

  it("keeps the hold after a declined card", async () => {
    const { rooms: [room] } = await rooms(1);
    const alice = await user("customer@viewstay.dev");
    const stay = nextWindow();
    const hold = await createHoldGroup(alice.id, { roomIds: [room.id], ...stay });
    await expectCode(confirmBookingGroup(alice.id, { holdGroupId: hold.groupId, ratePlan: "FLEXIBLE", expectedTotal: await quoteFor([room.id], stay), guest, card: declined }), "PAYMENT_FAILED");
    expect(await db.roomHold.count({ where: { groupId: hold.groupId } })).toBe(1);
    await releaseHoldGroup(alice.id, hold.groupId);
  });

  it("rejects an expired hold", async () => {
    const { rooms: [room] } = await rooms(1);
    const alice = await user("customer@viewstay.dev");
    const stay = nextWindow();
    const past = new Date(Date.now() - 60 * 60_000);
    const hold = await createHoldGroup(alice.id, { roomIds: [room.id], ...stay }, past);
    await expectCode(confirmBookingGroup(alice.id, { holdGroupId: hold.groupId, ratePlan: "FLEXIBLE", expectedTotal: await quoteFor([room.id], stay), guest, card }), "HOLD_EXPIRED");
  });

  it("books several exact rooms together and splits guests across them", async () => {
    const { rooms: list } = await rooms(3);
    const ids = list.slice(0, 2).map((r) => r.id);
    const alice = await user("customer@viewstay.dev");
    const stay = nextWindow(3, 3);
    const hold = await createHoldGroup(alice.id, { roomIds: ids, ...stay });
    const res = await confirmBookingGroup(alice.id, { holdGroupId: hold.groupId, ratePlan: "NON_REFUNDABLE", expectedTotal: await quoteFor(ids, stay, "NON_REFUNDABLE"), guest, card });
    expect(res.codes).toHaveLength(2);
    const bookings = await db.booking.findMany({ where: { groupCode: res.groupCode } });
    expect(bookings.map((b) => b.roomId).sort()).toEqual([...ids].sort());
    expect(bookings.reduce((s, b) => s + b.guests, 0)).toBe(3);
    expect(bookings.every((b) => b.ratePlan === "NON_REFUNDABLE" && b.discount > 0)).toBe(true);
  });

  it("refunds by policy and frees the room on cancellation", async () => {
    const { rooms: [room] } = await rooms(1);
    const alice = await user("customer@viewstay.dev");
    const stay = nextWindow();
    const hold = await createHoldGroup(alice.id, { roomIds: [room.id], ...stay });
    const res = await confirmBookingGroup(alice.id, { holdGroupId: hold.groupId, ratePlan: "NON_REFUNDABLE", expectedTotal: await quoteFor([room.id], stay, "NON_REFUNDABLE"), guest, card });
    const cancelled = await cancelBooking(alice, res.codes[0]);
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.refunded).toBe(false);
    const again = await createHoldGroup(alice.id, { roomIds: [room.id], ...stay });
    expect(again.roomIds).toEqual([room.id]);
    await releaseHoldGroup(alice.id, again.groupId);
  });

  it("only the guest, the property owner or an admin can cancel", async () => {
    const { rooms: [room] } = await rooms(1);
    const alice = await user("customer@viewstay.dev");
    const bob = await user("guest@viewstay.dev");
    const stay = nextWindow();
    const hold = await createHoldGroup(alice.id, { roomIds: [room.id], ...stay });
    const res = await confirmBookingGroup(alice.id, { holdGroupId: hold.groupId, ratePlan: "FLEXIBLE", expectedTotal: await quoteFor([room.id], stay), guest, card });
    await expectCode(cancelBooking(bob, res.codes[0]), "NOT_FOUND");
    const admin = await user("admin@viewstay.dev");
    const c = await cancelBooking(admin, res.codes[0]);
    expect(c.refunded).toBe(true);
  });

  it("rebooking the same room offers labelled alternatives when it is taken", async () => {
    const { rooms: [room] } = await rooms(1);
    const alice = await user("customer@viewstay.dev");
    const bob = await user("guest@viewstay.dev");
    const stay = nextWindow();
    const free = await checkRoomForStay(room.id, parseDateOnly(stay.checkIn)!, parseDateOnly(stay.checkOut)!, 2, bob.id);
    expect(free.available).toBe(true);
    const hold = await createHoldGroup(alice.id, { roomIds: [room.id], ...stay });
    await confirmBookingGroup(alice.id, { holdGroupId: hold.groupId, ratePlan: "FLEXIBLE", expectedTotal: await quoteFor([room.id], stay), guest, card });
    const taken = await checkRoomForStay(room.id, parseDateOnly(stay.checkIn)!, parseDateOnly(stay.checkOut)!, 2, bob.id);
    expect(taken.available).toBe(false);
    if (!taken.available) {
      expect(taken.reason).toMatch(/booked/);
      expect(taken.alternatives.length).toBeGreaterThan(0);
      expect(taken.alternatives.every((a) => a.id !== room.id)).toBe(true);
    }
  });
});

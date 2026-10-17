import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { validateLayout } from "@/lib/layout/validate";
import type { Rect } from "@/lib/layout/geometry";
import { sniffImage, saveUpload } from "@/server/storage";
import { addRoomBlock, saveFloorLayout, updateRoomTypePrice } from "@/server/partner";
import { createHoldGroup } from "@/server/holds";
import { expectCode, nextWindow, user } from "./helpers";

async function partnerFloor() {
  const partner = await user("partner@viewstay.dev");
  const floor = await db.floor.findFirstOrThrow({ where: { hotel: { ownerId: partner.id, status: "APPROVED" } }, include: { rooms: { where: { status: { not: "INACTIVE" } } }, elements: true } });
  return { partner, floor };
}
const asInput = (r: { id: string; number: string; roomTypeId: string; x: number; y: number; w: number; h: number; windowSide: string; secondaryWindowSide: string | null; balconySide: string | null; viewType: string }) =>
  ({ id: r.id, number: r.number, roomTypeId: r.roomTypeId, x: r.x, y: r.y, w: r.w, h: r.h, windowSide: r.windowSide, secondaryWindowSide: r.secondaryWindowSide, balconySide: r.balconySide, viewType: r.viewType }) as never;

describe("partner tools", () => {
  it("validates layouts: overlaps, duplicates and out-of-footprint rooms", () => {
    const floor = { width: 10, height: 8, wings: [{ x: 0, y: 0, w: 10, h: 8 }] as Rect[] };
    const corridor = [{ x: 0, y: 4, w: 10, h: 1 }];
    expect(validateLayout(floor, corridor, [{ number: "101", x: 0, y: 0, w: 3, h: 4 }, { number: "102", x: 3, y: 0, w: 3, h: 4 }])).toEqual([]);
    const issues = validateLayout(floor, corridor, [
      { number: "101", x: 0, y: 0, w: 3, h: 4 },
      { number: "101", x: 2, y: 0, w: 3, h: 4 },
      { number: "103", x: 0, y: 3, w: 3, h: 3 },
      { number: "104", x: 9, y: 5, w: 3, h: 3 },
    ]);
    const text = issues.map((i) => i.message).join("\n");
    expect(text).toMatch(/used twice/);
    expect(text).toMatch(/overlap/);
    expect(text).toMatch(/corridor/);
    expect(text).toMatch(/beyond the floor plate/);
  });

  it("saves a valid layout change and rejects an invalid one", async () => {
    const { partner, floor } = await partnerFloor();
    const rooms = floor.rooms.map(asInput);
    await expect(saveFloorLayout(partner, floor.id, { rooms })).resolves.toMatchObject({ saved: rooms.length });
    const clash = rooms.map((r: { x: number; y: number }, i: number) => (i === 1 ? { ...r, x: (rooms[0] as { x: number }).x, y: (rooms[0] as { y: number }).y } : r));
    await expectCode(saveFloorLayout(partner, floor.id, { rooms: clash }), "BAD_REQUEST");
  });

  it("refuses edits to another partner's property", async () => {
    const { floor } = await partnerFloor();
    const other = await user("partner2@viewstay.dev");
    await expectCode(saveFloorLayout(other, floor.id, { rooms: floor.rooms.map(asInput) }), "NOT_FOUND");
    const type = await db.roomType.findFirstOrThrow({ where: { hotelId: floor.hotelId } });
    await expectCode(updateRoomTypePrice(other, type.id, 500000), "NOT_FOUND");
  });

  it("a room closed by the partner cannot be held", async () => {
    const { partner, floor } = await partnerFloor();
    const room = floor.rooms[0];
    const stay = nextWindow();
    await addRoomBlock(partner, room.id, { startDate: stay.checkIn, endDate: stay.checkOut, reason: "Maintenance" });
    const alice = await user("customer@viewstay.dev");
    await expectCode(createHoldGroup(alice.id, { roomIds: [room.id], ...stay }), "CONFLICT");
  });

  it("accepts only real JPEG/PNG/WebP images of a minimum size", async () => {
    expect(sniffImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(sniffImage(Buffer.from("GIF89a......"))).toBeNull();
    const png = (w: number, h: number) => {
      const b = Buffer.alloc(33);
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
      b.writeUInt32BE(13, 8);
      b.write("IHDR", 12, "ascii");
      b.writeUInt32BE(w, 16);
      b.writeUInt32BE(h, 20);
      return b;
    };
    expect(sniffImage(png(800, 600))).toMatchObject({ mimeType: "image/png", width: 800, height: 600 });
    await expectCode(saveUpload(png(100, 100)), "BAD_REQUEST");
    await expectCode(saveUpload(Buffer.from("not an image at all")), "UNSUPPORTED_MEDIA_TYPE");
    await expectCode(saveUpload(Buffer.alloc(6 * 1024 * 1024)), "PAYLOAD_TOO_LARGE");
  });
});

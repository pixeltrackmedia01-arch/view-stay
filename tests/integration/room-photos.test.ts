import { describe, expect, it, vi } from "vitest";

// Route handlers read the session cookie; outside Next there is no request scope, so act as an anonymous visitor.
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
import { db } from "@/lib/db";
import { GET } from "@/app/api/rooms/[id]/photos/route";
import { getRoomPhotos } from "@/server/rooms";
import { expectCode, user } from "./helpers";

describe("room photography", () => {
  it("every active room has database-backed photos with a single primary image", async () => {
    const missing = await db.room.count({ where: { status: "ACTIVE", photos: { none: {} } } });
    expect(missing).toBe(0);
    const multiPrimary = await db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM (SELECT "roomId" FROM "RoomPhoto" WHERE "isPrimary" GROUP BY "roomId" HAVING count(*) <> 1) x`;
    expect(multiPrimary[0].n).toBe(0);
  });

  it("returns ordered photos and only populated categories", async () => {
    const room = await db.room.findFirstOrThrow({ where: { status: "ACTIVE", hasBalcony: true, hotel: { status: "APPROVED" } } });
    const res = await getRoomPhotos(room.id);
    expect(res.photos.length).toBeGreaterThan(2);
    expect(res.photos[0].isPrimary).toBe(true);
    for (const c of res.categories) expect(c.count).toBe(res.photos.filter((p) => p.category === c.key).length);
    expect(res.categories.some((c) => c.key === "BALCONY")).toBe(true);
    expect(res.photos.every((p) => p.path.startsWith("/media/"))).toBe(true);
    expect(res.photos.every((p) => p.alt.includes(room.number))).toBe(true);
  });

  it("rooms without a balcony get no balcony photos", async () => {
    const room = await db.room.findFirstOrThrow({ where: { status: "ACTIVE", hasBalcony: false, hotel: { status: "APPROVED" } } });
    const res = await getRoomPhotos(room.id);
    expect(res.categories.some((c) => c.key === "BALCONY")).toBe(false);
  });

  it("photos differ between rooms with different outlooks at the same property", async () => {
    const hotel = await db.hotel.findFirstOrThrow({ where: { status: "APPROVED", rooms: { some: { viewType: "SEA" } } }, select: { id: true } });
    const rooms = await db.room.findMany({ where: { hotelId: hotel.id, status: "ACTIVE" }, select: { id: true, viewType: true } });
    const types = [...new Set(rooms.map((r) => r.viewType))];
    if (types.length < 2) return;
    const a = rooms.find((r) => r.viewType === types[0])!;
    const b = rooms.find((r) => r.viewType === types[1])!;
    const [pa, pb] = await Promise.all([getRoomPhotos(a.id), getRoomPhotos(b.id)]);
    const view = (x: typeof pa) => x.photos.find((p) => p.category === "WINDOW_VIEW")?.path;
    expect(view(pa)).toBeDefined();
    expect(view(pa)).not.toBe(view(pb));
  });

  it("hides rooms of unapproved properties except from their owner and admins", async () => {
    const room = await db.room.findFirstOrThrow({ where: { hotel: { status: "PENDING" } }, include: { hotel: { select: { ownerId: true } } } });
    await expectCode(getRoomPhotos(room.id), "NOT_FOUND");
    await expectCode(getRoomPhotos(room.id, await user("customer@viewstay.dev")), "NOT_FOUND");
    const owner = await db.user.findUniqueOrThrow({ where: { id: room.hotel.ownerId }, select: { id: true, role: true } });
    expect((await getRoomPhotos(room.id, owner)).photos.length).toBeGreaterThan(0);
  });

  it("the HTTP endpoint returns JSON and a clean 404", async () => {
    const room = await db.room.findFirstOrThrow({ where: { status: "ACTIVE", hotel: { status: "APPROVED" } } });
    const ok = await GET(new Request(`http://t/api/rooms/${room.id}/photos`), { params: Promise.resolve({ id: room.id }) });
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.room.number).toBe(room.number);
    const missing = await GET(new Request("http://t/api/rooms/nope/photos"), { params: Promise.resolve({ id: "nope" }) });
    expect(missing.status).toBe(404);
    const err = await missing.json();
    expect(err.error.code).toBe("NOT_FOUND");
    expect(JSON.stringify(err)).not.toMatch(/at \w+ \(|prisma/i);
  });
});

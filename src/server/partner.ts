import type { Prisma, ViewType } from "@prisma/client";
import type { z } from "zod";
import { TEMPLATE_INFO, type HotelTemplateKey, type ViewKey } from "@/lib/catalog-types";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { addDays, nightsBetween, parseDateOnly, toDateOnlyString, todayUtc } from "@/lib/dates";
import { contains, overlaps, type Rect } from "@/lib/layout/geometry";
import { roomAreaSqm } from "@/lib/layout/templates";
import type { MediaCategoryKey } from "@/lib/media/library";
import type { Tod } from "@/lib/media/scenes";
import { slugify } from "@/lib/utils";
import type { FloorLayoutInput, HotelCreateInput, hotelProfileInput, roomUpdateInput } from "@/lib/validation";
import { buildHotelRecords, destinationArt, insertHotelRecords, registerAsset, roomPhotoKeys, sceneForView, sid, type AssetRegistry } from "./catalog-builder";
import { lockRoom } from "./holds";
import { deleteUpload } from "./storage";

type Actor = { id: string; role: string };

/** Partners only see their own hotels; admins see any. Anything else is reported as not found. */
export async function assertHotelAccess(actor: Actor, hotelId: string) {
  const hotel = await db.hotel.findUnique({ where: { id: hotelId }, include: { destination: { select: { slug: true, name: true } } } });
  if (!hotel || (actor.role !== "ADMIN" && hotel.ownerId !== actor.id)) throw new AppError("NOT_FOUND", "Hotel not found");
  return hotel;
}

async function assertRoomAccess(actor: Actor, roomId: string) {
  const room = await db.room.findUnique({ where: { id: roomId }, include: { hotel: { include: { destination: { select: { slug: true } } } }, roomType: true } });
  if (!room || (actor.role !== "ADMIN" && room.hotel.ownerId !== actor.id)) throw new AppError("NOT_FOUND", "Room not found");
  return room;
}

async function audit(actorId: string, action: string, entity: string, entityId: string, details?: Prisma.InputJsonValue) {
  await db.auditLog.create({ data: { actorId, action, entity, entityId, details } });
}

export async function listPartnerHotels(ownerId: string) {
  return db.hotel.findMany({
    where: { ownerId },
    include: {
      destination: { select: { name: true, state: true } },
      photos: { where: { isCover: true }, take: 1, include: { asset: { select: { path: true } } } },
      _count: { select: { rooms: true, bookings: true } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

export async function updateRoom(actor: Actor, roomId: string, data: z.infer<typeof roomUpdateInput>) {
  const before = await assertRoomAccess(actor, roomId);
  const patch: Prisma.RoomUpdateInput = { ...data };
  if (data.balconySide !== undefined) patch.hasBalcony = data.balconySide !== null;
  if (data.secondaryWindowSide !== undefined) {
    patch.isCorner = data.secondaryWindowSide !== null;
    patch.windowCount = data.secondaryWindowSide ? 2 : 1;
  }
  const room = await db.room.update({ where: { id: roomId }, data: patch });
  if ((data.viewType && data.viewType !== before.viewType) || data.balconySide !== undefined) await regenerateLibraryPhotos([roomId]);
  await audit(actor.id, "room.updated", "Room", roomId, data as Prisma.InputJsonValue);
  return room;
}

export async function addRoomBlock(actor: Actor, roomId: string, input: { startDate: string; endDate: string; reason: string }) {
  await assertRoomAccess(actor, roomId);
  const startDate = parseDateOnly(input.startDate)!;
  const endDate = parseDateOnly(input.endDate)!;
  return db.$transaction(async (tx) => {
    await lockRoom(tx, roomId);
    const clash = await tx.booking.findFirst({
      where: { roomId, status: { not: "CANCELLED" }, checkIn: { lt: endDate }, checkOut: { gt: startDate } },
      select: { code: true },
    });
    if (clash) throw new AppError("CONFLICT", `Booking ${clash.code} overlaps these dates; cancel or move it first`);
    const block = await tx.roomBlock.create({ data: { roomId, startDate, endDate, reason: input.reason } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "room.blocked", entity: "Room", entityId: roomId, details: input } });
    return block;
  });
}

export async function removeRoomBlock(actor: Actor, blockId: string) {
  const block = await db.roomBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new AppError("NOT_FOUND", "Block not found");
  await assertRoomAccess(actor, block.roomId);
  await db.roomBlock.delete({ where: { id: blockId } });
  await audit(actor.id, "room.unblocked", "Room", block.roomId);
}

/** Create a property from a building template. It gets the same layout model and photo associations as the demo catalogue. */
export async function createHotel(ownerId: string, input: HotelCreateInput) {
  const dest = await db.destination.findUnique({ where: { id: input.destinationId } });
  if (!dest) throw new AppError("BAD_REQUEST", "Choose a valid destination");
  let slug = slugify(`${input.name}-${dest.slug}`);
  if (await db.hotel.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  const id = sid("htl", `partner:${ownerId}:${slug}`);
  const assets: AssetRegistry = new Map();
  const records = buildHotelRecords(
    {
      id,
      dest: { ...destinationArt(dest.slug), name: dest.name, state: dest.state, description: "" },
      destinationId: dest.id,
      index: 0,
      name: input.name,
      slug,
      template: input.template,
      style: TEMPLATE_INFO[input.template].interiorStyle,
      stars: input.starRating,
      palette: input.palette,
      frontView: input.frontView as ViewKey,
      backView: input.backView as ViewKey,
      ownerId,
      status: "PENDING",
      isDemo: false,
      description: input.description,
      address: input.address,
      amenities: input.amenities,
      standardBasePrice: input.basePrice,
    },
    assets,
  );
  await db.$transaction(async (tx) => {
    await insertHotelRecords(tx, [records], assets);
    await tx.auditLog.create({ data: { actorId: ownerId, action: "hotel.created", entity: "Hotel", entityId: id, details: { template: input.template } } });
  });
  return { id, slug, status: "PENDING" as const, rooms: records.rooms.length };
}

export async function updateHotelProfile(actor: Actor, hotelId: string, input: z.infer<typeof hotelProfileInput>) {
  await assertHotelAccess(actor, hotelId);
  const hotel = await db.hotel.update({ where: { id: hotelId }, data: input });
  await audit(actor.id, "hotel.profile_updated", "Hotel", hotelId);
  return hotel;
}

export async function updateRoomTypePrice(actor: Actor, roomTypeId: string, basePrice: number) {
  const rt = await db.roomType.findUnique({ where: { id: roomTypeId }, include: { hotel: true } });
  if (!rt || (actor.role !== "ADMIN" && rt.hotel.ownerId !== actor.id)) throw new AppError("NOT_FOUND", "Room type not found");
  const updated = await db.roomType.update({ where: { id: roomTypeId }, data: { basePrice } });
  await audit(actor.id, "roomtype.price_updated", "RoomType", roomTypeId, { from: rt.basePrice, to: basePrice });
  return updated;
}

/** Replace library photos (not partner uploads) for rooms whose attributes changed, so imagery stays coherent. */
async function regenerateLibraryPhotos(roomIds: string[]) {
  if (!roomIds.length) return;
  const rooms = await db.room.findMany({ where: { id: { in: roomIds } }, include: { roomType: true, floor: true, hotel: { include: { destination: { select: { slug: true } } } } } });
  const assets: AssetRegistry = new Map();
  const rows: Prisma.RoomPhotoCreateManyInput[] = [];
  for (const room of rooms) {
    const template = room.hotel.template as HotelTemplateKey;
    const art = destinationArt(room.hotel.destination.slug);
    const scene = sceneForView(art, template, room.viewType as ViewKey);
    const tod: Tod = room.floor.level >= 3 ? "dusk" : "day";
    const keys = roomPhotoKeys({
      template, style: TEMPLATE_INFO[template].interiorStyle, category: room.roomType.category, scene, tod, twin: room.bedType === "Twin",
      hasBalcony: room.hasBalcony, isCorner: room.isCorner, outlookFront: room.windowSide === "TOP", view: room.viewType as ViewKey, windowSide: room.windowSide, seed: room.id,
    });
    const uploads = await db.roomPhoto.count({ where: { roomId: room.id, asset: { source: "UPLOAD" } } });
    await db.roomPhoto.deleteMany({ where: { roomId: room.id, asset: { source: "LIBRARY" } } });
    keys.forEach(([category, key, caption], i) => {
      const a = registerAsset(assets, key);
      rows.push({ id: sid("rph", `${room.id}:${key}:${Date.now()}`), roomId: room.id, hotelId: room.hotelId, assetId: a.id!, category, alt: `Room ${room.number}: ${a.alt.charAt(0).toLowerCase()}${a.alt.slice(1)}`, caption, sortOrder: uploads + i, isPrimary: uploads === 0 && i === 0 });
    });
  }
  await db.mediaAsset.createMany({ data: [...assets.values()], skipDuplicates: true });
  await db.roomPhoto.createMany({ data: rows, skipDuplicates: true });
}

export interface LayoutIssue {
  room: string;
  message: string;
}

/** Pure validation of a floor layout; shared by the editor (client preview) and the save endpoint. */
export function validateLayout(floor: { width: number; height: number; wings: Rect[] }, solids: Rect[], rooms: (Rect & { number: string })[]): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const insideWings = (r: Rect) => {
    for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) if (!floor.wings.some((w) => contains(w, { x, y, w: 1, h: 1 }))) return false;
    return true;
  };
  const seen = new Set<string>();
  rooms.forEach((r, i) => {
    if (seen.has(r.number)) issues.push({ room: r.number, message: `Room number ${r.number} is used twice` });
    seen.add(r.number);
    if (r.x + r.w > floor.width || r.y + r.h > floor.height) issues.push({ room: r.number, message: `Room ${r.number} extends beyond the floor plate` });
    else if (floor.wings.length && !insideWings(r)) issues.push({ room: r.number, message: `Room ${r.number} sits outside the building footprint` });
    for (const s of solids) if (overlaps(r, s)) issues.push({ room: r.number, message: `Room ${r.number} overlaps a corridor, lift or stairs` });
    for (let j = i + 1; j < rooms.length; j++) if (overlaps(r, rooms[j])) issues.push({ room: r.number, message: `Rooms ${r.number} and ${rooms[j].number} overlap` });
  });
  return issues;
}

/** Save the room layout of one floor. The stored layout drives the customer floor plan and the 3D model. */
export async function saveFloorLayout(actor: Actor, floorId: string, input: FloorLayoutInput, now: Date = new Date()) {
  const floor = await db.floor.findUnique({ where: { id: floorId }, include: { hotel: true, elements: true, rooms: { include: { bookings: { select: { checkOut: true, status: true } }, holds: { select: { expiresAt: true } } } } } });
  if (!floor || (actor.role !== "ADMIN" && floor.hotel.ownerId !== actor.id)) throw new AppError("NOT_FOUND", "Floor not found");
  const wings = (Array.isArray(floor.wings) ? floor.wings : []) as unknown as Rect[];
  const solids = floor.elements.filter((e) => e.kind !== "COURTYARD" && e.kind !== "GARDEN");
  const issues = validateLayout({ width: floor.width, height: floor.height, wings }, solids, input.rooms);
  if (issues.length) throw new AppError("BAD_REQUEST", issues[0].message, { issues });

  const roomTypes = await db.roomType.findMany({ where: { hotelId: floor.hotelId }, select: { id: true, bedType: true, sizeSqm: true } });
  const typeIds = new Set(roomTypes.map((t) => t.id));
  if (input.rooms.some((r) => !typeIds.has(r.roomTypeId))) throw new AppError("BAD_REQUEST", "Unknown room type");
  const existing = new Map(floor.rooms.map((r) => [r.id, r]));
  if (input.rooms.some((r) => r.id && !existing.has(r.id))) throw new AppError("BAD_REQUEST", "A room in this layout belongs to another floor");
  const otherNumbers = await db.room.findMany({ where: { hotelId: floor.hotelId, floorId: { not: floorId }, number: { in: input.rooms.map((r) => r.number) } }, select: { number: true } });
  if (otherNumbers.length) throw new AppError("BAD_REQUEST", `Room number ${otherNumbers[0].number} already exists on another floor`);

  const today = todayUtc(now);
  const keep = new Set(input.rooms.filter((r) => r.id).map((r) => r.id!));
  const removed = floor.rooms.filter((r) => !keep.has(r.id) && r.status !== "INACTIVE");
  for (const r of removed) {
    if (r.bookings.some((b) => b.status !== "CANCELLED" && b.checkOut > today)) throw new AppError("CONFLICT", `Room ${r.number} has upcoming bookings and cannot be removed`);
    if (r.holds.some((h) => h.expiresAt > now)) throw new AppError("CONFLICT", `Room ${r.number} is being booked right now; try again shortly`);
  }

  const changedPhotos: string[] = [];
  const createdIds: string[] = [];
  await db.$transaction(async (tx) => {
    for (const r of removed) {
      // Rooms with booking history are retired (hidden) rather than deleted, preserving records.
      if (r.bookings.length) await tx.room.update({ where: { id: r.id }, data: { status: "INACTIVE", number: `${r.number}-X${Date.now().toString(36).slice(-4).toUpperCase()}` } });
      else await tx.room.delete({ where: { id: r.id } });
    }
    for (const r of input.rooms) {
      const geometry = {
        number: r.number, roomTypeId: r.roomTypeId, x: r.x, y: r.y, w: r.w, h: r.h,
        windowSide: r.windowSide, secondaryWindowSide: r.secondaryWindowSide, balconySide: r.balconySide,
        hasBalcony: r.balconySide !== null, isCorner: r.secondaryWindowSide !== null, windowCount: r.secondaryWindowSide ? 2 : 1,
        viewType: r.viewType as ViewType, sizeSqm: roomAreaSqm(r, roomTypes.find((t) => t.id === r.roomTypeId)?.sizeSqm ?? 25),
      };
      if (r.id) {
        const prev = existing.get(r.id)!;
        if (prev.viewType !== r.viewType || prev.roomTypeId !== r.roomTypeId || (prev.balconySide ?? null) !== r.balconySide || (prev.secondaryWindowSide ?? null) !== r.secondaryWindowSide) changedPhotos.push(r.id);
        await tx.room.update({ where: { id: r.id }, data: geometry });
      } else {
        const id = sid("rom", `${floor.hotelId}:${r.number}:${Date.now()}:${createdIds.length}`);
        createdIds.push(id);
        await tx.room.create({ data: { id, hotelId: floor.hotelId, floorId, viewScore: 50, bedType: roomTypes.find((t) => t.id === r.roomTypeId)?.bedType ?? "Queen", ...geometry } });
      }
    }
    await tx.auditLog.create({ data: { actorId: actor.id, action: "floor.layout_saved", entity: "Floor", entityId: floorId, details: { rooms: input.rooms.length, removed: removed.length, created: createdIds.length } } });
  });
  await regenerateLibraryPhotos([...changedPhotos, ...createdIds]);
  return { saved: input.rooms.length, removed: removed.length, created: createdIds.length };
}

// ---------------------------------------------------------------- room photography management

export async function addUploadedRoomPhoto(actor: Actor, roomId: string, upload: { path: string; mimeType: string; sizeBytes: number; width: number; height: number }, meta: { category: MediaCategoryKey; alt: string }) {
  const room = await assertRoomAccess(actor, roomId);
  const count = await db.roomPhoto.count({ where: { roomId } });
  const asset = await db.mediaAsset.create({
    data: { key: `upload/${upload.path.split("/").pop()}`, path: upload.path, category: meta.category, alt: meta.alt, width: upload.width, height: upload.height, illustrative: false, source: "UPLOAD", mimeType: upload.mimeType, sizeBytes: upload.sizeBytes, uploadedById: actor.id },
  });
  const photo = await db.roomPhoto.create({ data: { roomId, hotelId: room.hotelId, assetId: asset.id, category: meta.category, alt: meta.alt, sortOrder: count, isPrimary: count === 0, illustrative: false } });
  await audit(actor.id, "room.photo_uploaded", "Room", roomId, { photoId: photo.id });
  return photo;
}

async function assertPhotoAccess(actor: Actor, photoId: string) {
  const photo = await db.roomPhoto.findUnique({ where: { id: photoId }, include: { hotel: true, asset: true } });
  if (!photo || (actor.role !== "ADMIN" && photo.hotel.ownerId !== actor.id)) throw new AppError("NOT_FOUND", "Photo not found");
  return photo;
}

export async function updateRoomPhoto(actor: Actor, photoId: string, data: { alt?: string; caption?: string | null; category?: MediaCategoryKey; isPrimary?: boolean }) {
  const photo = await assertPhotoAccess(actor, photoId);
  return db.$transaction(async (tx) => {
    if (data.isPrimary) await tx.roomPhoto.updateMany({ where: { roomId: photo.roomId }, data: { isPrimary: false } });
    return tx.roomPhoto.update({ where: { id: photoId }, data });
  });
}

export async function reorderRoomPhotos(actor: Actor, roomId: string, orderedIds: string[]) {
  await assertRoomAccess(actor, roomId);
  const photos = await db.roomPhoto.findMany({ where: { roomId }, select: { id: true } });
  const ids = new Set(photos.map((p) => p.id));
  if (orderedIds.length !== ids.size || orderedIds.some((id) => !ids.has(id))) throw new AppError("BAD_REQUEST", "Order must include every photo of this room exactly once");
  await db.$transaction(orderedIds.map((id, i) => db.roomPhoto.update({ where: { id }, data: { sortOrder: i } })));
}

export async function removeRoomPhoto(actor: Actor, photoId: string) {
  const photo = await assertPhotoAccess(actor, photoId);
  await db.roomPhoto.delete({ where: { id: photoId } });
  if (photo.isPrimary) {
    const next = await db.roomPhoto.findFirst({ where: { roomId: photo.roomId }, orderBy: { sortOrder: "asc" } });
    if (next) await db.roomPhoto.update({ where: { id: next.id }, data: { isPrimary: true } });
  }
  if (photo.asset.source === "UPLOAD" && !(await db.roomPhoto.count({ where: { assetId: photo.assetId } })) && !(await db.hotelPhoto.count({ where: { assetId: photo.assetId } }))) {
    await db.mediaAsset.delete({ where: { id: photo.assetId } });
    await deleteUpload(photo.asset.path);
  }
  await audit(actor.id, "room.photo_removed", "Room", photo.roomId, { photoId });
}

// ---------------------------------------------------------------- analytics and calendar

export async function partnerAnalytics(ownerId: string | null, now: Date = new Date()) {
  const hotelFilter = ownerId ? { hotel: { ownerId } } : {};
  const today = todayUtc(now);
  const start = addDays(today, -29);
  const horizon = addDays(today, 30);

  const [recent, upcoming, roomCount, statusCounts] = await Promise.all([
    db.booking.findMany({ where: { ...hotelFilter, createdAt: { gte: start }, status: { not: "CANCELLED" } }, select: { createdAt: true, total: true } }),
    db.booking.findMany({ where: { ...hotelFilter, status: { not: "CANCELLED" }, checkIn: { lt: horizon }, checkOut: { gt: today } }, select: { checkIn: true, checkOut: true } }),
    db.room.count({ where: { ...(ownerId ? { hotel: { ownerId, status: "APPROVED" } } : { hotel: { status: "APPROVED" } }), status: "ACTIVE" } }),
    db.booking.groupBy({ by: ["status"], where: hotelFilter, _count: true, _sum: { total: true, commission: true } }),
  ]);

  const revenueByDay = Array.from({ length: 30 }, (_, i) => ({ day: toDateOnlyString(addDays(start, i)).slice(5), revenue: 0, bookings: 0 }));
  for (const b of recent) {
    const idx = nightsBetween(start, todayUtc(b.createdAt));
    if (idx >= 0 && idx < 30) {
      revenueByDay[idx].revenue += b.total / 100;
      revenueByDay[idx].bookings += 1;
    }
  }
  let occupiedNights = 0;
  for (const b of upcoming) {
    const s = b.checkIn > today ? b.checkIn : today;
    const e = b.checkOut < horizon ? b.checkOut : horizon;
    occupiedNights += Math.max(0, nightsBetween(s, e));
  }
  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, { count: s._count, total: s._sum.total ?? 0, commission: s._sum.commission ?? 0 }]));
  const revenue = (byStatus.CONFIRMED?.total ?? 0) + (byStatus.COMPLETED?.total ?? 0);
  const commission = (byStatus.CONFIRMED?.commission ?? 0) + (byStatus.COMPLETED?.commission ?? 0);
  return { revenueByDay, occupancy30: roomCount ? occupiedNights / (roomCount * 30) : 0, roomCount, byStatus, revenue, commission };
}

export type CalendarCell = { state: "free" | "booked" | "held" | "blocked" | "inactive"; label?: string };

/** Room-by-day availability grid built from the same booking, hold and block records the storefront uses. */
export async function availabilityCalendar(actor: Actor, hotelId: string, from: Date, days: number, now: Date = new Date()) {
  await assertHotelAccess(actor, hotelId);
  const to = addDays(from, days);
  const [rooms, bookings, holds, blocks] = await Promise.all([
    db.room.findMany({ where: { hotelId, status: { not: "INACTIVE" } }, select: { id: true, number: true, status: true, floor: { select: { level: true } }, roomType: { select: { name: true } } }, orderBy: [{ floor: { level: "asc" } }, { number: "asc" }] }),
    db.booking.findMany({ where: { hotelId, status: { not: "CANCELLED" }, checkIn: { lt: to }, checkOut: { gt: from } }, select: { roomId: true, checkIn: true, checkOut: true, code: true, guestName: true } }),
    db.roomHold.findMany({ where: { room: { hotelId }, expiresAt: { gt: now }, checkIn: { lt: to }, checkOut: { gt: from } }, select: { roomId: true, checkIn: true, checkOut: true } }),
    db.roomBlock.findMany({ where: { room: { hotelId }, startDate: { lt: to }, endDate: { gt: from } }, select: { roomId: true, startDate: true, endDate: true, reason: true } }),
  ]);
  const dates = Array.from({ length: days }, (_, i) => addDays(from, i));
  const grid = rooms.map((room) => ({
    id: room.id,
    number: room.number,
    level: room.floor.level,
    roomType: room.roomType.name,
    cells: dates.map<CalendarCell>((d) => {
      if (room.status === "MAINTENANCE") return { state: "inactive", label: "Maintenance" };
      const b = bookings.find((x) => x.roomId === room.id && x.checkIn <= d && x.checkOut > d);
      if (b) return { state: "booked", label: `${b.code} · ${b.guestName.split(" ")[0]}` };
      const k = blocks.find((x) => x.roomId === room.id && x.startDate <= d && x.endDate > d);
      if (k) return { state: "blocked", label: k.reason };
      const h = holds.find((x) => x.roomId === room.id && x.checkIn <= d && x.checkOut > d);
      if (h) return { state: "held", label: "Checkout in progress" };
      return { state: "free" };
    }),
  }));
  return { dates: dates.map(toDateOnlyString), rooms: grid };
}

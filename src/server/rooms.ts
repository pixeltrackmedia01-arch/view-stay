import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { RoomPhotoDTO } from "@/lib/explorer-types";
import { MEDIA_CATEGORY_LABELS, type MediaCategoryKey } from "@/lib/media/library";
import { quoteStay, roomNightlyRate } from "@/lib/pricing";
import { roomConflicts } from "./availability";

/** Photos for one physical room, in display order. Only rooms of bookable (or previewable) hotels are exposed. */
export async function getRoomPhotos(roomId: string, viewer?: { id: string; role: string } | null) {
  const room = await db.room.findUnique({
    where: { id: roomId },
    select: {
      id: true, number: true, viewType: true, hotelId: true,
      floor: { select: { name: true, level: true } },
      roomType: { select: { name: true } },
      hotel: { select: { name: true, slug: true, status: true, ownerId: true } },
      photos: { orderBy: { sortOrder: "asc" }, include: { asset: { select: { path: true, width: true, height: true } } } },
    },
  });
  const preview = viewer && (viewer.role === "ADMIN" || room?.hotel.ownerId === viewer.id);
  if (!room || (room.hotel.status !== "APPROVED" && !preview)) throw new AppError("NOT_FOUND", "Room not found");
  const photos: RoomPhotoDTO[] = room.photos.map((p) => ({
    id: p.id,
    category: p.category,
    categoryLabel: MEDIA_CATEGORY_LABELS[p.category as MediaCategoryKey],
    path: p.asset.path,
    alt: p.alt,
    caption: p.caption,
    width: p.asset.width,
    height: p.asset.height,
    illustrative: p.illustrative,
    isPrimary: p.isPrimary,
  }));
  const categories = [...new Set(photos.map((p) => p.category))].map((c) => ({ key: c, label: MEDIA_CATEGORY_LABELS[c as MediaCategoryKey], count: photos.filter((p) => p.category === c).length }));
  return {
    room: { id: room.id, number: room.number, floor: room.floor.name, level: room.floor.level, roomType: room.roomType.name, hotelName: room.hotel.name, hotelSlug: room.hotel.slug, viewType: room.viewType },
    photos,
    categories,
  };
}

/**
 * Check one specific physical room for new dates (used by "book the same room again"). Never substitutes:
 * if the room is unavailable, similar available rooms are returned separately as clearly-labelled alternatives.
 */
export async function checkRoomForStay(roomId: string, checkIn: Date, checkOut: Date, guests: number, userId?: string) {
  const room = await db.room.findUnique({ where: { id: roomId }, include: { roomType: true, hotel: { select: { id: true, slug: true, name: true, status: true } }, floor: { select: { level: true } } } });
  if (!room || room.hotel.status !== "APPROVED") throw new AppError("NOT_FOUND", "Room not found");
  const c = await roomConflicts(db, room.id, checkIn, checkOut, { ignoreHoldOfUser: userId });
  const reason =
    room.status !== "ACTIVE" ? "This room is out of service for now." :
    c.booked ? "This room is already booked for those dates." :
    c.blocked ? "The property has closed this room for those dates." :
    c.held ? "Another guest is completing a booking for this room." :
    guests > room.roomType.maxGuests ? `This room sleeps up to ${room.roomType.maxGuests} guests.` : null;
  const quote = quoteStay(roomNightlyRate(room.roomType.basePrice, room.priceAdjustment), checkIn, checkOut);
  if (!reason) return { available: true as const, room: { id: room.id, number: room.number, hotelSlug: room.hotel.slug }, quote, alternatives: [] };

  // Similar rooms at the same property, scored on shared attributes.
  const candidates = await db.room.findMany({
    where: { hotelId: room.hotelId, status: "ACTIVE", id: { not: room.id }, roomType: { maxGuests: { gte: guests } } },
    include: { roomType: true, floor: { select: { level: true } } },
  });
  const scored = [];
  for (const cand of candidates) {
    let score = 0;
    const why: string[] = [];
    if (cand.viewType === room.viewType) { score += 3; why.push(`same ${cand.viewType.toLowerCase()} view`); }
    if (cand.roomType.category === room.roomType.category) { score += 2; why.push("same room category"); }
    if (cand.hasBalcony && room.hasBalcony) { score += 1; why.push("also has a balcony"); }
    if (cand.floor.level === room.floor.level) { score += 1; why.push("same floor"); }
    if (Math.abs(cand.floor.level - room.floor.level) === 1) score += 0.5;
    scored.push({ cand, score, why });
  }
  scored.sort((a, b) => b.score - a.score);
  const alternatives = [];
  for (const s of scored) {
    if (alternatives.length >= 4) break;
    const cc = await roomConflicts(db, s.cand.id, checkIn, checkOut, { ignoreHoldOfUser: userId });
    if (cc.booked || cc.blocked || cc.held) continue;
    alternatives.push({ id: s.cand.id, number: s.cand.number, level: s.cand.floor.level, viewType: s.cand.viewType, roomTypeName: s.cand.roomType.name, why: s.why, total: quoteStay(roomNightlyRate(s.cand.roomType.basePrice, s.cand.priceAdjustment), checkIn, checkOut).total });
  }
  return { available: false as const, reason, room: { id: room.id, number: room.number, hotelSlug: room.hotel.slug }, quote, alternatives };
}

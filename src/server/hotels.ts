import type { Prisma } from "@prisma/client";
import type { ViewKey } from "@/lib/catalog-types";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { ExplorerData, ExplorerFloor, ExplorerRoom } from "@/lib/explorer-types";
import type { Rect } from "@/lib/layout/geometry";
import { quoteStay, roomNightlyRate } from "@/lib/pricing";
import { toDateOnlyString, nightsBetween } from "@/lib/dates";
import { hotelRoomAvailability } from "./availability";

export async function getHotelBySlug(slug: string, viewer?: { id: string; role: string } | null) {
  const hotel = await db.hotel.findUnique({
    where: { slug },
    include: {
      destination: { select: { id: true, name: true, slug: true, state: true, attractions: true, latitude: true, longitude: true } },
      photos: { orderBy: { sortOrder: "asc" }, include: { asset: { select: { path: true, width: true, height: true, illustrative: true } } } },
      roomTypes: { orderBy: { basePrice: "asc" } },
      reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 12 },
      _count: { select: { rooms: true, floors: true } },
    },
  });
  const canPreview = viewer && (viewer.role === "ADMIN" || hotel?.ownerId === viewer.id);
  if (!hotel || (hotel.status !== "APPROVED" && !canPreview)) throw new AppError("NOT_FOUND", "Hotel not found");
  return hotel;
}

function dominant<T>(items: T[]): T | null {
  const counts = new Map<T, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** Everything the explorer needs for one stay: floors, layout, rooms with live status, price and primary photo. */
export async function getExplorerData(hotelId: string, checkIn: Date, checkOut: Date, guests: number, roomsWanted: number, userId?: string): Promise<ExplorerData> {
  const [hotel, floors, availability, photoStats] = await Promise.all([
    db.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { id: true, slug: true, name: true, template: true, palette: true, destination: { select: { name: true } } } }),
    db.floor.findMany({ where: { hotelId }, include: { elements: true }, orderBy: { level: "asc" } }),
    hotelRoomAvailability(hotelId, checkIn, checkOut, Math.ceil(guests / Math.max(1, roomsWanted)), userId),
    db.roomPhoto.groupBy({ by: ["roomId"], where: { hotelId }, _count: true }),
  ]);
  const primary = await db.roomPhoto.findMany({ where: { hotelId, isPrimary: true }, select: { roomId: true, alt: true, asset: { select: { path: true } } } });
  const primaryBy = new Map(primary.map((p) => [p.roomId, { path: p.asset.path, alt: p.alt }]));
  const countBy = new Map(photoStats.map((p) => [p.roomId, p._count]));
  const levelBy = new Map(floors.map((f) => [f.id, f.level]));

  const rooms: ExplorerRoom[] = [];
  for (const { room, status, holdGroupId } of availability) {
    if (room.status === "INACTIVE") continue;
    const nightly = roomNightlyRate(room.roomType.basePrice, room.priceAdjustment);
    rooms.push({
      id: room.id,
      number: room.number,
      floorId: room.floorId,
      level: levelBy.get(room.floorId) ?? 1,
      x: room.x,
      y: room.y,
      w: room.w,
      h: room.h,
      status,
      holdGroupId,
      category: room.roomType.category,
      roomTypeId: room.roomTypeId,
      roomTypeName: room.roomType.name,
      bedType: room.bedType,
      maxGuests: room.roomType.maxGuests,
      sizeSqm: room.sizeSqm,
      viewType: room.viewType as ViewKey,
      viewScore: room.viewScore,
      viewVerified: room.viewVerified,
      hasBalcony: room.hasBalcony,
      isCorner: room.isCorner,
      windowCount: room.windowCount,
      windowSide: room.windowSide,
      secondaryWindowSide: room.secondaryWindowSide,
      balconySide: room.balconySide,
      nearElevator: room.nearElevator,
      accessible: room.accessible,
      notes: room.notes,
      amenities: room.roomType.amenities,
      nightlyRate: nightly,
      stayTotal: quoteStay(nightly, checkIn, checkOut).total,
      photoCount: countBy.get(room.id) ?? 0,
      primaryPhoto: primaryBy.get(room.id) ?? null,
    });
  }
  const floorDtos: ExplorerFloor[] = floors.map((f) => ({
    id: f.id,
    level: f.level,
    name: f.name,
    width: f.width,
    height: f.height,
    wings: (Array.isArray(f.wings) ? f.wings : []) as unknown as Rect[],
    elements: f.elements.map(({ id, kind, label, x, y, w, h }) => ({ id, kind, label, x, y, w, h })),
  }));
  const frontView = dominant(rooms.filter((r) => r.windowSide === "TOP").map((r) => r.viewType)) ?? "GARDEN";
  const backView = dominant(rooms.filter((r) => r.windowSide === "BOTTOM").map((r) => r.viewType));
  return {
    hotel: { id: hotel.id, slug: hotel.slug, name: hotel.name, template: hotel.template, palette: hotel.palette, frontView, backView, destination: hotel.destination.name },
    stay: { checkIn: toDateOnlyString(checkIn), checkOut: toDateOnlyString(checkOut), guests, rooms: roomsWanted, nights: nightsBetween(checkIn, checkOut) },
    floors: floorDtos,
    rooms,
  };
}

export const hotelCardSelect = {
  id: true, slug: true, name: true, city: true, neighborhood: true, starRating: true, template: true, ratingAvg: true, reviewCount: true, featured: true,
  destination: { select: { slug: true, state: true } },
  photos: { where: { isCover: true }, take: 1, select: { alt: true, asset: { select: { path: true } } } },
} satisfies Prisma.HotelSelect;

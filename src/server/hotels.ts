import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { quoteStay, roomNightlyRate } from "@/lib/pricing";
import { hotelRoomAvailability, type RoomAvailability } from "./availability";

export async function getHotelBySlug(slug: string, viewer?: { id: string; role: string } | null) {
  const hotel = await db.hotel.findUnique({
    where: { slug },
    include: {
      roomTypes: { orderBy: { basePrice: "asc" } },
      reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { rooms: true, reviews: true } },
    },
  });
  const canPreview = viewer && (viewer.role === "ADMIN" || hotel?.ownerId === viewer.id);
  if (!hotel || (hotel.status !== "APPROVED" && !canPreview)) throw new AppError("NOT_FOUND", "Hotel not found");
  const avg = hotel.reviews.length ? hotel.reviews.reduce((s, r) => s + r.rating, 0) / hotel.reviews.length : null;
  return { ...hotel, averageRating: avg };
}

export interface MapRoom {
  id: string;
  number: string;
  x: number;
  y: number;
  w: number;
  h: number;
  status: RoomAvailability;
  holdId: string | null;
  roomType: { id: string; name: string; bedType: string; maxGuests: number; sizeSqm: number; description: string };
  viewType: string;
  viewScore: number;
  viewVerified: boolean;
  hasBalcony: boolean;
  isCorner: boolean;
  windowCount: number;
  nearElevator: boolean;
  accessible: boolean;
  notes: string | null;
  nightlyRate: number;
  stayTotal: number;
}

export interface MapFloor {
  id: string;
  level: number;
  name: string;
  width: number;
  height: number;
  elements: { id: string; kind: string; label: string; x: number; y: number; w: number; h: number }[];
  rooms: MapRoom[];
}

/** Floor plans with per-room live availability and stay pricing. */
export async function getFloorMap(hotelId: string, checkIn: Date, checkOut: Date, guests: number, userId?: string) {
  const [floors, availability] = await Promise.all([
    db.floor.findMany({ where: { hotelId }, include: { elements: true }, orderBy: { level: "asc" } }),
    hotelRoomAvailability(hotelId, checkIn, checkOut, guests, userId),
  ]);
  const result: MapFloor[] = floors.map((f) => ({
    id: f.id,
    level: f.level,
    name: f.name,
    width: f.width,
    height: f.height,
    elements: f.elements.map(({ id, kind, label, x, y, w, h }) => ({ id, kind, label, x, y, w, h })),
    rooms: [],
  }));
  const byFloor = new Map(result.map((f) => [f.id, f]));
  for (const { room, status, holdId } of availability) {
    if (room.status === "INACTIVE") continue;
    const nightly = roomNightlyRate(room.roomType.basePrice, room.priceAdjustment);
    const quote = quoteStay(nightly, checkIn, checkOut);
    byFloor.get(room.floorId)?.rooms.push({
      id: room.id,
      number: room.number,
      x: room.x,
      y: room.y,
      w: room.w,
      h: room.h,
      status,
      holdId,
      roomType: {
        id: room.roomType.id,
        name: room.roomType.name,
        bedType: room.roomType.bedType,
        maxGuests: room.roomType.maxGuests,
        sizeSqm: room.roomType.sizeSqm,
        description: room.roomType.description,
      },
      viewType: room.viewType,
      viewScore: room.viewScore,
      viewVerified: room.viewVerified,
      hasBalcony: room.hasBalcony,
      isCorner: room.isCorner,
      windowCount: room.windowCount,
      nearElevator: room.nearElevator,
      accessible: room.accessible,
      notes: room.notes,
      nightlyRate: nightly,
      stayTotal: quote.total,
    });
  }
  return result;
}

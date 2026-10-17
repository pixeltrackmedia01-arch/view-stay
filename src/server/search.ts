import type { Prisma, ViewType } from "@prisma/client";
import { db } from "@/lib/db";
import { roomNightlyRate } from "@/lib/pricing";
import { overlapping } from "./availability";

export interface SearchParams {
  city?: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  view?: ViewType;
  minStars?: number;
  balcony?: boolean;
  sort?: "price" | "rating" | "view";
}

export interface HotelResult {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  starRating: number;
  coverHue: number;
  amenities: string[];
  availableRooms: number;
  totalRooms: number;
  minPrice: number | null;
  bestViewScore: number | null;
  viewTypes: ViewType[];
  rating: number | null;
  reviewCount: number;
}

export async function searchHotels(p: SearchParams, now: Date = new Date()): Promise<HotelResult[]> {
  const where: Prisma.HotelWhereInput = { status: "APPROVED" };
  if (p.city?.trim()) {
    const q = p.city.trim();
    where.OR = [
      { city: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { country: { contains: q, mode: "insensitive" } },
    ];
  }
  if (p.minStars) where.starRating = { gte: p.minStars };

  const hotels = await db.hotel.findMany({
    where,
    include: {
      rooms: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          viewType: true,
          viewScore: true,
          hasBalcony: true,
          priceAdjustment: true,
          roomType: { select: { basePrice: true, maxGuests: true } },
        },
      },
    },
  });
  if (!hotels.length) return [];
  const hotelIds = hotels.map((h) => h.id);

  const [booked, blocked, held, ratings] = await Promise.all([
    db.booking.findMany({
      where: { hotelId: { in: hotelIds }, status: { not: "CANCELLED" }, ...overlapping(p.checkIn, p.checkOut) },
      select: { roomId: true },
    }),
    db.roomBlock.findMany({
      where: { room: { hotelId: { in: hotelIds } }, startDate: { lt: p.checkOut }, endDate: { gt: p.checkIn } },
      select: { roomId: true },
    }),
    db.roomHold.findMany({
      where: { room: { hotelId: { in: hotelIds } }, expiresAt: { gt: now }, ...overlapping(p.checkIn, p.checkOut) },
      select: { roomId: true },
    }),
    db.review.groupBy({ by: ["hotelId"], where: { hotelId: { in: hotelIds } }, _avg: { rating: true }, _count: true }),
  ]);
  const taken = new Set([...booked, ...blocked, ...held].map((r) => r.roomId));
  const ratingBy = new Map(ratings.map((r) => [r.hotelId, r]));

  const results: HotelResult[] = hotels.map((h) => {
    const free = h.rooms.filter(
      (r) =>
        !taken.has(r.id) &&
        r.roomType.maxGuests >= p.guests &&
        (!p.view || r.viewType === p.view) &&
        (!p.balcony || r.hasBalcony),
    );
    const prices = free.map((r) => roomNightlyRate(r.roomType.basePrice, r.priceAdjustment));
    const rating = ratingBy.get(h.id);
    return {
      id: h.id,
      slug: h.slug,
      name: h.name,
      city: h.city,
      country: h.country,
      starRating: h.starRating,
      coverHue: h.coverHue,
      amenities: h.amenities,
      availableRooms: free.length,
      totalRooms: h.rooms.length,
      minPrice: prices.length ? Math.min(...prices) : null,
      bestViewScore: free.length ? Math.max(...free.map((r) => r.viewScore)) : null,
      viewTypes: [...new Set(h.rooms.map((r) => r.viewType))].filter((v) => v !== "NONE"),
      rating: rating?._avg.rating ?? null,
      reviewCount: rating?._count ?? 0,
    };
  });

  const filtered = p.view || p.balcony ? results.filter((r) => r.availableRooms > 0) : results;
  const sort = p.sort ?? "price";
  return filtered.sort((a, b) => {
    // Sold-out hotels always last
    if (!a.availableRooms !== !b.availableRooms) return a.availableRooms ? -1 : 1;
    if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0) || b.starRating - a.starRating;
    if (sort === "view") return (b.bestViewScore ?? 0) - (a.bestViewScore ?? 0);
    return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
  });
}

export async function listCities() {
  const rows = await db.hotel.groupBy({ by: ["city", "country"], where: { status: "APPROVED" }, _count: true });
  return rows.map((r) => ({ city: r.city, country: r.country, hotels: r._count })).sort((a, b) => b.hotels - a.hotels);
}

import { db } from "@/lib/db";
import { quoteStay, roomNightlyRate } from "@/lib/pricing";
import { destinationStartingPrices, searchHotels } from "./search";

export interface ShowcaseRoom {
  id: string;
  number: string;
  level: number;
  floorName: string;
  viewType: string;
  hasBalcony: boolean;
  isCorner: boolean;
  sizeSqm: number;
  bedType: string;
  roomTypeName: string;
  nightly: number;
  stayTotal: number;
  photo: { path: string; alt: string } | null;
  hotel: { slug: string; name: string; city: string; template: string };
}

/** Available rooms for a stay, picked by SQL (best-view or best-value), then hydrated with photos. */
export async function showcaseRooms(checkIn: Date, checkOut: Date, mode: "view" | "value", limit: number, now = new Date()): Promise<ShowcaseRoom[]> {
  const ids =
    mode === "view"
      ? await db.$queryRaw<{ id: string }[]>`
          SELECT DISTINCT ON (r."hotelId") r.id FROM "Room" r JOIN "Hotel" h ON h.id = r."hotelId"
          WHERE h.status = 'APPROVED' AND h.featured AND r.status = 'ACTIVE' AND (r."hasBalcony" OR r."isCorner") AND r."viewScore" >= 75
            AND NOT EXISTS (SELECT 1 FROM "Booking" b WHERE b."roomId" = r.id AND b.status <> 'CANCELLED' AND b."checkIn" < ${checkOut} AND b."checkOut" > ${checkIn})
            AND NOT EXISTS (SELECT 1 FROM "RoomHold" o WHERE o."roomId" = r.id AND o."expiresAt" > ${now} AND o."checkIn" < ${checkOut} AND o."checkOut" > ${checkIn})
            AND NOT EXISTS (SELECT 1 FROM "RoomBlock" k WHERE k."roomId" = r.id AND k."startDate" < ${checkOut} AND k."endDate" > ${checkIn})
          ORDER BY r."hotelId", r."viewScore" DESC LIMIT ${limit}`
      : await db.$queryRaw<{ id: string }[]>`
          SELECT id FROM (
            SELECT DISTINCT ON (r."hotelId") r.id, (rt."basePrice" + r."priceAdjustment") AS price FROM "Room" r
            JOIN "Hotel" h ON h.id = r."hotelId" JOIN "RoomType" rt ON rt.id = r."roomTypeId"
            WHERE h.status = 'APPROVED' AND r.status = 'ACTIVE' AND r."viewScore" >= 60 AND coalesce(h."ratingAvg", 0) >= 4
              AND NOT EXISTS (SELECT 1 FROM "Booking" b WHERE b."roomId" = r.id AND b.status <> 'CANCELLED' AND b."checkIn" < ${checkOut} AND b."checkOut" > ${checkIn})
              AND NOT EXISTS (SELECT 1 FROM "RoomHold" o WHERE o."roomId" = r.id AND o."expiresAt" > ${now} AND o."checkIn" < ${checkOut} AND o."checkOut" > ${checkIn})
              AND NOT EXISTS (SELECT 1 FROM "RoomBlock" k WHERE k."roomId" = r.id AND k."startDate" < ${checkOut} AND k."endDate" > ${checkIn})
            ORDER BY r."hotelId", price ASC
          ) t ORDER BY price ASC LIMIT ${limit}`;
  const rooms = await db.room.findMany({
    where: { id: { in: ids.map((r) => r.id) } },
    include: {
      roomType: true,
      floor: { select: { level: true, name: true } },
      hotel: { select: { slug: true, name: true, city: true, template: true } },
      photos: { where: { isPrimary: true }, take: 1, include: { asset: { select: { path: true } } } },
    },
  });
  const order = new Map(ids.map((r, i) => [r.id, i]));
  return rooms
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
    .map((r) => {
      const nightly = roomNightlyRate(r.roomType.basePrice, r.priceAdjustment);
      return {
        id: r.id,
        number: r.number,
        level: r.floor.level,
        floorName: r.floor.name,
        viewType: r.viewType,
        hasBalcony: r.hasBalcony,
        isCorner: r.isCorner,
        sizeSqm: r.sizeSqm,
        bedType: r.bedType,
        roomTypeName: r.roomType.name,
        nightly,
        stayTotal: quoteStay(nightly, checkIn, checkOut).total,
        photo: r.photos[0] ? { path: r.photos[0].asset.path, alt: r.photos[0].alt } : null,
        hotel: r.hotel,
      };
    });
}

export async function destinationCards() {
  const [dests, prices] = await Promise.all([
    db.destination.findMany({ orderBy: { sortOrder: "asc" }, include: { heroAsset: { select: { path: true, alt: true } } } }),
    destinationStartingPrices(),
  ]);
  return dests.map((d) => ({
    id: d.id,
    slug: d.slug,
    name: d.name,
    state: d.state,
    region: d.region,
    tagline: d.tagline,
    themes: d.themes,
    featured: d.featured,
    hero: d.heroAsset ? { path: d.heroAsset.path, alt: d.heroAsset.alt } : null,
    minPrice: prices.get(d.id)?.minPrice ?? null,
    hotels: prices.get(d.id)?.hotels ?? 0,
  }));
}

export async function featuredProperties(checkIn: Date, checkOut: Date) {
  const res = await searchHotels({ checkIn, checkOut, guests: 2, rooms: 1, sort: "recommended", pageSize: 400 });
  const all = [...res.hotels];
  const featured = all.filter((h) => h.featured);
  return (featured.length >= 8 ? featured : [...featured, ...all.filter((h) => !h.featured)]).slice(0, 8);
}

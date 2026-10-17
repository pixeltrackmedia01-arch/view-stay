import { Prisma, type HotelTemplate, type ViewType } from "@prisma/client";
import { db } from "@/lib/db";

export type SortKey = "recommended" | "price_asc" | "price_desc" | "rating" | "view" | "reviews";

export interface SearchParams {
  q?: string;
  destinationSlug?: string;
  /** Restrict to these hotels (wishlist). */
  hotelIds?: string[];
  checkIn: Date;
  checkOut: Date;
  guests: number;
  rooms: number;
  views?: ViewType[];
  templates?: HotelTemplate[];
  amenities?: string[];
  balcony?: boolean;
  corner?: boolean;
  minFloor?: number;
  bedTypes?: string[];
  minSize?: number;
  accessible?: boolean;
  freeCancellation?: boolean;
  minRating?: number;
  minStars?: number;
  priceMin?: number; // minor units per night
  priceMax?: number;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface HotelResult {
  id: string;
  slug: string;
  name: string;
  city: string;
  destinationSlug: string;
  state: string;
  neighborhood: string;
  starRating: number;
  template: HotelTemplate;
  amenities: string[];
  cancellationPolicy: string;
  ratingAvg: number | null;
  reviewCount: number;
  availableRooms: number;
  totalRooms: number;
  minPrice: number;
  bestViewScore: number;
  viewTypes: ViewType[];
  balconyRooms: number;
  cover: { path: string; alt: string } | null;
  latitude: number | null;
  longitude: number | null;
  mapX: number;
  mapY: number;
  featured: boolean;
}

interface AggRow {
  hotelId: string;
  available: number;
  minPrice: number;
  bestView: number;
  views: ViewType[];
  balconyRooms: number;
  totalRooms: number;
  total: number;
}

/** One SQL round trip: room-level filters + live availability, aggregated per hotel, filtered, sorted, paginated. */
export async function searchHotels(p: SearchParams, now: Date = new Date()) {
  const roomConds: Prisma.Sql[] = [Prisma.sql`h.status = 'APPROVED'`, Prisma.sql`r.status = 'ACTIVE'`];
  const perRoomGuests = Math.max(1, Math.ceil(p.guests / Math.max(1, p.rooms)));
  roomConds.push(Prisma.sql`rt."maxGuests" >= ${perRoomGuests}`);
  if (p.destinationSlug) roomConds.push(Prisma.sql`d.slug = ${p.destinationSlug}`);
  if (p.hotelIds) roomConds.push(p.hotelIds.length ? Prisma.sql`h.id IN (${Prisma.join(p.hotelIds)})` : Prisma.sql`FALSE`);
  if (p.q?.trim()) {
    const like = `%${p.q.trim().replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    roomConds.push(Prisma.sql`(d.name ILIKE ${like} OR d.state ILIKE ${like} OR h.name ILIKE ${like} OR h.neighborhood ILIKE ${like})`);
  }
  if (p.views?.length) roomConds.push(Prisma.sql`r."viewType"::text = ANY(${p.views}::text[])`);
  if (p.balcony) roomConds.push(Prisma.sql`r."hasBalcony"`);
  if (p.corner) roomConds.push(Prisma.sql`r."isCorner"`);
  if (p.minFloor) roomConds.push(Prisma.sql`f.level >= ${p.minFloor}`);
  if (p.bedTypes?.length) roomConds.push(Prisma.sql`r."bedType" = ANY(${p.bedTypes}::text[])`);
  if (p.minSize) roomConds.push(Prisma.sql`r."sizeSqm" >= ${p.minSize}`);
  if (p.accessible) roomConds.push(Prisma.sql`r.accessible`);
  if (p.templates?.length) roomConds.push(Prisma.sql`h.template::text = ANY(${p.templates}::text[])`);
  if (p.amenities?.length) roomConds.push(Prisma.sql`h.amenities @> ${p.amenities}::text[]`);
  if (p.freeCancellation) roomConds.push(Prisma.sql`h."cancellationPolicy" <> 'STRICT'`);
  if (p.minRating) roomConds.push(Prisma.sql`h."ratingAvg" >= ${p.minRating}`);
  if (p.minStars) roomConds.push(Prisma.sql`h."starRating" >= ${p.minStars}`);
  const ci = p.checkIn;
  const co = p.checkOut;

  const having: Prisma.Sql[] = [Prisma.sql`count(*) >= ${p.rooms}`];
  if (p.priceMin) having.push(Prisma.sql`min(rt."basePrice" + r."priceAdjustment") >= ${p.priceMin}`);
  if (p.priceMax) having.push(Prisma.sql`min(rt."basePrice" + r."priceAdjustment") <= ${p.priceMax}`);

  const order = {
    recommended: Prisma.sql`(coalesce(h."ratingAvg", 3.8) * 18 + max(r."viewScore") * 0.35 + CASE WHEN h.featured THEN 12 ELSE 0 END + least(count(*), 20) * 0.4 - min(rt."basePrice" + r."priceAdjustment") / 200000.0) DESC`,
    price_asc: Prisma.sql`min(rt."basePrice" + r."priceAdjustment") ASC`,
    price_desc: Prisma.sql`min(rt."basePrice" + r."priceAdjustment") DESC`,
    rating: Prisma.sql`h."ratingAvg" DESC NULLS LAST, h."reviewCount" DESC`,
    view: Prisma.sql`max(r."viewScore") DESC, h."ratingAvg" DESC NULLS LAST`,
    reviews: Prisma.sql`h."reviewCount" DESC`,
  }[p.sort ?? "recommended"];

  const pageSize = p.pageSize ?? 12;
  const page = Math.max(1, p.page ?? 1);

  const rows = await db.$queryRaw<AggRow[]>`
    SELECT r."hotelId" AS "hotelId",
           count(*)::int AS available,
           min(rt."basePrice" + r."priceAdjustment")::int AS "minPrice",
           max(r."viewScore")::int AS "bestView",
           array_agg(DISTINCT r."viewType"::text) AS views,
           count(*) FILTER (WHERE r."hasBalcony")::int AS "balconyRooms",
           (SELECT count(*) FROM "Room" x WHERE x."hotelId" = r."hotelId" AND x.status = 'ACTIVE')::int AS "totalRooms",
           count(*) OVER ()::int AS total
    FROM "Room" r
    JOIN "RoomType" rt ON rt.id = r."roomTypeId"
    JOIN "Floor" f ON f.id = r."floorId"
    JOIN "Hotel" h ON h.id = r."hotelId"
    JOIN "Destination" d ON d.id = h."destinationId"
    WHERE ${Prisma.join(roomConds, " AND ")}
      AND NOT EXISTS (SELECT 1 FROM "Booking" b WHERE b."roomId" = r.id AND b.status <> 'CANCELLED' AND b."checkIn" < ${co} AND b."checkOut" > ${ci})
      AND NOT EXISTS (SELECT 1 FROM "RoomBlock" k WHERE k."roomId" = r.id AND k."startDate" < ${co} AND k."endDate" > ${ci})
      AND NOT EXISTS (SELECT 1 FROM "RoomHold" o WHERE o."roomId" = r.id AND o."expiresAt" > ${now} AND o."checkIn" < ${co} AND o."checkOut" > ${ci})
    GROUP BY r."hotelId", h.id
    HAVING ${Prisma.join(having, " AND ")}
    ORDER BY ${order}, h.name ASC
  `;

  const total = rows.length;
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const ids = rows.map((r) => r.hotelId);
  const hotels = await db.hotel.findMany({
    where: { id: { in: ids } },
    select: {
      id: true, slug: true, name: true, city: true, neighborhood: true, starRating: true, template: true, amenities: true, cancellationPolicy: true,
      ratingAvg: true, reviewCount: true, latitude: true, longitude: true, mapX: true, mapY: true, featured: true,
      destination: { select: { slug: true, state: true } },
      photos: { where: { isCover: true }, take: 1, select: { alt: true, asset: { select: { path: true } } } },
    },
  });
  const byId = new Map(hotels.map((h) => [h.id, h]));
  const toResult = (row: AggRow): HotelResult => {
    const h = byId.get(row.hotelId)!;
    return {
      id: h.id,
      slug: h.slug,
      name: h.name,
      city: h.city,
      destinationSlug: h.destination.slug,
      state: h.destination.state,
      neighborhood: h.neighborhood,
      starRating: h.starRating,
      template: h.template,
      amenities: h.amenities,
      cancellationPolicy: h.cancellationPolicy,
      ratingAvg: h.ratingAvg,
      reviewCount: h.reviewCount,
      availableRooms: row.available,
      totalRooms: row.totalRooms,
      minPrice: row.minPrice,
      bestViewScore: row.bestView,
      viewTypes: row.views.filter((v) => v !== "NONE"),
      balconyRooms: row.balconyRooms,
      cover: h.photos[0] ? { path: h.photos[0].asset.path, alt: h.photos[0].alt } : null,
      latitude: h.latitude,
      longitude: h.longitude,
      mapX: h.mapX,
      mapY: h.mapY,
      featured: h.featured,
    };
  };
  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    hotels: pageRows.map(toResult),
    /** Every match, for the map view (no pagination). */
    mapPoints: rows.map((row) => {
      const h = byId.get(row.hotelId)!;
      return { id: h.id, slug: h.slug, name: h.name, city: h.city, latitude: h.latitude, longitude: h.longitude, mapX: h.mapX, mapY: h.mapY, minPrice: row.minPrice, ratingAvg: h.ratingAvg, cover: h.photos[0]?.asset.path ?? null };
    }),
  };
}

/** Lowest nightly price of any active room per destination (for destination cards). */
export async function destinationStartingPrices() {
  const rows = await db.$queryRaw<{ destinationId: string; minPrice: number; hotels: number }[]>`
    SELECT h."destinationId" AS "destinationId", min(rt."basePrice" + r."priceAdjustment")::int AS "minPrice", count(DISTINCT h.id)::int AS hotels
    FROM "Room" r JOIN "RoomType" rt ON rt.id = r."roomTypeId" JOIN "Hotel" h ON h.id = r."hotelId"
    WHERE h.status = 'APPROVED' AND r.status = 'ACTIVE'
    GROUP BY h."destinationId"`;
  return new Map(rows.map((r) => [r.destinationId, r]));
}

import { z } from "zod";
import { HOTEL_TEMPLATES } from "./catalog-types";
import { defaultStay, parseDateOnly } from "./dates";
import { stayInput, VIEW_TYPES } from "./validation";
import type { SearchParams, SortKey } from "@/server/search";

const list = <T extends string>(allowed: readonly T[]) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter((x): x is T => (allowed as readonly string[]).includes(x)) : []));

const filterSchema = z.object({
  q: z.string().trim().max(80).optional(),
  destination: z.string().regex(/^[a-z0-9-]+$/).max(60).optional(),
  rooms: z.coerce.number().int().min(1).max(4).catch(1),
  views: list(VIEW_TYPES),
  types: list(HOTEL_TEMPLATES),
  amenities: z.string().optional().transform((v) => (v ? v.split(",").filter(Boolean).slice(0, 8) : [])),
  beds: list(["Queen", "Twin", "King", "King + Sofa bed"] as const),
  balcony: z.literal("1").optional(),
  corner: z.literal("1").optional(),
  accessible: z.literal("1").optional(),
  freeCancel: z.literal("1").optional(),
  minFloor: z.coerce.number().int().min(1).max(10).optional().catch(undefined),
  minSize: z.coerce.number().int().min(10).max(100).optional().catch(undefined),
  minRating: z.coerce.number().min(1).max(5).optional().catch(undefined),
  minStars: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  priceMin: z.coerce.number().int().min(0).max(100000).optional().catch(undefined),
  priceMax: z.coerce.number().int().min(0).max(100000).optional().catch(undefined),
  sort: z.enum(["recommended", "price_asc", "price_desc", "rating", "view", "reviews"]).catch("recommended"),
  page: z.coerce.number().int().min(1).max(100).catch(1),
});

export type RawParams = Record<string, string | string[] | undefined>;

/** Parse URL search params into validated search input. Invalid stays fall back to defaults with an error message. */
export function parseSearch(raw: RawParams) {
  const get = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : undefined);
  const fallback = defaultStay();
  const stayRaw = { checkIn: get("checkIn") ?? fallback.checkIn, checkOut: get("checkOut") ?? fallback.checkOut, guests: get("guests") ?? "2" };
  const stay = stayInput.safeParse(stayRaw);
  const f = filterSchema.parse(Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "string")));
  const s = stay.success ? stay.data : { ...fallback, guests: 2 };
  const params: SearchParams = {
    q: f.q || undefined,
    destinationSlug: f.destination,
    checkIn: parseDateOnly(s.checkIn)!,
    checkOut: parseDateOnly(s.checkOut)!,
    guests: Math.max(s.guests, f.rooms),
    rooms: f.rooms,
    views: f.views as SearchParams["views"],
    templates: f.types as SearchParams["templates"],
    amenities: f.amenities,
    bedTypes: f.beds,
    balcony: !!f.balcony,
    corner: !!f.corner,
    accessible: !!f.accessible,
    freeCancellation: !!f.freeCancel,
    minFloor: f.minFloor,
    minSize: f.minSize,
    minRating: f.minRating,
    minStars: f.minStars,
    priceMin: f.priceMin ? f.priceMin * 100 : undefined,
    priceMax: f.priceMax ? f.priceMax * 100 : undefined,
    sort: f.sort as SortKey,
    page: f.page,
  };
  return { params, stay: s, stayError: stay.success ? null : (stay.error.issues[0]?.message ?? "Invalid dates"), filters: f };
}

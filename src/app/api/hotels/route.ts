import { json, route } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { VIEW_TYPES, stayInput } from "@/lib/validation";
import { searchHotels } from "@/server/search";
import { z } from "zod";

const query = z.object({
  city: z.string().optional(),
  view: z.enum(VIEW_TYPES).optional(),
  minStars: z.coerce.number().int().min(1).max(5).optional(),
  balcony: z.enum(["1", "true"]).optional(),
  sort: z.enum(["price", "rating", "view"]).optional(),
});

export const GET = route(async (req) => {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const stay = stayInput.parse(params);
  const q = query.parse(params);
  const hotels = await searchHotels({
    city: q.city,
    checkIn: parseDateOnly(stay.checkIn)!,
    checkOut: parseDateOnly(stay.checkOut)!,
    guests: stay.guests,
    view: q.view,
    minStars: q.minStars,
    balcony: !!q.balcony,
    sort: q.sort,
  });
  return json({ hotels });
});

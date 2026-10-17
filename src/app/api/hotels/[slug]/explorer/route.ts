import { json, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { parseDateOnly } from "@/lib/dates";
import { stayInput } from "@/lib/validation";
import { getExplorerData, getHotelBySlug } from "@/server/hotels";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Floors, layout, rooms, live availability, pricing and primary photos for one stay. */
export const GET = route<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const stay = stayInput.parse(sp);
  const rooms = z.coerce.number().int().min(1).max(4).catch(1).parse(sp.rooms);
  const user = await getCurrentUser();
  const hotel = await getHotelBySlug((await params).slug, user);
  return json(await getExplorerData(hotel.id, parseDateOnly(stay.checkIn)!, parseDateOnly(stay.checkOut)!, stay.guests, rooms, user?.id));
});

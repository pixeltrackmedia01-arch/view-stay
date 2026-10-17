import { json, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { parseDateOnly } from "@/lib/dates";
import { stayInput } from "@/lib/validation";
import { getFloorMap, getHotelBySlug } from "@/server/hotels";

export const dynamic = "force-dynamic";

export const GET = route<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const { slug } = await params;
  const stay = stayInput.parse(Object.fromEntries(new URL(req.url).searchParams));
  const user = await getCurrentUser();
  const hotel = await getHotelBySlug(slug, user);
  const floors = await getFloorMap(hotel.id, parseDateOnly(stay.checkIn)!, parseDateOnly(stay.checkOut)!, stay.guests, user?.id);
  return json({ floors });
});

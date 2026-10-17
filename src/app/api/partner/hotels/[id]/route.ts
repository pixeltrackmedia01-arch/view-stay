import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { hotelProfileInput } from "@/lib/validation";
import { updateHotelProfile } from "@/server/partner";

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser("PARTNER", "ADMIN");
  const hotel = await updateHotelProfile(user, (await params).id, hotelProfileInput.parse(await readJson(req)));
  return json({ hotel: { id: hotel.id } });
});

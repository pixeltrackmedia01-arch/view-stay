import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { hotelCreateInput } from "@/lib/validation";
import { createHotel } from "@/server/partner";

/** Create a property from a layout template. It starts PENDING until an administrator approves it. */
export const POST = route(async (req) => {
  const user = await requireUser("PARTNER", "ADMIN");
  const hotel = await createHotel(user.id, hotelCreateInput.parse(await readJson(req)));
  return json({ hotel: { id: hotel.id, slug: hotel.slug, status: hotel.status } }, { status: 201 });
});

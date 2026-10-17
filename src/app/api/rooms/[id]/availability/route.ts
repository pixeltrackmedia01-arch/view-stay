import { json, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { parseDateOnly } from "@/lib/dates";
import { stayInput } from "@/lib/validation";
import { checkRoomForStay } from "@/server/rooms";

export const dynamic = "force-dynamic";

/** Is this exact room free for these dates? If not, returns labelled alternatives (never a silent swap). */
export const GET = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const stay = stayInput.parse(Object.fromEntries(new URL(req.url).searchParams));
  const user = await getCurrentUser();
  return json(await checkRoomForStay((await params).id, parseDateOnly(stay.checkIn)!, parseDateOnly(stay.checkOut)!, stay.guests, user?.id));
});

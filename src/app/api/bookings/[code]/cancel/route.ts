import { json, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { cancelBooking } from "@/server/bookings";

export const POST = route<{ params: Promise<{ code: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const b = await cancelBooking(user, (await params).code);
  return json({ booking: { code: b.code, status: b.status, refunded: b.refunded } });
});

import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { checkoutInput } from "@/lib/validation";
import { confirmBookingGroup } from "@/server/bookings";

export const GET = route(async () => {
  const user = await requireUser();
  const bookings = await db.booking.findMany({
    where: { userId: user.id },
    select: { code: true, groupCode: true, status: true, checkIn: true, checkOut: true, total: true, hotel: { select: { name: true, slug: true, city: true } }, room: { select: { id: true, number: true } } },
    orderBy: { checkIn: "desc" },
  });
  return json({ bookings });
});

/** Checkout: pay for and confirm the exact rooms in a hold group. Idempotent per hold group. */
export const POST = route(async (req) => {
  const user = await requireUser();
  rateLimit(`checkout:${user.id}`, 20, 10 * 60_000);
  const result = await confirmBookingGroup(user.id, checkoutInput.parse(await readJson(req)));
  return json(result, { status: result.replayed ? 200 : 201 });
});

import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkoutInput } from "@/lib/validation";
import { confirmBooking } from "@/server/bookings";

export const GET = route(async () => {
  const user = await requireUser();
  const bookings = await db.booking.findMany({
    where: { userId: user.id },
    include: { hotel: { select: { name: true, slug: true, city: true } }, room: { select: { number: true } } },
    orderBy: { checkIn: "desc" },
  });
  return json({ bookings });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const booking = await confirmBooking(user.id, checkoutInput.parse(await readJson(req)));
  return json({ booking: { code: booking.code, id: booking.id, total: booking.total } }, { status: 201 });
});

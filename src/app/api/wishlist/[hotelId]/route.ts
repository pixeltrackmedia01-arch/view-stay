import { json, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

type Ctx = { params: Promise<{ hotelId: string }> };

export const POST = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { hotelId } = await params;
  if (!(await db.hotel.findFirst({ where: { id: hotelId, status: "APPROVED" }, select: { id: true } }))) throw new AppError("NOT_FOUND", "Hotel not found");
  await db.wishlist.upsert({ where: { userId_hotelId: { userId: user.id, hotelId } }, create: { userId: user.id, hotelId }, update: {} });
  return json({ saved: true });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  await db.wishlist.deleteMany({ where: { userId: user.id, hotelId: (await params).hotelId } });
  return json({ saved: false });
});

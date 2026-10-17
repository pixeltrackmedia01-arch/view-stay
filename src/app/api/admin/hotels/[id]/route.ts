import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { setHotelStatus } from "@/server/admin";
import { z } from "zod";

const body = z.object({ status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]) });

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireUser("ADMIN");
  const { status } = body.parse(await readJson(req));
  const hotel = await setHotelStatus(admin.id, (await params).id, status);
  return json({ hotel: { id: hotel.id, status: hotel.status } });
});

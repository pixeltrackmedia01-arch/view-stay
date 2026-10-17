import { z } from "zod";
import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { setHotelFeatured, setHotelStatus } from "@/server/admin";

const input = z.object({ status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]).optional(), featured: z.boolean().optional() });

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireUser("ADMIN");
  const { id } = await params;
  const v = input.parse(await readJson(req));
  if (v.status) await setHotelStatus(admin.id, id, v.status);
  if (v.featured !== undefined) await setHotelFeatured(admin.id, id, v.featured);
  return json({ ok: true });
});

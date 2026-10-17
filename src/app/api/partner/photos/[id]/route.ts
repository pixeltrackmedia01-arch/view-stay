import { z } from "zod";
import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { removeRoomPhoto, updateRoomPhoto } from "@/server/partner";

const patch = z.object({
  alt: z.string().trim().min(5).max(160).optional(),
  caption: z.string().trim().max(200).nullable().optional(),
  category: z.enum(["ROOM_OVERVIEW", "SLEEPING_AREA", "WINDOW_VIEW", "BALCONY", "BATHROOM", "SEATING_AREA", "WORKSPACE", "SPECIAL_FEATURE"]).optional(),
  isPrimary: z.literal(true).optional(),
});

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser("PARTNER", "ADMIN");
  await updateRoomPhoto(user, (await params).id, patch.parse(await readJson(req)));
  return json({ ok: true });
});

export const DELETE = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser("PARTNER", "ADMIN");
  await removeRoomPhoto(user, (await params).id);
  return json({ ok: true });
});

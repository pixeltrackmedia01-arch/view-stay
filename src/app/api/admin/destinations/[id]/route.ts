import { z } from "zod";
import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { updateDestination } from "@/server/admin";

const input = z.object({
  tagline: z.string().trim().min(5).max(160).optional(),
  description: z.string().trim().min(20).max(2000).optional(),
  featured: z.boolean().optional(),
  attractions: z.array(z.string().trim().min(2).max(60)).max(12).optional(),
});

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireUser("ADMIN");
  await updateDestination(admin.id, (await params).id, input.parse(await readJson(req)));
  return json({ ok: true });
});

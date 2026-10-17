import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { setUserActive } from "@/server/admin";
import { z } from "zod";

const body = z.object({ isActive: z.boolean() });

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireUser("ADMIN");
  const { isActive } = body.parse(await readJson(req));
  return json({ user: await setUserActive(admin.id, (await params).id, isActive) });
});

import { z } from "zod";
import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { setUserActive } from "@/server/admin";

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireUser("ADMIN");
  const { isActive } = z.object({ isActive: z.boolean() }).parse(await readJson(req));
  return json({ user: await setUserActive(admin.id, (await params).id, isActive) });
});

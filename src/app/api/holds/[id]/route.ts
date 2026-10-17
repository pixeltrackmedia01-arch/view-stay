import { json, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { releaseHold } from "@/server/holds";

export const DELETE = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  await releaseHold(user.id, (await params).id);
  return json({ ok: true });
});

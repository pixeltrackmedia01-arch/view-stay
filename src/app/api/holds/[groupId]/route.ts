import { json, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { releaseHoldGroup } from "@/server/holds";

export const DELETE = route<{ params: Promise<{ groupId: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  await releaseHoldGroup(user.id, (await params).groupId);
  return json({ ok: true });
});

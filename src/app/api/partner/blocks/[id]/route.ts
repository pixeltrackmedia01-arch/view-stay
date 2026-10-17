import { json, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { removeRoomBlock } from "@/server/partner";

export const DELETE = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser("PARTNER", "ADMIN");
  await removeRoomBlock(user, (await params).id);
  return json({ ok: true });
});

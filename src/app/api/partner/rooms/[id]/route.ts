import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { roomUpdateInput } from "@/lib/validation";
import { updateRoom } from "@/server/partner";

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser("PARTNER", "ADMIN");
  const room = await updateRoom(user, (await params).id, roomUpdateInput.parse(await readJson(req)));
  return json({ room });
});

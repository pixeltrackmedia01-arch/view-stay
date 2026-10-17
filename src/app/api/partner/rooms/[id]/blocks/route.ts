import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { blockInput } from "@/lib/validation";
import { addRoomBlock } from "@/server/partner";

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser("PARTNER", "ADMIN");
  const block = await addRoomBlock(user, (await params).id, blockInput.parse(await readJson(req)));
  return json({ block }, { status: 201 });
});

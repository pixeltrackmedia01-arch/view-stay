import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { holdInput } from "@/lib/validation";
import { createHold } from "@/server/holds";

export const POST = route(async (req) => {
  const user = await requireUser();
  const hold = await createHold(user.id, holdInput.parse(await readJson(req)));
  return json({ hold }, { status: 201 });
});

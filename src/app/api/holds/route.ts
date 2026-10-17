import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { holdInput } from "@/lib/validation";
import { createHoldGroup } from "@/server/holds";

/** Hold one or more exact rooms for this user while they check out. */
export const POST = route(async (req) => {
  const user = await requireUser();
  rateLimit(`hold:${user.id}`, 30, 10 * 60_000);
  const hold = await createHoldGroup(user.id, holdInput.parse(await readJson(req)));
  return json({ hold }, { status: 201 });
});

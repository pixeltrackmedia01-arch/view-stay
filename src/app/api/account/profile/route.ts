import { json, readJson, route } from "@/lib/api";
import { createSessionCookie, requireUser } from "@/lib/auth";
import { profileInput } from "@/lib/validation";
import { updateProfile } from "@/server/users";

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const updated = await updateProfile(user.id, profileInput.parse(await readJson(req)));
  await createSessionCookie(updated);
  return json({ user: updated });
});

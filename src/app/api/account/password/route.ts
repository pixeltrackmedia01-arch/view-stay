import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { changePasswordInput } from "@/lib/validation";
import { changePassword } from "@/server/users";

export const POST = route(async (req) => {
  const user = await requireUser();
  rateLimit(`password:${user.id}:${clientKey(req)}`, 10, 15 * 60_000);
  const { currentPassword, newPassword } = changePasswordInput.parse(await readJson(req));
  await changePassword(user.id, currentPassword, newPassword);
  return json({ ok: true });
});

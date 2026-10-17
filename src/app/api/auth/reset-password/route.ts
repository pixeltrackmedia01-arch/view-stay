import { json, readJson, route } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { resetPasswordInput } from "@/lib/validation";
import { resetPassword } from "@/server/users";

export const POST = route(async (req) => {
  rateLimit(`reset:${clientKey(req)}`, 10, 15 * 60_000);
  const { token, password } = resetPasswordInput.parse(await readJson(req));
  await resetPassword(token, password);
  return json({ ok: true });
});

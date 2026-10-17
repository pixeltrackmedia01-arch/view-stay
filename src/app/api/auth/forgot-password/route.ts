import { json, readJson, route } from "@/lib/api";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { forgotPasswordInput } from "@/lib/validation";
import { requestPasswordReset } from "@/server/users";

export const POST = route(async (req) => {
  rateLimit(`forgot:${clientKey(req)}`, 5, 15 * 60_000);
  const { email } = forgotPasswordInput.parse(await readJson(req));
  await requestPasswordReset(email, new URL(req.url).origin);
  // Same response whether or not the account exists.
  return json({ ok: true });
});

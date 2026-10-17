import { json, readJson, route } from "@/lib/api";
import { createSessionCookie } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { loginInput } from "@/lib/validation";
import { authenticate } from "@/server/users";

export const POST = route(async (req) => {
  const input = loginInput.parse(await readJson(req));
  rateLimit(`login:${clientKey(req)}:${input.email}`, 10, 15 * 60_000);
  const user = await authenticate(input);
  await createSessionCookie(user);
  return json({ user });
});

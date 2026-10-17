import { json, readJson, route } from "@/lib/api";
import { createSessionCookie } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { registerInput } from "@/lib/validation";
import { registerUser } from "@/server/users";

export const POST = route(async (req) => {
  rateLimit(`register:${clientKey(req)}`, 10, 60 * 60_000);
  const user = await registerUser(registerInput.parse(await readJson(req)));
  await createSessionCookie(user);
  return json({ user }, { status: 201 });
});

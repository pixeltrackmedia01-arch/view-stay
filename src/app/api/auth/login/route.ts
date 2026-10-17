import { json, readJson, route } from "@/lib/api";
import { createSessionCookie } from "@/lib/auth";
import { loginInput } from "@/lib/validation";
import { authenticate } from "@/server/users";

export const POST = route(async (req) => {
  const user = await authenticate(loginInput.parse(await readJson(req)));
  await createSessionCookie(user);
  return json({ user });
});

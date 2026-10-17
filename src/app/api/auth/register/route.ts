import { json, readJson, route } from "@/lib/api";
import { createSessionCookie } from "@/lib/auth";
import { registerInput } from "@/lib/validation";
import { registerUser } from "@/server/users";

export const POST = route(async (req) => {
  const input = registerInput.parse(await readJson(req));
  const user = await registerUser(input);
  await createSessionCookie(user);
  return json({ user }, { status: 201 });
});

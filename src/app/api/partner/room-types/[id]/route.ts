import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { roomTypePriceInput } from "@/lib/validation";
import { updateRoomTypePrice } from "@/server/partner";

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser("PARTNER", "ADMIN");
  const { basePrice } = roomTypePriceInput.parse(await readJson(req));
  await updateRoomTypePrice(user, (await params).id, basePrice);
  return json({ ok: true });
});

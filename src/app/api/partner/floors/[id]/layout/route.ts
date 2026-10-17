import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { floorLayoutInput } from "@/lib/validation";
import { saveFloorLayout } from "@/server/partner";

/** Save the full room layout of one floor (validated server-side; rooms with booking history are retired, not deleted). */
export const PUT = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser("PARTNER", "ADMIN");
  return json(await saveFloorLayout(user, (await params).id, floorLayoutInput.parse(await readJson(req))));
});

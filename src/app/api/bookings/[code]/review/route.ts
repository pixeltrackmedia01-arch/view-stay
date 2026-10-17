import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { reviewInput } from "@/lib/validation";
import { addReview } from "@/server/bookings";

export const POST = route<{ params: Promise<{ code: string }> }>(async (req, { params }) => {
  const user = await requireUser();
  const { rating, comment } = reviewInput.parse(await readJson(req));
  return json({ review: await addReview(user.id, (await params).code, rating, comment) }, { status: 201 });
});

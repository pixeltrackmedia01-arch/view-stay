import { json, route } from "@/lib/api";
import { parseSearch } from "@/lib/search-params";
import { searchHotels } from "@/server/search";

export const dynamic = "force-dynamic";

/** Search API (same parser as the /search page). */
export const GET = route(async (req) => {
  const { params, stayError } = parseSearch(Object.fromEntries(new URL(req.url).searchParams));
  if (stayError) return json({ error: { code: "BAD_REQUEST", message: stayError } }, { status: 400 });
  return json(await searchHotels(params));
});

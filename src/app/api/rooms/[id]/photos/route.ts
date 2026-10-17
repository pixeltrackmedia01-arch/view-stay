import { json, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getRoomPhotos } from "@/server/rooms";

/** Photographs associated with one physical room, ordered, with populated categories only. */
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  return json(await getRoomPhotos((await params).id, await getCurrentUser()));
});

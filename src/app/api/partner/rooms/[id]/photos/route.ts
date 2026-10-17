import { z } from "zod";
import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { addUploadedRoomPhoto, reorderRoomPhotos } from "@/server/partner";
import { MAX_UPLOAD_BYTES, saveUpload } from "@/server/storage";

const ROOM_CATEGORIES = ["ROOM_OVERVIEW", "SLEEPING_AREA", "WINDOW_VIEW", "BALCONY", "BATHROOM", "SEATING_AREA", "WORKSPACE", "SPECIAL_FEATURE"] as const;
const meta = z.object({ category: z.enum(ROOM_CATEGORIES), alt: z.string().trim().min(5, "Describe the photo (5+ characters)").max(160) });

/** Upload one photo for a physical room (multipart: file, category, alt). Validated by content, not by extension. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser("PARTNER", "ADMIN");
  rateLimit(`upload:${user.id}`, 60, 10 * 60_000);
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_UPLOAD_BYTES + 64 * 1024) throw new AppError("PAYLOAD_TOO_LARGE", "Images must be 5 MB or smaller");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("BAD_REQUEST", "Choose an image to upload");
  const m = meta.parse({ category: form.get("category"), alt: form.get("alt") });
  const upload = await saveUpload(Buffer.from(await file.arrayBuffer()));
  const photo = await addUploadedRoomPhoto(user, (await params).id, upload, m);
  return json({ photo: { id: photo.id } }, { status: 201 });
});

export const PUT = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser("PARTNER", "ADMIN");
  const { order } = z.object({ order: z.array(z.string().min(1)).max(100) }).parse(await readJson(req));
  await reorderRoomPhotos(user, (await params).id, order);
  return json({ ok: true });
});

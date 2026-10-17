/**
 * Upload storage adapter. The default driver writes to local disk (UPLOAD_DIR) and files are served by
 * /media/uploads/[file]. Swap this module for an object-storage driver in production; callers only use
 * saveUpload/readUpload/deleteUpload.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/lib/errors";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const FILE_RE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

function uploadDir() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads");
}

export interface ImageInfo {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
  width: number;
  height: number;
}

/** Identify an image by its magic bytes (never by the client-supplied type) and read its dimensions. */
export function sniffImage(buf: Buffer): ImageInfo | null {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { mimeType: "image/png", ext: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X") return { mimeType: "image/webp", ext: "webp", width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    if (chunk === "VP8 ") return { mimeType: "image/webp", ext: "webp", width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { mimeType: "image/webp", ext: "webp", width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    return null;
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { mimeType: "image/jpeg", ext: "jpg", height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

export async function saveUpload(buf: Buffer) {
  if (buf.length > MAX_UPLOAD_BYTES) throw new AppError("PAYLOAD_TOO_LARGE", "Images must be 5 MB or smaller");
  const info = sniffImage(buf);
  if (!info) throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Upload a JPEG, PNG or WebP image");
  if (info.width < 400 || info.height < 300) throw new AppError("BAD_REQUEST", "Images must be at least 400 × 300 pixels");
  const name = `${randomUUID()}.${info.ext}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), name), buf, { flag: "wx" });
  return { path: `/media/uploads/${name}`, sizeBytes: buf.length, ...info };
}

export async function readUpload(name: string) {
  if (!FILE_RE.test(name)) return null;
  try {
    return await readFile(path.join(uploadDir(), name));
  } catch {
    return null;
  }
}

export async function deleteUpload(publicPath: string) {
  const name = publicPath.split("/").pop() ?? "";
  if (!FILE_RE.test(name)) return;
  await unlink(path.join(uploadDir(), name)).catch(() => undefined);
}

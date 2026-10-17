import { AppError } from "./errors";

/**
 * Small in-memory sliding-window limiter. Suitable for a single Node process; use a shared store
 * (e.g. Redis) when running several instances.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a moment and try again.");
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) buckets.delete(buckets.keys().next().value!);
}

export function clientKey(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

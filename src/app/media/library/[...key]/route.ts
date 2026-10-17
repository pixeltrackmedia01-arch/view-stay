import { resolveLibraryAsset, renderLibraryAsset } from "@/lib/media/library";

/** Serves the illustrative image library. Output is deterministic, so responses are cached immutably. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const joined = key.join("/");
  if (!joined.endsWith(".svg")) return new Response("Not found", { status: 404 });
  const asset = resolveLibraryAsset(joined.slice(0, -4));
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(renderLibraryAsset(asset), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

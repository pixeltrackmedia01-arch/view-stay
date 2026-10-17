import { json } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hotels = await db.hotel.count();
    return json({ ok: true, db: "up", hotels });
  } catch (e) {
    console.error("[health]", e);
    return json({ ok: false, db: "down" }, { status: 503 });
  }
}

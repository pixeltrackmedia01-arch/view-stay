import { db } from "@/lib/db";
import { seedDatabase } from "@/server/seed-data";

/** Optionally load demo data into an empty database at server start (SEED_ON_EMPTY=1, for hosted demos). */
export async function seedIfEmpty() {
  if (process.env.SEED_ON_EMPTY !== "1") return;
  try {
    // Hosts may boot several app processes at once; only one should seed.
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('viewstay:seed'))`;
        if ((await tx.hotel.count()) > 0) return;
        const counts = await seedDatabase(tx);
        console.log("[viewstay] seeded empty database", counts);
      },
      { timeout: 600_000, maxWait: 30_000 },
    );
  } catch (e) {
    console.error("[viewstay] seed on empty failed", e);
  }
}

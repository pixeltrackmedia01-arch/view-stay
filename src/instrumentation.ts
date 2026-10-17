/** On server start, optionally load demo data into an empty database (used for hosted demos). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.SEED_ON_EMPTY !== "1") return;
  const { db } = await import("@/lib/db");
  const { seedDatabase } = await import("@/server/seed-data");
  try {
    // Hosts may boot several app processes at once; only one should seed.
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('viewstay:seed'))`;
        if ((await tx.user.count()) > 0) return;
        const counts = await seedDatabase(tx);
        console.log("[viewstay] seeded empty database", counts);
      },
      { timeout: 300_000, maxWait: 30_000 },
    );
  } catch (e) {
    console.error("[viewstay] seed on empty failed", e);
  }
}

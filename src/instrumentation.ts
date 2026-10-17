/** On server start, optionally load demo data into an empty database (used for hosted demos). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.SEED_ON_EMPTY !== "1") return;
  const { db } = await import("@/lib/db");
  const { seedDatabase } = await import("@/server/seed-data");
  try {
    if ((await db.user.count()) > 0) return;
    const counts = await seedDatabase(db);
    console.log("[viewstay] seeded empty database", counts);
  } catch (e) {
    console.error("[viewstay] seed on empty failed", e);
  }
}

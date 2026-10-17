import { PrismaClient } from "@prisma/client";
import { SEED_PASSWORD, seedDatabase } from "../src/server/seed-data";

/**
 * Usage: `npm run db:seed` (idempotent: only adds missing demo records)
 *        `npm run db:seed -- --reset` (wipes ALL data first; local development only)
 */
const db = new PrismaClient();
const reset = process.argv.includes("--reset");

async function main() {
  const started = Date.now();
  const counts = await db.$transaction((tx) => seedDatabase(tx, { reset, log: (m) => console.log(`  ${m}`) }), { timeout: 600_000, maxWait: 30_000 });
  console.log("Seeded:", counts, `in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`Demo accounts (password ${SEED_PASSWORD}): customer@, guest@, partner@, partner2-8@, admin@viewstay.dev`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

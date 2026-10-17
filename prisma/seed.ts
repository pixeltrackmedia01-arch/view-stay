import { PrismaClient } from "@prisma/client";
import { SEED_PASSWORD, seedDatabase } from "../src/server/seed-data";

const db = new PrismaClient();

seedDatabase(db, { reset: true })
  .then((counts) => {
    console.log("Seeded:", counts);
    console.log(`Demo accounts (password ${SEED_PASSWORD}): customer@, partner@, partner2@, admin@viewstay.dev`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

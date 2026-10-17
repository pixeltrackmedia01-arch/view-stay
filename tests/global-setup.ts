import { execSync } from "node:child_process";

/** Bring the dedicated test database up to date and load fresh fixture data once per run. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/viewstay_test";
  if (!/viewstay_test|_test\b/.test(url)) throw new Error("Refusing to seed a non-test database");
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "inherit" });
}

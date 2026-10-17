import "server-only";
import { db } from "./db";

export async function destinationOptions() {
  return db.destination.findMany({ select: { slug: true, name: true, state: true }, orderBy: { name: "asc" } });
}

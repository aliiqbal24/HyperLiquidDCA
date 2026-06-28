import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let db: Database | null = null;

export function getDb(): Database {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the HypeDCA cloud API.");
  }
  if (!db) {
    db = drizzle(neon(process.env.DATABASE_URL), { schema });
  }
  return db;
}

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let database: ReturnType<typeof createDatabase> | null = null;

export function getDb() {
  database ??= createDatabase();
  return database;
}

function createDatabase() {
  const connectionString =
    process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Postgres is unavailable. Set POSTGRES_URL or DATABASE_URL.",
    );
  }

  const client = postgres(connectionString, { max: 1, prepare: false });
  return drizzle(client, { schema });
}

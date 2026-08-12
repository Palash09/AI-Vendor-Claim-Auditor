import { getConnectionString } from "@netlify/database";
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
    process.env.NETLIFY_DB_URL ??
    process.env.DATABASE_URL ??
    getConnectionString();
  if (!connectionString) {
    throw new Error(
      "Netlify Database is unavailable. Run through `netlify dev` or set NETLIFY_DB_URL for local development.",
    );
  }

  const client = postgres(connectionString, { max: 1, prepare: false });
  return drizzle(client, { schema });
}

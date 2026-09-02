import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set POSTGRES_URL or DATABASE_URL before running migrations.");
}

const migrationsDirectory = path.join(process.cwd(), "db", "migrations");
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

const sql = postgres(connectionString, { max: 1, prepare: false });

try {
  await sql.begin(async (transaction) => {
    await transaction`SELECT pg_advisory_xact_lock(hashtext('ai-vendor-claim-auditor-migrations'))`;
    await transaction`
      CREATE TABLE IF NOT EXISTS app_schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    for (const file of migrationFiles) {
      const [existing] = await transaction`
        SELECT version FROM app_schema_migrations WHERE version = ${file}
      `;
      if (existing) continue;

      const migration = await readFile(
        path.join(migrationsDirectory, file),
        "utf8",
      );
      await transaction.unsafe(migration);
      await transaction`
        INSERT INTO app_schema_migrations (version) VALUES (${file})
      `;
      process.stdout.write(`Applied ${file}\n`);
    }
  });
} finally {
  await sql.end();
}

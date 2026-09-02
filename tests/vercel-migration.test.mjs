import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, projectRoot), "utf8");
}

test("uses portable Postgres and private Vercel Blob storage", async () => {
  const [database, evidenceStorage, packageJson, envExample] =
    await Promise.all([
      read("db/index.ts"),
      read("lib/evidence-storage.ts"),
      read("package.json"),
      read(".env.example"),
    ]);

  assert.match(database, /POSTGRES_URL/);
  assert.match(database, /DATABASE_URL/);
  assert.doesNotMatch(database, /NETLIFY_DB_URL|@netlify\/database/);

  assert.match(evidenceStorage, /from "@vercel\/blob"/);
  assert.match(evidenceStorage, /access: "private"/);
  assert.match(evidenceStorage, /\bput\(/);
  assert.match(evidenceStorage, /\bget\(/);
  assert.match(evidenceStorage, /\bdel\(/);

  assert.doesNotMatch(packageJson, /@netlify\/(?:blobs|database)/);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_(?:POSTGRES|BLOB)/);
});

test("tracks explicit migrations and Vercel function limits", async () => {
  const [vercelConfig, migrateScript, initialMigration, usageMigration] =
    await Promise.all([
      read("vercel.json"),
      read("scripts/migrate.mjs"),
      read("db/migrations/0001_initial.sql"),
      read("db/migrations/0002_analysis_usage_limits.sql"),
    ]);

  assert.match(vercelConfig, /"framework": "nextjs"/);
  assert.match(vercelConfig, /"maxDuration": 60/);
  assert.match(migrateScript, /app_schema_migrations/);
  assert.match(migrateScript, /pg_advisory_xact_lock/);
  assert.match(initialMigration, /CREATE TABLE IF NOT EXISTS audits/);
  assert.match(usageMigration, /CREATE TABLE IF NOT EXISTS analysis_runs/);
});

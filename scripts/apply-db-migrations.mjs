import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const migrations = ["001_usgs_evidence.sql", "002_usgs_recovery.sql"];
const client = new Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  for (const name of migrations) {
    const migration = fileURLToPath(new URL(`../db/migrations/${name}`, import.meta.url));
    await client.query(await readFile(migration, "utf8"));
  }
  process.stdout.write("USGS evidence and recovery migrations applied. Collection remains disabled by default.\n");
} finally {
  await client.end().catch(() => {});
}

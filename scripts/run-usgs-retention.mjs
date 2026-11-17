import { Client } from "pg";
import { cleanupUsgsRetention } from "../src/ingestion/usgs-retention.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const databaseUrl = new URL(process.env.DATABASE_URL);
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(databaseUrl.hostname)) {
  throw new Error("Retention runner requires a loopback-only test database");
}
const execute = process.argv.includes("--execute");
const limitAt = process.argv.indexOf("--limit");
const batchLimit = limitAt >= 0 ? Number(process.argv[limitAt + 1]) : 100;
const client = new Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const database = (await client.query("SELECT current_database() AS name")).rows[0].name;
  if (!/^live_map_test_[a-z0-9_]+$/.test(database)) throw new Error("Retention runner requires a live_map_test_* database");
  if (execute && process.env.LIVE_MAP_TEST_RETENTION !== "true") throw new Error("Execution requires LIVE_MAP_TEST_RETENTION=true");
  const result = await cleanupUsgsRetention(client, { batchLimit, execute });
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  await client.end().catch(() => {});
}

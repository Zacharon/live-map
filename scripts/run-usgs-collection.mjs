import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Client } from "pg";
import { runUsgsCollectionJob } from "../src/ingestion/usgs-job.js";
import { dispatchUsgsOutbox } from "../src/ingestion/usgs-outbox.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const fixtureIndex = process.argv.indexOf("--fixture");
const fixturePath = fixtureIndex >= 0 ? process.argv[fixtureIndex + 1] : null;
if (!fixturePath && process.argv.includes("--live") !== true) throw new Error("Pass --fixture <path> or --live");
if (!fixturePath && process.env.LIVE_MAP_INGEST_USGS !== "true") throw new Error("Live collection is disabled");
const fixtureBytes = fixturePath ? await readFile(fixturePath) : null;
const feed = fixtureBytes ? JSON.parse(fixtureBytes.toString("utf8")) : null;
const jobId = fixtureBytes
  ? `usgs:fixture:${createHash("sha256").update(fixtureBytes).digest("hex").slice(0, 32)}`
  : `usgs:manual:${Date.now()}`;
const client = new Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const result = await runUsgsCollectionJob(client, { jobId, feed });
  const changes = await dispatchUsgsOutbox(client);
  process.stdout.write(`${JSON.stringify({ ...result, changes })}\n`);
} finally {
  await client.end().catch(() => {});
}

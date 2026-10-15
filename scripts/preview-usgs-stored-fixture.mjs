// Loopback-only synthetic stored-data acceptance server. Never a production entry point.
import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { commitUsgsFeed } from "../src/ingestion/usgs-pipeline.js";
import { dispatchUsgsOutbox } from "../src/ingestion/usgs-outbox.js";
import { createEventsResponse } from "../src/api/events-response.js";
import { createChangesResponse } from "../src/api/changes-response.js";
import { EVENT_PROVIDERS } from "../src/data/providers/registry.js";

const root = process.cwd();
const port = Number(process.env.LIVE_MAP_STORED_PREVIEW_PORT || 8877);
const db = await PGlite.create({ extensions: { postgis } });
for (const name of ["001_usgs_evidence.sql", "002_usgs_recovery.sql"]) {
  await db.exec(await readFile(new URL(`../db/migrations/${name}`, import.meta.url), "utf8"));
}
await db.query("UPDATE lm_source_policies SET collection_enabled = true WHERE source_id = 'usgs'");
const startedAt = Date.now() - 5 * 60000;
let updatedAt = Date.now() - 2 * 60000;
let magnitude = 7;
let apiOutage = false;
const requests = [];
const noNetwork = EVENT_PROVIDERS.filter((provider) => provider.id !== "usgs").map((provider) => ({
  providerId: provider.id, status: "unavailable", events: [], fetchedAt: new Date().toISOString(), cached: false, stale: false,
}));
function fixture() {
  return { type: "FeatureCollection", features: [{ type: "Feature", id: "synthetic-usgs-stored-1",
    properties: { mag: magnitude, time: startedAt, updated: updatedAt, status: "automatic",
      title: `SYNTHETIC stored earthquake M ${magnitude}`, place: "Synthetic fixture location" },
    geometry: { type: "Point", coordinates: [10, 20, 5] } }] };
}
await commitUsgsFeed(db, { jobId: "usgs:synthetic:initial", feed: fixture(), retrievedAt: new Date() });
await dispatchUsgsOutbox(db);

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json", ".wasm": "application/wasm",
  ".txt": "text/plain", ".xml": "application/xml", ".ico": "image/x-icon", ".webp": "image/webp" };
const allowed = /^\/(?:(?:index|404|source-explorer|countries|diagnostics|about)\.html|[a-z0-9-]+\.(?:css|js|txt|xml|svg|ico|png|webp)|(?:src|vendor|data)\/[a-z0-9_./-]+)$/i;
const csp = "default-src 'self'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://server.arcgisonline.com https://services.arcgisonline.com; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'";
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  requests.push({ path: url.pathname, at: new Date().toISOString() });
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", csp);
  try {
    if (url.pathname === "/__test__/status" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ synthetic: true, apiOutage, magnitude, requests })); return;
    }
    if (url.pathname === "/__test__/correct" && req.method === "POST") {
      magnitude = 8; updatedAt = Date.now();
      await commitUsgsFeed(db, { jobId: "usgs:synthetic:corrected", feed: fixture(), retrievedAt: new Date() });
      await dispatchUsgsOutbox(db);
      res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ synthetic: true, magnitude })); return;
    }
    if (url.pathname === "/__test__/api-outage" && req.method === "POST") {
      apiOutage = url.searchParams.get("on") === "1";
      res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ apiOutage })); return;
    }
    if (url.pathname === "/api/events" || url.pathname === "/api/changes") {
      const response = apiOutage
        ? Response.json({ error: "synthetic-api-outage" }, { status: 503 })
        : url.pathname === "/api/events"
          ? await createEventsResponse(new Request(url, { method: req.method }), { usgsDb: db, now: Date.now(), providerResultsOverride: noNetwork })
          : await createChangesResponse(new Request(url, { method: req.method }), { db });
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text()); return;
    }
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/__test__/")) {
      res.writeHead(404, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "not-found" })); return;
    }
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    if (!allowed.test(requested) || requested.includes("..")) { res.writeHead(404); res.end("Not found"); return; }
    const file = path.resolve(root, `.${requested}`);
    if (!file.startsWith(root + path.sep)) { res.writeHead(404); res.end("Not found"); return; }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" }); res.end(body);
  } catch {
    res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "preview-failed" }));
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Synthetic stored preview: http://127.0.0.1:${port}/`));
process.on("SIGINT", async () => { server.close(); await db.close(); });

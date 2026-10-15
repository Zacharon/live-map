import { USGS_FEED_URL } from "../data/providers/usgs.js";
import { commitUsgsFeed, markUsgsCollectionFailure } from "./usgs-pipeline.js";

const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

export async function fetchUsgsSnapshot(fetchImpl = fetch, { timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(USGS_FEED_URL, {
      signal: controller.signal,
      redirect: "error",
      headers: { accept: "application/geo+json, application/json" },
    });
    if (!response.ok) throw new Error("USGS fetch failed");
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) throw new Error("USGS response too large");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("USGS response body missing");
    const chunks = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("USGS response too large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder().decode(bytes)); }
    catch { throw new Error("USGS response invalid JSON"); }
  } finally {
    clearTimeout(timeout);
  }
}

export async function runUsgsCollectionJob(db, { jobId, feed, fetchImpl, now = new Date() }) {
  if (!/^[a-zA-Z0-9:_-]{1,160}$/.test(String(jobId || ""))) throw new Error("jobId must be a bounded stable key");
  const policy = await db.query("SELECT collection_enabled FROM lm_source_policies WHERE source_id = $1", ["usgs"]);
  if (policy.rows[0]?.collection_enabled !== true) throw new Error("USGS collection policy is disabled");
  const committed = await db.query("SELECT job_id FROM lm_collection_runs WHERE job_id = $1", [jobId]);
  if (committed.rows.length) return { status: "duplicate-job", acceptedCount: 0, rejectedCount: 0, newRevisionCount: 0 };
  const attemptedAt = new Date(now);
  let fetchedFeed = feed;
  try {
    if (fetchedFeed == null) fetchedFeed = await fetchUsgsSnapshot(fetchImpl);
    return await commitUsgsFeed(db, { jobId, feed: fetchedFeed, retrievedAt: attemptedAt, processedAt: attemptedAt });
  } catch (error) {
    const errorCode = fetchedFeed == null ? "fetch-failed" : /feed|record|timestamp|feature/i.test(error.message) ? "invalid-feed" : "database-failed";
    try { await markUsgsCollectionFailure(db, { attemptedAt, errorCode }); } catch { /* Database may itself be unavailable. */ }
    throw error;
  }
}

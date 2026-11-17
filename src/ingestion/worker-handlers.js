export async function enqueueDueUsgs(controller, env) {
  if (env?.LIVE_MAP_INGEST_USGS !== "true" || !env.USGS_COLLECTION_QUEUE) return;
  const scheduledTime = Number(controller?.scheduledTime);
  if (!Number.isFinite(scheduledTime)) return;
  const slot = Math.floor(scheduledTime / 60000);
  await env.USGS_COLLECTION_QUEUE.send({ kind: "collect-usgs", jobId: `usgs:scheduled:${slot}` });
}

export async function consumeUsgsJobs(batch, env) {
  for (const message of batch.messages || []) {
    const body = message.body;
    if (env?.LIVE_MAP_INGEST_USGS !== "true" || body?.kind !== "collect-usgs" ||
        !/^usgs:scheduled:\d+$/.test(String(body.jobId || ""))) {
      message.ack();
      continue;
    }
    const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;
    if (!connectionString) { message.retry(); continue; }
    let client;
    try {
      const pg = await import("pg");
      const { runUsgsCollectionJob } = await import("./usgs-job.js");
      const { dispatchUsgsOutbox } = await import("./usgs-outbox.js");
      const Client = pg.Client || pg.default.Client;
      client = new Client({ connectionString });
      await client.connect();
      await runUsgsCollectionJob(client, { jobId: body.jobId });
      await dispatchUsgsOutbox(client);
      message.ack();
    } catch {
      message.retry();
    } finally {
      await client?.end().catch(() => {});
    }
  }
}

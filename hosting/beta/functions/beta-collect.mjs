import { collectSources } from '../../../src/beta/snapshot-service.js';
import { snapshotStorage } from './lib/storage.mjs';
import { collectElements } from '../../../src/beta/satellite-service.js';
import seed from './lib/stations-seed.json' with { type:'json' };
export default async function collect(){
  // This identifies the handler, not proof of automatic scheduler execution.
  // CLI invocations run this same handler; scheduled execution is verified
  // separately from an uninvoked hosted cache refresh.
  const [result,satellites]=await Promise.all([collectSources(snapshotStorage(),{trigger:'scheduled-handler'}),collectElements(snapshotStorage(),{seed})]);
  result.celestrak=satellites;
  console.log(JSON.stringify({collector:'public-beta',at:new Date().toISOString(),result}));
}
export const config={schedule:'*/5 * * * *'};

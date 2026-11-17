import assert from 'node:assert/strict';
import { renderClusterDetailDrawer, renderEventDetailDrawer } from '../src/ui/osint-dashboard-v2/event-detail-drawer.js';

const empty = renderClusterDetailDrawer(null);
assert.match(empty, /Select a cluster/);
const html = renderClusterDetailDrawer({
  id: 'test', events: [], sources: [], severity: 'low',
  domainLabel: 'Earthquakes', attentionLabel: 'Inspect', locationLabel: 'Unknown',
  eventCount: 0, sourceCount: 0,
});
assert.match(html, /Related cluster/);
assert.doesNotMatch(html, /data-event-evidence/);
assert.equal(typeof renderEventDetailDrawer, 'function');
console.log('Cluster drawer null and non-null regressions PASS');

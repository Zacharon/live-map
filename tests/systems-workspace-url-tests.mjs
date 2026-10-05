import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectedFromUrl, workspaceUrl } from '../src/candidates/intelligence-workbench/application/workspace-url.js';
test('Reload carries full source identity, including encoded provider IDs', () => {
  const selected={source:'usgs',kind:'event',id:'us/abc:123'};
  const url=new URL(workspaceUrl('http://localhost/?keep=1',{layout:'systems',view:'leaflet',selected}));
  assert.deepEqual(selectedFromUrl(url.searchParams),selected);
  assert.equal(url.searchParams.get('view'),'leaflet');assert.equal(url.searchParams.get('keep'),'1');
});
test('Matching source IDs in different providers stay distinct', () => {
  const first={source:'usgs',kind:'event',id:'same'};
  const next={...first,source:'nws'};
  assert.notDeepEqual(selectedFromUrl(new URL(workspaceUrl('http://localhost/',{layout:'systems',view:'globe',selected:first})).searchParams),next);
});
test('Clearing selection removes the complete persisted reference', () => {
  const url=new URL(workspaceUrl('http://localhost/?selected=old&selectedSource=usgs&selectedKind=event',{layout:'ledger',view:'globe',selected:null}));
  assert.equal(selectedFromUrl(url.searchParams),null);assert.equal(url.searchParams.has('selected'),false);
});
test('Incomplete, invalid and overlong URL references cannot select a record', () => {
  for(const query of ['selected=legacy','selected=a&selectedSource=usgs&selectedKind=entity',`selected=${'a'.repeat(160)}&selectedSource=usgs&selectedKind=event`])assert.equal(selectedFromUrl(new URLSearchParams(query)),null);
});

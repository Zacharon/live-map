import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCaseFile } from "../src/intelligence/case-io.js";
import { eventsFromCisaFrozen, eventsFromNhcXml } from "../src/data/snapshots/public-source-snapshots.js";
import { normalizeCisaKevItem } from "../src/data/providers/cisa-kev.js";

const kev = JSON.parse(readFileSync("data/development-fixtures/cisa-kev-frozen.json", "utf8"));
const xml = readFileSync("data/development-fixtures/nhc-twoat-frozen.xml", "utf8");

assert.equal(kev.live, false);
assert.equal(kev.providerEnabled, false);
assert.equal(kev.vulnerabilities.length, 5);
assert.ok(kev.catalogCount >= 5);
const first = normalizeCisaKevItem(kev.vulnerabilities[0]);
assert.ok(first.event);
assert.equal(first.event.geographic, false);
assert.equal(first.event.lat == null || Number.isNaN(first.event.lat), true);
assert.ok(first.event.metadata.dateAdded || first.event.sourcePublishedAt);
const kevEvents = eventsFromCisaFrozen(kev);
assert.equal(kevEvents.events.length, 5);
assert.equal(kevEvents.live, false);

const nhc = eventsFromNhcXml(xml);
assert.equal(nhc.live, false);
assert.ok(Array.isArray(nhc.events));
for (const event of nhc.events) {
  assert.equal(event.forecastNotObservation, true);
  assert.equal(event.geographic, false);
}

const malicious = readFileSync("data/development-fixtures/malicious-import-sample.json", "utf8");
const parsed = parseCaseFile(malicious);
if (parsed.ok) {
  assert.notEqual(parsed.caseObject.assessments?.[0]?.extra?.reviewState, "reviewed");
} else {
  assert.ok(parsed.errors.length);
}

console.log("public-source-snapshot-tests: ok");

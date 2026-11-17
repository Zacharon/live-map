/** Agent adapter: same parser and inspection command as the ordinary UI. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseCaseFile } from '../../src/intelligence/case-io.js';
import { inspectGrayZoneMaritime, GRAY_ZONE_CAPABILITY } from '../../src/intelligence/gray-zone-maritime.js';
const target = process.argv[2] || 'data/development-fixtures/gray-zone-maritime-taiwan-2026-08.json';
const bytes = readFileSync(target);
const parsed = parseCaseFile(bytes.toString('utf8'));
const result = parsed.ok ? inspectGrayZoneMaritime(parsed.caseObject) : parsed;
console.log(JSON.stringify({ receipt: { ...(result.receipt || {}), capability: GRAY_ZONE_CAPABILITY, operation: 'inspect', targetSha256: createHash('sha256').update(bytes).digest('hex'),
  targetCaseId: parsed.caseObject?.id || null, safeInputSummary: {byteLength:bytes.length, schema:'workbench-v1', classification:'public-safe historical reporting'},
  actor: 'unauthenticated-local-process', representedUser:null, delegation:'none', authority: 'read-only public-safe fixture; no approval privileges', beforeRevision: null, afterRevision: null,
  effect: 'none', outcome: result.ok ? 'inspected' : 'rejected', recovery: 'repeat inspection of the same immutable bytes' }, result }, null, 2));
if (!result.ok) process.exitCode = 1;

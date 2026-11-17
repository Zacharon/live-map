import { readFileSync, writeFileSync } from 'node:fs';
const root=JSON.parse(readFileSync('data/development-fixtures/gray-zone-maritime-taiwan-2026-08.json','utf8'));
const lost=structuredClone(root); lost.case.sources[0].availability='unavailable';
writeFileSync('outputs/gray-zone-maritime-20261011/source-loss-case.json',JSON.stringify(lost,null,2));
const invalid=structuredClone(root); invalid.case.evidence[0].valueOrigin='observed';
writeFileSync('outputs/gray-zone-maritime-20261011/rejected-observation-case.json',JSON.stringify(invalid,null,2));

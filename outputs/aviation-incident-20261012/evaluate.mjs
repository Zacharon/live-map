/** Structured agent adapter: shared application parser/inspection; no writes. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {parseCaseFile} from '../../src/intelligence/case-io.js';
import {inspectAviationIncident} from '../../src/intelligence/aviation-incident.js';
const input=process.argv[2]||'data/development-fixtures/aviation-riyadh-2026-10.json';
const bytes=fs.readFileSync(input), parsed=parseCaseFile(bytes.toString('utf8'));
if(!parsed.ok){console.log(JSON.stringify({ok:false,errors:parsed.errors}));process.exitCode=2;}
else {const result=inspectAviationIncident(parsed.caseObject);console.log(JSON.stringify({inputSha256:crypto.createHash('sha256').update(bytes).digest('hex'),...result},null,2));if(!result.ok)process.exitCode=2;}

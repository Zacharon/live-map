import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const root=process.cwd();
const out=path.join(root,'outputs/gray-zone-maritime-20261011');
const canonical='C:/Users/zacha/Workspace/20_Products/Live_Map';
const py='C:/Users/zacha/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const rationale='C:/Users/zacha/Workspace/40_Knowledge/Obsidian_Vault/09_TOOLS/agent_runner_v1/unified_handoff/code_rationale.py';
const baselineSha='a548e6bcebe3a9e1e6189ef868a43d09a8502d3e62489edd4ea16fdce99af73b';
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const save=(name,data)=>writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');
const commandArgs=['--root',root,'--baseline',path.join(out,'rationale-baseline.json'),'--baseline-sha256',baselineSha];
const delta=JSON.parse(execFileSync(py,['-B',rationale,'changes',...commandArgs],{encoding:'utf8'}));
save('changes.json',delta);
const authored=JSON.parse(readFileSync(path.join(out,'authored-baseline.json'),'utf8'));
const preservation=authored.map(item=>({path:item.path,before:item.sha256,after:existsSync(path.join(canonical,item.path))?sha(path.join(canonical,item.path)):null}));
const differences=preservation.filter(item=>item.before!==item.after);
const git='C:/Program Files/Git/cmd/git.exe';
const status=execFileSync(git,['-c',`safe.directory=${canonical}`,'-C',canonical,'status','--short'],{encoding:'utf8'});
writeFileSync(path.join(out,'canonical-status-after.txt'),status);
const beforeStatus=readFileSync(path.join(out,'canonical-status-before.txt'),'utf8').replace(/^\uFEFF/,'').replace(/\r/g,'').trimEnd();
save('preservation.json',{checkedPaths:authored.length,canonicalHashDifferences:differences,canonicalStatusUnchanged:beforeStatus===status.replace(/\r/g,'').trimEnd(),taskDeltaPaths:delta.changes.map(item=>item.path)});
const applicationReferences=[
  ['data/development-fixtures/gray-zone-maritime-taiwan-2026-08.json','fixtureType'],
  ['src/intelligence/gray-zone-maritime.js','inspectGrayZoneMaritime'],
  ['src/intelligence/case-io.js','validateGrayZoneMaritime'],
  ['src/ui/evidence-detail.js','historicalReporting'],
  ['src/ui/investigation-workbench.js','grayConclusions'],
  ['src/app-controller.js','investigationLoadGeneration'],
  ['tests/gray-zone-maritime-tests.mjs','33 adversarial imports'],
  ['docs/LAST_30_DAYS.md','gray-zone-maritime.inspect/v1'],
  ['docs/NEXT_TASK_QUEUE.md','Gray-zone maritime candidate review']
];
const entries=[
  {paths:delta.changes.map(item=>item.path),disposition:'documented',
   why:'Preserve sighting, inference and attributed purpose as three unestablished historical-report conclusions in the existing workbench.',
   where_to_edit:'Fixture metadata; gray-zone-maritime validate/inspect; case-io parser seam; evidence-detail inspector; investigation-workbench controls/receipt; app-controller case loading/selection; focused tests and candidate-local context docs.',
   constraints:'No exact occurrence/time, geometry, MMSI/IMO, mission, hostile intent, independent corroboration or operational assessment. Source loss gives unknown. Anonymous read-only command grants no approval. Preserve actual dirty baseline and release gates.',
   verification:'New 33-negative semantic suite, including H3-reproduced malformed structure faults, history/parked list faults, relationship provenance, typed origin counts and source reliability; five maritime suites, direct selection, syntax/Cloudflare checks, final offline validator, actual browser selection/reload/mobile/import/export; CLI revalidated downloaded bytes and same read receipt.',
   references:applicationReferences.map(([file,contains])=>({path:file,sha256:sha(path.join(root,file)),contains}))}
];
const record={task_id:'gray-zone-maritime-20261011',baseline_sha256:baselineSha,changes_sha256:delta.changes_sha256,entries};
let report=readFileSync(path.join(out,'REPORT.md'),'utf8');
const fence='```code-rationale\n'+JSON.stringify(record,null,2)+'\n```';
report=report.includes('{{CODE_RATIONALE}}')?report.replace('{{CODE_RATIONALE}}',fence):report.replace(/```code-rationale\n[\s\S]*?\n```/,fence);
writeFileSync(path.join(out,'REPORT.md'),report);
const check=JSON.parse(execFileSync(py,['-B',rationale,'check',...commandArgs,'--report',path.join(out,'REPORT.md')],{encoding:'utf8'}));
save('rationale-check.json',check);
for (const [input,name] of [['data/development-fixtures/gray-zone-maritime-taiwan-2026-08.json','agent-receipt.json'],['outputs/gray-zone-maritime-20261011/browser-export.json','browser-export-receipt.json']]) {
  const value=JSON.parse(execFileSync(process.execPath,['outputs/gray-zone-maritime-20261011/evaluate.mjs',input],{encoding:'utf8'}));
  save(name,value);
}
const receipts=['agent-receipt.json','browser-export-receipt.json'].map(file=>JSON.parse(readFileSync(path.join(out,file),'utf8')));
save('parity.json',{conclusionsEqual:JSON.stringify(receipts[0].result.conclusions)===JSON.stringify(receipts[1].result.conclusions),sharedReceiptEqual:JSON.stringify(receipts[0].result.receipt)===JSON.stringify(receipts[1].result.receipt),browserObservedFingerprint:'fnv1a:d007b040',fixtureFingerprint:receipts[0].result.receipt.inputFingerprint,exportFingerprint:receipts[1].result.receipt.inputFingerprint});
save('frozen-manifest.json',{frozenAt:new Date().toISOString(),head:'1640bed51a76fb916f570d755bf5e576ccc36646',baselineSha256:baselineSha,changesSha256:delta.changes_sha256,files:delta.changes.map(item=>({path:item.path,sha256:item.after}))});
console.log(JSON.stringify({deltaPaths:delta.changes.length,preservationDifferences:differences.length,statusUnchanged:beforeStatus===status.replace(/\r/g,'').trimEnd(),coverage:check.result,parity:JSON.stringify(receipts[0].result)===JSON.stringify(receipts[1].result)},null,2));

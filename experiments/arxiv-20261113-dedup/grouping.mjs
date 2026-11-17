import {distanceKm} from '../../src/events/event-deduplication.js';
import {timestampMs,validCoordinates} from '../../src/events/value-semantics.js';
export const policy=Object.freeze({version:'lexical-candidate-v1',match:0.82,abstain:0.74,maxHours:6,edgeHours:5,maxKm:35,edgeKm:30});
import {baseline} from './baseline-adapter.mjs';
export function canonicalUrl(s){try{const u=new URL(s);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/.test(k))u.searchParams.delete(k);u.searchParams.sort();return u.href;}catch{return null;}}
const words=s=>new Set(String(s||'').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
export function lexicalCosine(a,b){const x=words(a.title),y=words(b.title);return x.size&&y.size?[...x].filter(w=>y.has(w)).length/Math.sqrt(x.size*y.size):0;}
// Optional offline adapter: callers supply already loaded vectors and reviewed metadata.
// No API, downloader or encoder is constructed here. This interface is NOT semantic evidence.
export function embeddingAdapter({vectors,license,modelId}){
 if(!license||!modelId||!vectors)throw Error('Reviewed license, modelId and local vectors required');
 return {kind:'local-embedding',modelId,license,similarity(a,b){const x=vectors[a.id],y=vectors[b.id];if(!x||!y||!x.length||x.length!==y.length||![...x,...y].every(Number.isFinite))throw Error('Invalid local vectors');const norm=v=>Math.sqrt(v.reduce((s,n)=>s+n*n,0));if(!norm(x)||!norm(y))throw Error('Zero vector');return x.reduce((s,n,i)=>s+n*y[i],0)/(norm(x)*norm(y));}};
}
export function candidate(a,b,adapter=null){
 const reasons=[];const decide=(state,reason,score=null)=>({state,reasons:[...reasons,reason],score});
 const ua=canonicalUrl(a.canonicalUrl||a.sourceUrl),ub=canonicalUrl(b.canonicalUrl||b.sourceUrl);
 const exact=ua&&ua===ub;const sameId=a.provider&&a.provider===b.provider&&a.providerEventId&&a.providerEventId===b.providerEventId;
 const family=(a.sourceOrganizationId&&a.sourceOrganizationId===b.sourceOrganizationId)||(a.syndication&&a.syndication===b.syndication);
 if(exact)reasons.push('same-canonical-url');if(sameId)reasons.push('same-provider-event-id');if(family)reasons.push('same-declared-family; no extra corroboration');
 if(!a.category||!b.category)return decide('abstain','category-unknown');
 if(a.category!==b.category)return decide('separate','category-conflict');
 const ta=timestampMs(a.startedAt),tb=timestampMs(b.startedAt);
 if(ta===null||tb===null)return decide('abstain','occurrence-time-unknown');
 const hours=Math.abs(ta-tb)/3600000;if(hours>policy.maxHours)return decide('separate','time-outside-window');
 if(!validCoordinates(a.latitude,a.longitude)||!validCoordinates(b.latitude,b.longitude))return decide('abstain','geography-unknown');
 const km=distanceKm(a,b);if(km>policy.maxKm)return decide('separate','geography-outside-window');
 if(hours>policy.edgeHours||km>policy.edgeKm)return decide('abstain','near-time-or-geography-boundary');
 if(exact||sameId)return decide('match','exact-identity-with-compatible-context');
 const score=adapter?adapter.similarity(a,b):lexicalCosine(a,b);
 reasons.push(adapter?'local-embedding-adapter':'binary-token-cosine; lexical only');
 return decide(score>=policy.match?'match':score>=policy.abstain?'abstain':'separate',score>=policy.match?'similarity-above-threshold':score>=policy.abstain?'similarity-margin':'similarity-below-margin',score);
}
export function validate(records){if(!Array.isArray(records)||records.length>500)throw Error('records must be an array of at most 500');const ids=new Set();for(const r of records){if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||typeof r.title!=='string')throw Error('Unique nonempty id and string title required');ids.add(r.id);}return records;}
// Connected components of declared family/URL relationships are conservative upper bounds
// on independence: unknown origins are counted separately, never as confirmed origins.
export function families(records){
 const groups=[];for(const r of records){const keys=[r.sourceOrganizationId&&`org:${r.sourceOrganizationId}`,r.syndication&&`syn:${r.syndication}`,canonicalUrl(r.canonicalUrl||r.sourceUrl)&&`url:${canonicalUrl(r.canonicalUrl||r.sourceUrl)}`].filter(Boolean);let matches=groups.filter(g=>keys.some(k=>g.keys.has(k)));const g={keys:new Set(keys),records:[r]};for(const m of matches){m.keys.forEach(k=>g.keys.add(k));g.records.push(...m.records);groups.splice(groups.indexOf(m),1);}groups.push(g);}
 return {declaredFamilyCount:groups.filter(g=>g.records.some(r=>r.sourceOrganizationId||r.syndication)).length,unknownOriginRecords:records.filter(r=>!r.sourceOrganizationId&&!r.syndication).length,independentConfirmationCount:null,note:'Declared family components, not verified independent reporting'};
}
export function group(records,{method='candidate',adapter=null}={}){
 validate(records);if(!['candidate','baseline'].includes(method))throw Error('Unknown method');const predicate=method==='baseline'?baseline:(a,b)=>candidate(a,b,adapter);const sorted=[...records].sort((a,b)=>a.id.localeCompare(b.id));const decisions=[];const lookup=new Map();
 for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length;j++){const d={ids:[sorted[i].id,sorted[j].id],...predicate(sorted[i],sorted[j])};decisions.push(d);lookup.set(JSON.stringify(d.ids),d);}
 const clusters=[];for(const r of sorted){let c=clusters.find(g=>g.every(x=>lookup.get(JSON.stringify([x.id,r.id].sort((a,b)=>a.localeCompare(b))))?.state==='match'));if(c)c.push(r);else clusters.push([r]);}
 return {schema:'dedup-result-v1',method,semanticInference:adapter?'LOCAL_ADAPTER':'NOT RUN',policy,records,groups:clusters.map(g=>({recordIds:g.map(r=>r.id),...families(g)})),decisions,retainedRecords:records.length,...families(records)};
}

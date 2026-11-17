import {writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url);
if(existsSync(new URL('freeze.json',dir))) throw Error('Frozen fixtures already exist; refusing rewrite');
const make=(split)=>{
 const cases=[]; const shift=split==='holdout'?10:0;
 const record=(id,over={})=>({id,title:'Factory fire closes east road at Cedar industrial park',category:'fire',startedAt:'2026-01-01T00:00:00Z',updatedAt:null,latitude:shift,longitude:0,provider:id,providerEventId:id,sourceUrl:`https://${id}.example/report`,sourceOrganizationId:id,severity:null,confidence:null,sourceStatus:'authored-fixture',provenance:{kind:'synthetic',author:'experiment agent'},...over});
 const pair=(name,positive,a={},b={},why='')=>{const key=`${split}-${name}`;cases.push({id:key,rationale:why,records:[record(`${key}-a`,a),record(`${key}-b`,b)],positivePairs:positive?[[`${key}-a`,`${key}-b`]]:[]});};
 pair('syndication',true,{syndication:'wire-one',sourceOrganizationId:'wire-one'},{syndication:'wire-one',sourceOrganizationId:'mirror-one'},'Declared wire copy is one origin');
 pair('canonical-url',true,{sourceUrl:'https://wire.example/item?utm_source=a'},{sourceUrl:'https://wire.example/item?utm_source=b'},'Tracking-only URL variant');
 pair('paraphrase',true,{}, {title:'Blaze at Cedar manufacturing site shuts eastern highway'},'Same authored incident with little word overlap');
 pair('updated-time',true,{provider:'wire',providerEventId:'one'},{provider:'wire',providerEventId:'one',updatedAt:'2026-01-03T00:00:00Z'},'Revision clock changes; occurrence stays fixed');
 pair('different-incidents',false,{}, {title:'Factory fire closes west road at Cedar industrial park'},'Distinct simultaneous fires in same area');
 pair('missing-time',true,{}, {startedAt:null},'Known fixture duplicate; insufficient time evidence must abstain');
 pair('missing-geo',true,{}, {latitude:null,longitude:null},'Known fixture duplicate; no geography invention');
 pair('unknown-severity',true,{severity:null},{severity:0},'Grouping must retain unknown separately from zero');
 pair('time-outside',false,{}, {startedAt:'2026-01-01T06:00:01Z'},'One second outside six hour window');
 pair('time-edge',false,{}, {startedAt:'2026-01-01T05:59:59Z'},'Different authored incident one second inside window');
 pair('geo-outside',false,{}, {latitude:shift+0.316},'Just beyond 35km');
 pair('geo-edge',false,{}, {latitude:shift+0.314},'Different incident just inside 35km');
 pair('category',false,{}, {category:'flood'},'Conflicting category despite title');
 pair('exact-url-conflict',false,{sourceUrl:'https://wire.example/rolling'},{sourceUrl:'https://wire.example/rolling',startedAt:'2026-01-03T00:00:00Z'},'Rolling URL reused on later incident');
 pair('unknown-family',true,{sourceOrganizationId:null},{sourceOrganizationId:null},'Unknown organization is not independent confirmation');
 if(split==='holdout'){
  pair('negation',false,{}, {title:'No factory fire closes east road at Cedar industrial park'},'Lexical overlap cannot resolve negation');
  pair('numbers',false,{title:'Magnitude 4 earthquake at Cedar ridge'},{title:'Magnitude 6 earthquake at Cedar ridge'},'Different authored quakes; magnitude normalization hard negative');
  const ids=['chain-a','chain-b','chain-c'];cases.push({id:'holdout-chain',rationale:'A-B and B-C close, A-C beyond time bound; never bridge all three',records:ids.map((id,i)=>record(id,{startedAt:`2026-01-01T0${i*4}:00:00Z`})),positivePairs:[['chain-a','chain-b']]});
 }
 return {schema:'dedup-authored-v1',split,labels:'agent-authored, not user labels or real events',cases};
};
const hashes={};for(const split of ['development','holdout']){const s=JSON.stringify(make(split),null,2)+'\n';writeFileSync(new URL(`${split}.json`,dir),s);hashes[`${split}.json`]=createHash('sha256').update(s).digest('hex');}
writeFileSync(new URL('freeze.json',dir),JSON.stringify({createdAt:new Date().toISOString(),policy:'Frozen before core implementation/evaluation. No tuning on holdout. Splits share authored templates; not distribution-independent.',hashes},null,2));
console.log(hashes);

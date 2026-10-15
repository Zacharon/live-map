import { createEvidenceRecord } from '../../intelligence/evidence-records.js';
import { contentDigest } from '../../intelligence/content-digest.js';

export function createCeasefireCase() {
  const asOf='2026-10-12T12:00:00.000Z';
  const scope={parties:['Party A','Party B'],geography:'Fictional North District',infrastructureType:'electricity substations',start:'2026-10-12T08:00:00.000Z',end:'2026-10-12T10:00:00.000Z'};
  const make=(id,kind,party,extra={},fields={})=>{
    const r=createEvidenceRecord({id,recordKind:'evidence',evidenceKind:kind.includes('attack')||kind.includes('damage')?'physical-security-report':kind.includes('sanctions')?'official-notice':'diplomatic-statement',subjectDomain:'conflict-security',title:`SYNTHETIC ${kind}: ${id}`,summary:'Invented software-test record. No real event or location.',sourceId:`fixture-${id}`,sourceOrganizationId:`org-${id}`,sourceUrl:`https://example.invalid/ceasefire/${id}`,observedAt:'2026-10-12T09:00:00.000Z',reportedAt:'2026-10-12T10:30:00.000Z',retrievedAt:'2026-10-12T11:00:00.000Z',effectiveStart:scope.start,effectiveEnd:scope.end,synthetic:true,valueOrigin:'synthetic',geometryPrecision:'unknown',coverage:{...scope,party},qualityLimitations:['SYNTHETIC; invented public-safe software fixture'],extra:{ceasefire:{kind,party,geography:scope.geography,infrastructureType:scope.infrastructureType,availability:'available',freshness:'current',...extra}},...fields},new Date(asOf));
    if(kind==='compliance-observation') r.observedAt=scope.end;
    r.revision=1;r.evidentialOriginId=fields.evidentialOriginId||`origin-${id}`;r.contentDigest=contentDigest(r);return r;
  };
  const evidence=[
    make('announcement','announcement','all'),make('a-ack','acknowledgment','Party A'),
    make('a-reject','rejection','Party A'),make('b-silence','silence','Party B'),
    make('attack-report','attack-report','Party A'),
    make('attack-copy','attack-report','Party A',{}, {sourceOrganizationId:'org-attack-report',evidentialOriginId:'origin-attack-report',syndication:'origin-attack-report'}),
    make('attack-observed','attack-observation','Party A'),make('damage-reported','damage-report','Party A'),
    make('damage-confirmed','damage-confirmation','Party A'),
    make('sanctions-announced','sanctions-announcement','all'),make('sanctions-effective','sanctions-effective','all'),
    make('a-orders','implementation','Party A'),
    make('b-monitor-1','compliance-observation','Party B',{directObservation:true,coverageComplete:true,finding:'compliant',method:'Invented continuous monitor log',coverageBasis:'All fictional substations in district during exact interval'}),
    make('b-monitor-copy','compliance-observation','Party B',{directObservation:true,coverageComplete:true,finding:'compliant',method:'Mirror of monitor log',coverageBasis:'Same underlying observation'}, {sourceOrganizationId:'org-b-monitor-1',evidentialOriginId:'origin-b-monitor-1',syndication:'origin-b-monitor-1'}),
    make('old-strike','attack-report','Party B',{freshness:'stale'},{observedAt:'2026-10-11T09:00:00.000Z'}),
    make('unavailable-damage','damage-confirmation','Party B',{availability:'unavailable'}),
    make('unknown-ack','acknowledgment','Party B',{availability:'unknown'},{sourceOrganizationId:null}),
    make('other-district','attack-report','Party B',{geography:'Fictional South District'}),
  ];
  return {id:'case:synthetic-ceasefire-20261012',caseType:'ceasefire-v1',revision:1,asOf,ceasefireScope:scope,
    requirement:{id:'requirement:ceasefire',revision:1,chokepointId:null,title:'Ceasefire claim verification — SYNTHETIC',extra:{question:'Which claims were announced, acknowledged or disputed, and what compliance was actually observed within the explicit scope?',audience:'local-analyst',status:'synthetic-fixture',definitionOfDone:'Separate attributed dimensions; preserve unknowns and contradictions.'}},
    evidence,collections:[],claims:[],assessments:[],products:[],feedback:[],relationships:[],parked:[],history:[],unsaved:true};
}

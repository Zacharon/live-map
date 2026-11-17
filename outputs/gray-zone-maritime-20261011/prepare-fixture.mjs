import { writeFileSync } from 'node:fs';
import { stampRecord } from '../../src/intelligence/investigation-cycle.js';
import { serializeCase } from '../../src/intelligence/case-io.js';
import { GRAY_ZONE_FIXTURE_ID } from '../../src/intelligence/gray-zone-maritime.js';

const retrievedAt = '2026-10-11T20:22:41.000Z';
const reutersUrl = 'https://uk.marketscreener.com/news/china-militia-boat-spotted-for-first-time-off-taiwan-s-east-coast-patrol-finds-ce785dded189f02c';
const cnaUrl = 'https://focustaiwan.tw/politics/202610090003';
const sourceAccess = 'Reuters syndication read; original Apex report and direct official incident statement unavailable.';
const unknowns = ['No original imagery/AIS track inspected by this app.', 'Exact day withheld; coordinates, mission and independent corroboration unknown.'];
const common = { subjectDomain: 'maritime', evidenceKind: 'public-report', valueOrigin: 'reported', synthetic: false,
  sourceId: 'reuters-report-20261008', sourceUrl: reutersUrl, upstreamOrganization: 'Reuters', sourceOrganizationId: 'reuters',
  syndication: 'Reuters', observedAt: null, reportedAt: null, retrievedAt, geometryPrecision: 'unknown',
  lat: null, lon: null, geometry: null, qualityLimitations: unknowns,
  rightsAttribution: 'Concise factual metadata attributed to Reuters / Apex Aviation; no report or imagery reproduced.' };
const baseExtra = { historicalReporting: true, sourceAccess, independentCorroboration: 'unknown',
  occurrencePeriod: 'mid-August 2026; exact day and time withheld', publicationDate: '2026-10-08 (day precision; source article, not occurrence)',
  analyticalConfidence: { level: 'unknown', rationale: 'Underlying surveillance and official identity assessment not independently evaluated.' } };
const vessels = [
  ['vessel-minfudingyu-07902', 'Minfudingyu 07902', 'fishing boat; maritime militia classification attributed to Apex and unnamed Taiwan officials'],
  ['vessel-ccg-2502', '2502', 'China Coast Guard cutter; exact vessel class unknown'],
  ['vessel-xiang-yang-hong-03', 'Xiang Yang Hong 03', 'research vessel; exact vessel class unknown'],
];
const evidence = vessels.map(([id, name, reportedClass]) => stampRecord({ ...common, id, recordKind: 'observation',
  title: `Reported sighting: ${name}`, summary: 'Reported vessel in a surveillance group east of Taiwan; no app observation.',
  coverage: { extent: 'one reported surveillance encounter', completeness: 'unknown', temporalPrecision: 'month / mid-month wording' },
  extra: { ...baseExtra, attributedTo: 'Apex Aviation surveillance report reviewed by Reuters; identities also attributed to two anonymous Taiwan officials',
    vessel: { reportedIdentity: name, reportedClass, mmsi: null, imo: null },
    reportedLocation: { label: 'more than 30 nautical miles off Hualien, Taiwan east coast', precision: 'textual region and lower-bound distance; no point', coordinates: null },
    associatedVessels: vessels.filter(item => item[0] !== id).map(item => item[1]),
    method: 'Apex reconnaissance aircraft report: radar screenshots, infrared imagery and AIS data; not inspected by this app',
  } }, new Date(retrievedAt)));
evidence.push(stampRecord({ ...common, id: 'cga-restricted-waters-response', recordKind: 'evidence', sourceId: 'cna-response-20261009', sourceUrl: cnaUrl,
  upstreamOrganization: 'CNA / Focus Taiwan', sourceOrganizationId: 'cna', syndication: null,
  rightsAttribution: 'Concise factual metadata attributed to CNA / Focus Taiwan reporting of Taiwan CGA; no full report reproduced.',
  title: 'CGA response reported by CNA', summary: 'CNA attributes an outside-restricted-waters statement to Taiwan CGA; precise legal boundary unverified.',
  extra: { ...baseExtra, occurrencePeriod: 'CGA response reported October 9, 2026; exact statement time unknown', publicationDate: '2026-10-09 (article day precision)', attributedTo: 'Taiwan Coast Guard Administration, as reported by CNA',
    sourceAccess: 'CNA report read; direct CGA incident statement not located.', method: 'Journalistic attribution of official response', legalBoundary: null },
  qualityLimitations: ['No dated direct CGA statement located; statement time unknown.', 'No legal polygon, territorial-water ruling or lawful/illegal verdict derived.'] }, new Date(retrievedAt)));

const definitions = [
  ['sighting', 'VESSEL OBSERVED', 'reported', 'Apex Aviation, via Reuters', 'Reported sighting only; not observed independently by this app.'],
  ['coordination', 'COORDINATION INFERRED', 'inferred', 'One anonymous senior Taiwan official quoted by Reuters', 'Coordination alleged by that official. Apex director Honor Hung said one tracking observation could not establish coordination or missions.'],
  ['blockade', 'BLOCKADE PREPARATION CLAIMED', 'reported', 'Taiwan officials described by Reuters; unnamed in the report', 'Potential blockade preparation is an attributed interpretation of wider activity, not an established mission for these three vessels.'],
];
const claims = definitions.map(([id, type, origin, attributedTo, limitation]) => stampRecord({ ...common,
  id: `conclusion-${id}`, recordKind: 'claim', title: type, summary: limitation, valueOrigin: origin,
  parentEvidenceIds: vessels.map(item => item[0]), qualityLimitations: [limitation, 'Co-occurrence alone does not establish intent.'],
  extra: { ...baseExtra, conclusionType: type, established: false, attributedTo,
    credibility: { code: '6', rationale: limitation }, reviewState: 'draft' },
}, new Date(retrievedAt)));
const relationships = vessels.slice(1).map(item => stampRecord({ ...common, id: `co-occurrence-${item[0]}`, recordKind: 'relationship',
  title: 'Reported co-occurrence', extra: { ...baseExtra, fromId: vessels[0][0], toId: item[0], edgeType: 'collected_with', assertionClass: 'reported', attributedTo: 'Apex Aviation, via Reuters' },
  qualityLimitations: ['Roughly 10-nautical-mile group radius reported; no positions or track geometry available. Co-occurrence is not coordination.'] }, new Date(retrievedAt)));
const caseObject = { id: GRAY_ZONE_FIXTURE_ID, fixtureId: GRAY_ZONE_FIXTURE_ID, fixtureType: 'gray-zone-maritime-report-v1',
  acquisition: 'historical-reporting', genuine: true, independentlyObserved: false, independentCorroboration: 'unknown',
  requirement: stampRecord({ id: 'requirement-gray-zone', recordKind: 'requirement', title: 'GRAY-ZONE MARITIME ACTIVITY',
    summary: 'Inspect the reported Taiwan east-coast sighting separately from coordination inference and a claimed blockade purpose.',
    extra: { question: 'What does the reporting establish, and what remains inference or claim?', audience: 'local-analyst',
      definitionOfDone: 'Three attributed conclusions; missing day/coordinates/corroboration stay unknown; no operational verdict.', status: 'historical-fixture' } }, new Date(retrievedAt)),
  sources: [
    { id: 'reuters-report-20261008', organization: 'Reuters', url: reutersUrl, availability: 'read-public-report', publicationDate: '2026-10-08', retrievedAt, independentOrigin: 'Apex encounter as reported by Reuters', directPrimaryStatus: 'original Apex report unavailable' },
    { id: 'cna-response-20261009', organization: 'CNA', url: cnaUrl, availability: 'read-public-report', publicationDate: '2026-10-09', retrievedAt, independentOrigin: 'reported CGA response; not independent sighting', directPrimaryStatus: 'direct CGA incident statement not located' },
  ], sourceEvaluations: [{ code: 'F', rationale: 'Underlying evidence not independently evaluated.' }],
  evidence, claims, relationships, assessments: [], collections: [], products: [], parked: [], feedback: [],
  history: [{ type: 'fixture-prepared', at: retrievedAt, note: 'Historical public reporting metadata; exact occurrence date withheld.' }],
};
writeFileSync('data/development-fixtures/gray-zone-maritime-taiwan-2026-08.json', serializeCase(caseObject));

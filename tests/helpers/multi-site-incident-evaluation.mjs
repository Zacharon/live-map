// Evaluation-only contract: no production provider or API imports this module.
import { isDeepStrictEqual } from "node:util";

export function validateMultiSiteIncidentFixture(input) {
  if (input?.schemaVersion === 2) return validateGridIncidentFixture(input);
  const errors = [];
  const require = (condition, message) => { if (!condition) errors.push(message); };
  require(input?.schemaVersion === 1, "unsupported multi-site schema version");
  require(input?.mode === "frozen-evaluation" && input?.live === false, "fixture must remain frozen, never live");
  require(input?.label?.startsWith("Frozen evaluation fixture"), "frozen label required");
  const checkField = (field, path) => {
    require(field && typeof field === "object", `${path}: evidence field required`);
    if (!field) return;
    for (const key of ["value", "source", "publisher", "publishedAt", "eventDate", "observedAt", "retrievedAt", "claimantType", "claimant", "scope", "confidence", "verification", "evidenceKind", "provenance"]) {
      require(Object.hasOwn(field, key), `${path}: missing ${key}`);
    }
    const source = input.sources?.[field.sourceId];
    if (field.sourceId) {
      require(Boolean(source), `${path}: missing source`);
      require(field.source === source?.url && field.publisher === source?.publisher && field.publishedAt === source?.publishedAt && field.retrievedAt === source?.retrievedAt && field.provenance === source?.retrieval, `${path}: provenance mismatch`);
      require(Boolean(field.claimantType && field.claimant && field.scope), `${path}: attribution required`);
      require(field.evidenceKind === "claim", `${path}: sourced claim cannot become observation`);
    } else {
      require(field.evidenceKind === "unknown" && [null, "unknown"].includes(field.value), `${path}: unsourced value must remain unknown`);
      require(field.source === null && field.publisher === null && field.claimant === null, `${path}: unsourced attribution must remain empty`);
    }
    // This frozen snapshot contains no independently established observations.
    require(field.verification === "unverified" && field.confidence === "unknown" && field.observedAt === null, `${path}: no independent verification in this snapshot`);
  };
  require(input?.sites?.length === 4, "four distinct sites required");
  require(new Set(input?.sites?.map(site => site.id)).size === 4, "site ids must be unique");
  for (const site of input?.sites || []) {
    require(site.geography?.geometry === null && site.geography?.precision === "region-label-only", `${site.id}: no sourced geometry`);
    for (const key of ["reportedAttack", "physicalDamageClaimed", "physicalDamageObserved", "operationalStatus", "casualties", "commercialServiceEffects"]) checkField(site[key], `${site.id}.${key}`);
    require(site.physicalDamageObserved?.value === null, `${site.id}: claimed damage is not observed damage`);
    require(site.operationalStatus?.value === "unknown", `${site.id}: facility operations unknown`);
    require(site.casualties?.value === null, `${site.id}: aggregate casualties cannot be allocated`);
    require(site.restorationUpdates?.length === 0 && site.restorationStatus === "pending", `${site.id}: restoration not sourced`);
    const expected = { severity: "unknown", confidence: "unknown", impact: "unknown", corroboration: 0, freshness: "frozen", completeness: "partial" };
    require(Object.keys(site.dimensions || {}).length === 6 && Object.entries(expected).every(([key, value]) => site.dimensions?.[key] === value), `${site.id}: assessment dimensions must remain separate and unsupported values unknown`);
  }
  for (const record of input?.nonSiteRecords || []) checkField(record.evidence, record.id);
  const interceptions = input?.nonSiteRecords?.find(record => record.id === "mod-interceptions");
  require(interceptions?.kind === "interception-claim" && interceptions?.evidence?.claimantType === "official-military" && interceptions?.unit === "drones-claimed-intercepted" && interceptions?.launchTotal === null && interceptions?.physicalDamage === null, "interceptions are military claims, not launches or damage");
  const terms = input?.nonSiteRecords?.find(record => record.id === "ceasefire-terms");
  require(terms?.mutuallyConfirmedTerms === null && terms?.evidence?.provenance === "brief-only", "ceasefire terms unconfirmed");
  return { valid: errors.length === 0, errors };
}

const FIELD_KEYS = ["value", "sourceId", "source", "publisher", "publishedAt", "eventDate", "observedAt", "retrievedAt", "claimantType", "claimant", "scope", "confidence", "verification", "evidenceKind", "provenance"];
const SITE_KEYS = ["id", "name", "siteScope", "geography", "reportedAttack", "physicalDamageClaimed", "physicalDamageObserved", "operationalStatus", "casualties", "commercialServiceEffects", "restorationUpdates", "restorationStatus", "dimensions", "reportedTargetRegion", "reportedExpansion", "reportedFacilityCount", "specificAsset", "physicalDamage", "outageStart", "customersAffected", "restorationUpdate", "source", "observationTime"];
const SOURCE_FACTS = [
  "Ukrainian energy ministry officials and local authorities reported expansion into previously untargeted western regions",
  "Nekrasov named Zhytomyr, Lviv, Rivne, Ternopil, Khmelnytskyi, Kirovohrad and Odesa as struck regions",
  "DTEK reported three Odesa-region energy facilities hit and 32,700 families remaining without power",
  "Zelenskiy described attacks after Trump's announced energy-attack halt; cessation was not independently verified in this snapshot",
];

function validateGridIncidentFixture(input) {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  const keys = (object, expected, path) => need(object && typeof object === "object" && !Array.isArray(object) && Object.keys(object).length === expected.length && expected.every(key => Object.hasOwn(object, key)), `${path}: unexpected or missing keys`);
  const sameArray = (actual, expected) => Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
  keys(input, ["schemaVersion", "id", "label", "mode", "live", "frozenOn", "sources", "sites", "nonSiteRecords"], "fixture");
  need(input?.schemaVersion === 2 && input?.id === "ukraine-grid-regional-strikes-20261020" && input?.label === "Frozen evaluation fixture - Reuters-attributed regional grid reports" && input?.mode === "frozen-evaluation" && input?.live === false && input?.frozenOn === "2026-10-21", "fixture identity/frozen label mismatch");
  keys(input?.sources, ["reuters"], "sources");
  const origin = input?.sources?.reuters;
  keys(origin, ["publisher", "organization", "url", "snapshotUrl", "retrieval", "publishedAt", "updatedAt", "retrievedAt", "snapshotFacts"], "Reuters source");
  need(origin?.publisher === "Reuters" && origin?.organization === "reuters" && origin?.url === "https://www.reuters.com/business/energy/russia-expands-attacks-energy-facilities-western-ukraine-2026-10-20/" && origin?.snapshotUrl === "https://uk.marketscreener.com/news/russia-expands-attacks-on-energy-facilities-to-western-ukraine-ce785cd8d88dfe2c" && origin?.retrieval === "Reuters-syndication-snapshot; direct Reuters page unavailable" && origin?.publishedAt === "2026-10-20T11:50:00Z" && origin?.updatedAt === "2026-10-20T11:55:00Z" && origin?.retrievedAt === "2026-10-21T18:00:55Z" && sameArray(origin?.snapshotFacts, SOURCE_FACTS), "Reuters source snapshot mismatch");
  const checkField = (field, path, value, claimantType = null, claimant = null, scope = null, eventDate = "2026-10-20") => {
    keys(field, FIELD_KEYS, path);
    if (!field) return;
    const sourced = claimant !== null;
    need(isDeepStrictEqual(field.value, value), `${path}: unsupported value`);
    need(field.sourceId === (sourced ? "reuters" : null) && field.source === (sourced ? origin?.url : null) && field.publisher === (sourced ? "Reuters" : null) && field.publishedAt === (sourced ? origin?.publishedAt : null) && field.retrievedAt === (sourced ? origin?.retrievedAt : null) && field.provenance === (sourced ? origin?.retrieval : "not-sourced") && field.evidenceKind === (sourced ? "claim" : "unknown"), `${path}: provenance/evidence mismatch`);
    need(field.claimantType === claimantType && field.claimant === claimant && field.scope === scope && field.eventDate === eventDate && field.observedAt === null && field.confidence === "unknown" && field.verification === "unverified", `${path}: attribution/time/verification mismatch`);
  };
  const west = ["Zhytomyr", "Lviv", "Rivne", "Ternopil", "Khmelnytskyi"];
  const expectedRegions = [...west, "Kirovohrad", "Odesa"];
  need(input?.sites?.length === 7, "seven regional reports required");
  need(sameArray(input?.sites?.map(site => site.reportedTargetRegion?.value?.name), expectedRegions), "regional expansion missing or reordered");
  for (const [index, site] of (input?.sites || []).entries()) {
    const name = expectedRegions[index];
    const area = west.includes(name) ? "western" : name === "Odesa" ? "southern" : "central";
    const scope = `${name} region, Ukraine`;
    const path = site?.id || `site-${index}`;
    keys(site, SITE_KEYS, path);
    need(site?.id === `grid-${name.toLowerCase()}` && site?.name === `${name} regional energy report` && site?.siteScope === "regional-report; physical sites unidentified", `${path}: site identity mismatch`);
    keys(site?.geography, ["label", "precision", "geometry"], `${path}.geography`);
    need(site?.geography?.label === scope && site?.geography?.precision === "region-label-only" && site?.geography?.geometry === null, `${path}: precise site/geometry unsupported`);
    checkField(site?.reportedAttack, `${path}.reportedAttack`, "reported-targeted", "national-authority", "Artem Nekrasov", scope);
    for (const key of ["physicalDamageClaimed", "physicalDamageObserved", "casualties", "specificAsset", "physicalDamage", "outageStart", "restorationUpdate"]) checkField(site?.[key], `${path}.${key}`, null);
    checkField(site?.operationalStatus, `${path}.operationalStatus`, "unknown");
    checkField(site?.commercialServiceEffects, `${path}.commercialServiceEffects`, "unknown");
    need(Array.isArray(site?.restorationUpdates) && site.restorationUpdates.length === 0 && site.restorationStatus === "unknown", `${path}: restoration unknown`);
    keys(site?.dimensions, ["severity", "confidence", "impact", "corroboration", "freshness", "completeness"], `${path}.dimensions`);
    need(site?.dimensions?.severity === "unknown" && site?.dimensions?.confidence === "unknown" && site?.dimensions?.impact === "unknown" && site?.dimensions?.corroboration === 0 && site?.dimensions?.freshness === "frozen" && site?.dimensions?.completeness === "partial", `${path}: assessment dimensions must remain separate`);
    checkField(site?.reportedTargetRegion, `${path}.reportedTargetRegion`, { name, area }, "national-authority", "Artem Nekrasov", scope);
    keys(site?.reportedTargetRegion?.value, ["name", "area"], `${path}.reportedTargetRegion.value`);
    if (west.includes(name)) checkField(site?.reportedExpansion, `${path}.reportedExpansion`, "previously-untargeted-reported", "official-sources", "Ukrainian energy ministry officials and local authorities", "western regions (aggregate); Ukraine");
    else checkField(site?.reportedExpansion, `${path}.reportedExpansion`, null);
    if (name === "Odesa") {
      checkField(site?.reportedFacilityCount, `${path}.reportedFacilityCount`, 3, "company", "DTEK", "Odesa region; unidentified facilities");
      checkField(site?.customersAffected, `${path}.customersAffected`, { count: 32700, unit: "families", temporalScope: "point-in-time-at-report", permanence: "not-established", incidentAllocation: "not-established" }, "company", "DTEK", "Odesa regional count; no per-facility allocation");
      keys(site?.customersAffected?.value, ["count", "unit", "temporalScope", "permanence", "incidentAllocation"], `${path}.customersAffected.value`);
    } else {
      checkField(site?.reportedFacilityCount, `${path}.reportedFacilityCount`, null);
      checkField(site?.customersAffected, `${path}.customersAffected`, null);
    }
    keys(site?.source, ["sourceId", "url"], `${path}.source`);
    need(site?.source?.sourceId === "reuters" && site?.source?.url === origin?.url, `${path}: source reference mismatch`);
    keys(site?.observationTime, ["exact", "reportedAsOfDate", "precision", "basis"], `${path}.observationTime`);
    need(site?.observationTime?.exact === null && site?.observationTime?.reportedAsOfDate === "2026-10-20" && site?.observationTime?.precision === "day" && site?.observationTime?.basis === "report-day; exact source observation clock unknown", `${path}: observation clock unsupported`);
  }
  need(input?.nonSiteRecords?.length === 1, "one halt context record required");
  const halt = input?.nonSiteRecords?.[0];
  keys(halt, ["id", "kind", "evidence", "announcer", "announcementDate", "reportedStatementDate", "statementDateBasis", "cessationVerified", "priorFixtureContextId", "possiblePriorStatementContextId", "observationTime"], "halt");
  need(halt?.id === "energy-attack-halt" && halt?.kind === "context" && halt?.announcer === "Donald Trump" && halt?.announcementDate === null && halt?.reportedStatementDate === "2026-10-18" && halt?.statementDateBasis === "Sunday inferred from Reuters Tuesday 2026-10-20 publication" && halt?.cessationVerified === false && halt?.priorFixtureContextId === "st-petersburg-multi-site-20261018:ceasefire-announcement" && halt?.possiblePriorStatementContextId === "st-petersburg-multi-site-20261018:ukraine-energy-attacks", "announced halt is not verified cessation");
  checkField(halt?.evidence, "halt.evidence", "announced-energy-attack-halt", "national-authority", "Volodymyr Zelenskiy", "Zelenskiy's account of Donald Trump's announcement; Russia/Ukraine energy infrastructure", "2026-10-18");
  keys(halt?.observationTime, ["exact", "reportedAsOfDate", "precision", "basis"], "halt.observationTime");
  need(halt?.observationTime?.exact === null && halt?.observationTime?.reportedAsOfDate === "2026-10-18" && halt?.observationTime?.precision === "day" && halt?.observationTime?.basis === "statement-day inferred; announcement clock unknown", "halt statement time mismatch");
  return { valid: errors.length === 0, errors };
}

export function queryGridIncidentFixture(input) {
  if (input?.schemaVersion !== 2) throw new Error("grid query requires multi-site schema v2");
  const result = validateMultiSiteIncidentFixture(input);
  if (!result.valid) throw new Error(result.errors.join("; "));
  const odesa = input.sites.find(site => site.reportedTargetRegion.value.name === "Odesa");
  return {
    newlyReportedWesternRegions: input.sites.filter(site => site.reportedExpansion.value !== null).map(site => site.reportedTargetRegion.value.name),
    odesa: {
      reportedFacilityCount: odesa.reportedFacilityCount.value,
      customersAffected: odesa.customersAffected.value,
      specificAsset: odesa.specificAsset.value,
      physicalDamage: odesa.physicalDamage.value,
      outageStart: odesa.outageStart.value,
      restorationUpdate: odesa.restorationUpdate.value,
      source: odesa.source,
      observationTime: odesa.observationTime,
    },
    energyAttackHalt: { announcer: input.nonSiteRecords[0].announcer, announcementDate: input.nonSiteRecords[0].announcementDate, reportedStatementDate: input.nonSiteRecords[0].reportedStatementDate, cessationVerified: input.nonSiteRecords[0].cessationVerified },
  };
}

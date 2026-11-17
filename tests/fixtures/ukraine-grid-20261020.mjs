// Frozen v2 extension of the existing multi-site evidence-envelope fixture. No provider imports.
const source = {
  publisher: "Reuters", organization: "reuters",
  url: "https://www.reuters.com/business/energy/russia-expands-attacks-energy-facilities-western-ukraine-2026-10-20/",
  snapshotUrl: "https://uk.marketscreener.com/news/russia-expands-attacks-on-energy-facilities-to-western-ukraine-ce785cd8d88dfe2c",
  retrieval: "Reuters-syndication-snapshot; direct Reuters page unavailable",
  publishedAt: "2026-10-20T11:50:00Z", updatedAt: "2026-10-20T11:55:00Z",
  retrievedAt: "2026-10-21T18:00:55Z",
  snapshotFacts: [
    "Ukrainian energy ministry officials and local authorities reported expansion into previously untargeted western regions",
    "Nekrasov named Zhytomyr, Lviv, Rivne, Ternopil, Khmelnytskyi, Kirovohrad and Odesa as struck regions",
    "DTEK reported three Odesa-region energy facilities hit and 32,700 families remaining without power",
    "Zelenskiy described attacks after Trump's announced energy-attack halt; cessation was not independently verified in this snapshot",
  ],
};
export const sources = { reuters: source };

function field(value, claimantType = null, claimant = null, scope = null, eventDate = "2026-10-20") {
  const sourced = claimant !== null;
  return {
    value, sourceId: sourced ? "reuters" : null,
    source: sourced ? source.url : null,
    publisher: sourced ? source.publisher : null,
    publishedAt: sourced ? source.publishedAt : null,
    eventDate, observedAt: null,
    retrievedAt: sourced ? source.retrievedAt : null,
    claimantType, claimant, scope, confidence: "unknown",
    verification: "unverified", evidenceKind: sourced ? "claim" : "unknown",
    provenance: sourced ? source.retrieval : "not-sourced",
  };
}

function region(name, area, western) {
  const scope = `${name} region, Ukraine`;
  return {
    id: `grid-${name.toLowerCase()}`, name: `${name} regional energy report`,
    siteScope: "regional-report; physical sites unidentified",
    geography: { label: scope, precision: "region-label-only", geometry: null },
    reportedAttack: field("reported-targeted", "national-authority", "Artem Nekrasov", scope),
    physicalDamageClaimed: field(null), physicalDamageObserved: field(null),
    operationalStatus: field("unknown"), casualties: field(null),
    commercialServiceEffects: field("unknown"),
    restorationUpdates: [], restorationStatus: "unknown",
    dimensions: { severity: "unknown", confidence: "unknown", impact: "unknown", corroboration: 0, freshness: "frozen", completeness: "partial" },
    reportedTargetRegion: field({ name, area }, "national-authority", "Artem Nekrasov", scope),
    reportedExpansion: western ? field("previously-untargeted-reported", "official-sources", "Ukrainian energy ministry officials and local authorities", "western regions (aggregate); Ukraine") : field(null),
    reportedFacilityCount: field(null), specificAsset: field(null),
    physicalDamage: field(null), outageStart: field(null),
    customersAffected: field(null), restorationUpdate: field(null),
    source: { sourceId: "reuters", url: source.url },
    observationTime: { exact: null, reportedAsOfDate: "2026-10-20", precision: "day", basis: "report-day; exact source observation clock unknown" },
  };
}

const sites = [
  ...["Zhytomyr", "Lviv", "Rivne", "Ternopil", "Khmelnytskyi"].map(name => region(name, "western", true)),
  region("Kirovohrad", "central", false), region("Odesa", "southern", false),
];
const odesa = sites.at(-1);
odesa.reportedFacilityCount = field(3, "company", "DTEK", "Odesa region; unidentified facilities");
odesa.customersAffected = field({ count: 32700, unit: "families", temporalScope: "point-in-time-at-report", permanence: "not-established", incidentAllocation: "not-established" }, "company", "DTEK", "Odesa regional count; no per-facility allocation");

export const ukraineGridIncidentFixture = {
  schemaVersion: 2, id: "ukraine-grid-regional-strikes-20261020",
  label: "Frozen evaluation fixture - Reuters-attributed regional grid reports",
  mode: "frozen-evaluation", live: false, frozenOn: "2026-10-21",
  sources, sites,
  nonSiteRecords: [{
    id: "energy-attack-halt", kind: "context",
    evidence: field("announced-energy-attack-halt", "national-authority", "Volodymyr Zelenskiy", "Zelenskiy's account of Donald Trump's announcement; Russia/Ukraine energy infrastructure", "2026-10-18"),
    announcer: "Donald Trump", announcementDate: null,
    reportedStatementDate: "2026-10-18", statementDateBasis: "Sunday inferred from Reuters Tuesday 2026-10-20 publication",
    cessationVerified: false,
    priorFixtureContextId: "st-petersburg-multi-site-20261018:ceasefire-announcement",
    possiblePriorStatementContextId: "st-petersburg-multi-site-20261018:ukraine-energy-attacks",
    observationTime: { exact: null, reportedAsOfDate: "2026-10-18", precision: "day", basis: "statement-day inferred; announcement clock unknown" },
  }],
};

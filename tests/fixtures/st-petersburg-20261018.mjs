// Frozen evaluation input; never import into providers or the public event feed.
const retrievedAt = "2026-10-18"; // Date precision only; not an event/publication clock.
export const sources = {
  ap: {
    publisher: "Associated Press", publishedAt: "2026-10-18T09:49:17Z",
    url: "https://apnews.com/article/f813d3725b8b5f23958a68a95729fd0d",
    retrieval: "search-excerpt-only", retrievedAt, organization: "associated-press",
  },
  reuters: {
    publisher: "Reuters", host: "Devdiscourse", publishedAt: "2026-10-18T07:02:00Z",
    url: "https://www.devdiscourse.com/article/international/3994318-one-killed-five-injured-in-ukrainian-drone-attack-on-russias-st-petersburg-governor-says",
    retrieval: "search-excerpt-only", retrievedAt, organization: "reuters",
  },
  reutersRegional: {
    publisher: "Reuters", host: "Yahoo News Malaysia", publishedAt: "2026-10-18T10:47:00Z",
    url: "https://malaysia.news.yahoo.com/one-killed-15-injured-ukrainian-104758436.html",
    retrieval: "search-excerpt-only", retrievedAt, organization: "reuters",
  },
  rferl: {
    publisher: "RFE/RL", publishedAt: "2026-10-18 12:07 CET",
    url: "https://www.rferl.org/a/ukraine-russia-drone-attacks-zelenskyy-airports/33878787.html",
    retrieval: "search-excerpt-only", retrievedAt, organization: "rferl",
  },
  brief: {
    publisher: "Owner Daily Priority Brief", publishedAt: "2026-10-18", url: null,
    retrieval: "brief-only", retrievedAt: null, organization: "owner-brief",
  },
};

function field(value, sourceId = null, claimantType = null, claimant = null, scope = null) {
  return {
    value, sourceId, source: sourceId ? sources[sourceId].url : null,
    publisher: sourceId ? sources[sourceId].publisher : null,
    publishedAt: sourceId ? sources[sourceId].publishedAt : null,
    eventDate: "2026-10-18", observedAt: null,
    retrievedAt: sourceId ? sources[sourceId].retrievedAt : null,
    claimantType, claimant, scope, confidence: "unknown",
    verification: "unverified", evidenceKind: sourceId ? "claim" : "unknown",
    provenance: sourceId ? sources[sourceId].retrieval : "not-sourced",
  };
}
function site(id, name, region, sourceId, claimantType, claimant, damage) {
  return {
    id, name, geography: { label: region, precision: "region-label-only", geometry: null },
    reportedAttack: field("reported-targeted", sourceId, claimantType, claimant, id),
    physicalDamageClaimed: damage ? field(damage, sourceId, claimantType, claimant, id) : field(null),
    physicalDamageObserved: field(null), operationalStatus: field("unknown"),
    casualties: field(null), commercialServiceEffects: field("unknown"),
    restorationUpdates: [], restorationStatus: "pending",
    dimensions: { severity: "unknown", confidence: "unknown", impact: "unknown", corroboration: 0, freshness: "frozen", completeness: "partial" },
  };
}
const sites = [
  site("petersburg-terminal", "Petersburg Oil Terminal", "St. Petersburg", "ap", "regional-authority", "Alexander Beglov", "fire-reported"),
  site("ruchi", "Ruchi oil depot", "St. Petersburg", "ap", "regional-authority", "Alexander Beglov", "fire-reported"),
  site("ozon", "Ozon logistics facility", "St. Petersburg", "reuters", "company", "Ozon", "fire-reported"),
  site("vk", "VK-associated data center", "Leningrad region", "reuters", "company", "VK", null),
];
sites[3].commercialServiceEffects = field("normal-service-claimed", "reuters", "company", "VK", "VK user services; not facility operational status");

export const multiSiteIncidentFixture = {
  schemaVersion: 1, id: "st-petersburg-multi-site-20261018",
  label: "Frozen evaluation fixture - partial source retrieval, unverified claims",
  mode: "frozen-evaluation", live: false, frozenOn: "2026-10-18", sources, sites,
  nonSiteRecords: [
    { id: "city-casualties", kind: "casualties", evidence: field({ killed: 1, injured: 5 }, "ap", "regional-authority", "Alexander Beglov", "St. Petersburg attack; no site allocation") },
    { id: "regional-casualties", kind: "casualties", evidence: field({ killed: 1, injured: 15 }, "reutersRegional", "regional-authority", "Local authorities", "St. Petersburg and Leningrad region; no site allocation"), relationshipToCityTotal: "not-reconciled-do-not-add" },
    { id: "mod-interceptions", kind: "interception-claim", evidence: field(1015, "ap", "official-military", "Russian Ministry of Defence", "15 Russian regions, Crimea and Black Sea"), unit: "drones-claimed-intercepted", launchTotal: null, physicalDamage: null },
    { id: "ukraine-energy-attacks", kind: "attack-count-claim", evidence: field(76, "rferl", "national-authority", "Volodymyr Zelenskyy", "Ukraine energy/oil/gas; prior week"), unit: "attacks-claimed", period: "prior week as reported; exact interval unverified" },
    { id: "ceasefire-announcement", kind: "context", evidence: { ...field("energy-pause-announcement", "rferl", "national-authority", "Donald Trump", "Russia/Ukraine energy infrastructure"), eventDate: "2026-10-11" } },
    { id: "ceasefire-terms", kind: "context", evidence: field("no-mutually-confirmed-terms", "brief", "brief-author", "Owner brief", "Russia/Ukraine"), mutuallyConfirmedTerms: null },
  ],
};

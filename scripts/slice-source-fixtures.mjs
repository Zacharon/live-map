import { readFileSync, writeFileSync, copyFileSync } from "node:fs";

const full = JSON.parse(readFileSync("artifacts/source-snapshots/cisa-kev-full.json", "utf8"));
const items = (full.vulnerabilities || []).slice(0, 5);
const frozen = {
  live: false,
  providerEnabled: false,
  status: "frozen-historical-public-extract",
  source: "CISA Known Exploited Vulnerabilities Catalog",
  sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
  catalogUrl: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
  retrievedAt: "2026-09-16T00:00:00.000Z",
  catalogCount: (full.vulnerabilities || []).length,
  catalogVersion: full.catalogVersion || null,
  dateReleased: full.dateReleased || null,
  fullCaptureSha256: "9630fea2f5dbcda3444115d95688e4491134ccc674243f0d9e8a0253e2e6fbfe",
  fullCaptureBytes: 1722859,
  note: "Subset for local replay. Not a complete catalog. GitHub cisagov/kev-data is a mirror of the same catalog, not independent corroboration. dateAdded is not incident time. No map coordinates.",
  vulnerabilities: items,
};
writeFileSync("data/development-fixtures/cisa-kev-frozen.json", JSON.stringify(frozen, null, 2));
copyFileSync("artifacts/source-snapshots/nhc-twoat.xml", "data/development-fixtures/nhc-twoat-frozen.xml");
console.log("kev", items.length, frozen.catalogCount, items[0]?.cveID);
console.log("nhc copied");

/**
 * L11 — operational evidence streams. Capability/access records, not invented adapters.
 * Diplomatic statements and oil price/range changes are contextual, not reopening proof.
 * 'oil-range' was undefined in the originating brief; it is unbound here.
 */

export const OPERATIONAL_STREAMS = [
  {
    id: "throughput-aggregates",
    capability: "throughput and tanker/LNG aggregates",
    sourceIds: ["imf-portwatch"],
    access: "public-arcgis-rest-discovered-not-activated",
    status: "missing-or-manual-until-activation",
  },
  {
    id: "authoritative-operating-notices",
    capability: "authoritative operating notices",
    sourceIds: ["us-marad-advisories", "ukmto-advisories", "port-authority-notices"],
    access: "link-only-or-planned",
    status: "honest-gap",
  },
  {
    id: "insurer-freight",
    capability: "insurer/freight evidence",
    sourceIds: [],
    access: "manual-or-link-only",
    status: "no-adapter-invented",
  },
  {
    id: "physical-security-incidents",
    capability: "reported physical-security incidents",
    sourceIds: ["usgs-earthquake-geojson", "gdacs"],
    access: "existing-hazard-adapters-plus-news",
    status: "partial-context-not-complete-coverage",
  },
  {
    id: "alternative-routing",
    capability: "alternative routing",
    sourceIds: ["imf-portwatch", "world-bank-shipping-density"],
    access: "aggregates-and-historical-density",
    status: "observed-reroute-requires-evidenced-alternative",
  },
  {
    id: "downstream-energy",
    capability: "downstream energy indicators",
    sourceIds: ["eia-open-data", "eia"],
    access: "existing-eia-adapter-if-present",
    status: "contextual",
  },
  {
    id: "oil-range",
    capability: "oil-range",
    sourceIds: [],
    access: "unbound",
    status: "undefined-in-originating-brief",
    proposedDefinition: "The published price range of a named crude benchmark over a stated period, with vintage and source. Contextual only; never proof of reopening.",
  },
];

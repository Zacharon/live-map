/**
 * Governed resource catalog for collection planning. Extends the master source
 * registry. Upstream directory "live" never enables a Live Map provider.
 */

import { MASTER_SOURCE_REGISTRY, sourceById } from "../sources/master-source-registry.js";

export const RESOURCE_KINDS = ["directory", "tool", "data-provider", "verification-method"];
export const COLLECTION_MODES = ["manual-open", "api-adapter", "local-tool", "link-only"];
export const TD_RM_FLAGS = ["T", "D", "R", "M"];

const OSINT_FRAMEWORK_REVISION = "lockfale/osint-framework@documented-2026-09-16";

function overlay(id, extra) {
  const source = sourceById(id) || {};
  return {
    id,
    name: extra.name || source.name || id,
    resourceKind: extra.resourceKind || "data-provider",
    sourceId: source.id || null,
    domain: extra.domain || source.domain || null,
    categoryPath: extra.categoryPath || source.osintCategory || source.category || null,
    acceptedInputs: extra.acceptedInputs || ["chokepoint-id", "time-window"],
    outputKind: extra.outputKind || source.output || "metadata-or-observations",
    collectionMode: extra.collectionMode || (source.implemented && source.status === "live" ? "api-adapter" : "link-only"),
    registrationRequired: Boolean(extra.registrationRequired ?? source.registrationRequired),
    credentialRequired: Boolean(extra.credentialRequired ?? source.credentialRequired),
    collectionPosture: extra.collectionPosture || "passive",
    tdrmFlags: extra.tdrmFlags || [],
    upstreamStatus: extra.upstreamStatus || null,
    upstreamProvenance: extra.upstreamProvenance || null,
    implementationStatus: source.status || extra.implementationStatus || "planned",
    implemented: Boolean(source.implemented),
    automationEnabled: extra.automationEnabled === true && source.status === "live" && source.implemented === true,
    reviewRequired: extra.reviewRequired !== false,
    permissions: extra.permissions || "open-resource-or-read-method",
    attribution: extra.attribution || source.attribution || source.name,
    retention: extra.retention || source.retention,
    sourceUrl: extra.sourceUrl || source.sourceUrl,
    notes: extra.notes || "",
    watchRelevance: extra.watchRelevance || [],
  };
}

function directoryEntry(entry) {
  return {
    id: entry.id,
    name: entry.name,
    resourceKind: entry.resourceKind,
    sourceId: null,
    domain: entry.domain,
    categoryPath: entry.categoryPath,
    acceptedInputs: entry.acceptedInputs || ["topic"],
    outputKind: entry.outputKind || "directory-links",
    collectionMode: "link-only",
    registrationRequired: Boolean(entry.registrationRequired),
    credentialRequired: false,
    collectionPosture: "passive",
    tdrmFlags: entry.tdrmFlags || [],
    upstreamStatus: entry.upstreamStatus || "listed",
    upstreamProvenance: entry.upstreamProvenance || OSINT_FRAMEWORK_REVISION,
    implementationStatus: "link-only",
    implemented: false,
    automationEnabled: false,
    reviewRequired: true,
    permissions: "open-resource",
    attribution: entry.attribution || entry.name,
    retention: "do not fetch or store linked sites from discovery alone",
    sourceUrl: entry.sourceUrl,
    notes: entry.notes || "Directory listing is not a Live Map provider and is not collection permission.",
    watchRelevance: entry.watchRelevance || [],
  };
}

const DIRECTORY_ENTRIES = [
  directoryEntry({
    id: "osint-framework-directory",
    name: "OSINT Framework (upstream directory)",
    resourceKind: "directory",
    domain: "geospatial-reference",
    categoryPath: "OSINT Framework / Tools",
    tdrmFlags: ["T", "D", "R", "M"],
    upstreamStatus: "live",
    sourceUrl: "https://osintframework.com/",
    notes: "Upstream may mark nodes live or api:true. That is upstreamStatus only. Do not execute URL templates, dorks, or local-install flags.",
    watchRelevance: ["planning", "verification"],
  }),
  directoryEntry({
    id: "invid-verification",
    name: "InVID verification toolkit (method)",
    resourceKind: "verification-method",
    domain: "major-news",
    categoryPath: "Verification / Media",
    tdrmFlags: ["T"],
    upstreamStatus: "listed",
    sourceUrl: "https://www.invid-project.eu/",
    acceptedInputs: ["media-url"],
    outputKind: "verification-checklist",
    watchRelevance: ["verification"],
    notes: "Read-method only. Local installation is out of scope.",
  }),
  directoryEntry({
    id: "internet-archive-wayback",
    name: "Internet Archive Wayback Machine",
    resourceKind: "verification-method",
    domain: "major-news",
    categoryPath: "Archives / Historic",
    tdrmFlags: ["R"],
    upstreamStatus: "live",
    sourceUrl: "https://web.archive.org/",
    acceptedInputs: ["url"],
    outputKind: "archived-capture",
    watchRelevance: ["archives", "verification"],
    notes: "Use existing internet-archive-cdx registry row for adapter status. This catalog row is the human archive method.",
  }),
];

const REGISTRY_OVERLAYS = [
  overlay("usgs-earthquake-geojson", { watchRelevance: ["weather", "disasters"], collectionMode: "api-adapter" }),
  overlay("nasa-eonet", { watchRelevance: ["weather", "disasters"] }),
  overlay("nws-alerts-api", { watchRelevance: ["weather", "disasters"] }),
  overlay("gdacs-alerts", { watchRelevance: ["weather", "disasters"] }),
  overlay("reliefweb-api", { watchRelevance: ["humanitarian", "official-notices"] }),
  overlay("imf-portwatch", {
    watchRelevance: ["maritime", "throughput"],
    notes: "Daily observations, weekly publish. Not a live vessel feed. Production polling is not activated.",
  }),
  overlay("world-bank-shipping-density", {
    watchRelevance: ["maritime"],
    notes: "Historical density sample format only. Do not paint port totals onto ocean pixels.",
  }),
  overlay("noaa-gfs-nomads", { watchRelevance: ["weather"], notes: "Decoder fixture exists; live GFS is not enabled." }),
  overlay("us-marad-advisories", { watchRelevance: ["maritime", "official-notices"] }),
  overlay("eia-open-data", { watchRelevance: ["commodity-supply-chain"] }),
  overlay("internet-archive-cdx", { watchRelevance: ["archives", "verification"], resourceKind: "verification-method" }),
  overlay("celestrak-omm", { watchRelevance: ["orbital"], notes: "Proof module only; not on-globe satellites." }),
];

export const RESOURCE_CATALOG_VERSION = "workbench-v1-2026-09-16";

export function resourceCatalog() {
  const byId = new Map();
  for (const entry of [...REGISTRY_OVERLAYS, ...DIRECTORY_ENTRIES]) {
    if (!byId.has(entry.id)) byId.set(entry.id, entry);
  }
  return [...byId.values()];
}

export function resourceById(id) {
  return resourceCatalog().find((entry) => entry.id === id) || null;
}

export function supportingResourcesForWatch({ domain = "maritime", questionKind = "chokepoint-operating" } = {}) {
  const wanted = questionKind === "chokepoint-operating"
    ? ["maritime", "official-notices", "weather", "archives", "verification", "throughput"]
    : [domain];
  return resourceCatalog().filter((entry) => entry.watchRelevance.some((tag) => wanted.includes(tag)));
}

export function importUpstreamFlags(raw = {}) {
  const flags = [];
  if (raw.t || raw.T || raw.localInstallation) flags.push("T");
  if (raw.d || raw.D || raw.googleDork) flags.push("D");
  if (raw.r || raw.R || raw.registration) flags.push("R");
  if (raw.m || raw.M || raw.manualUrlEdit) flags.push("M");
  const upstreamStatus = raw.live === true || raw.status === "live" ? "live" : raw.status || "listed";
  return {
    tdrmFlags: flags,
    upstreamStatus,
    upstreamApi: raw.api === true,
    implementationStatus: "link-only",
    automationEnabled: false,
    note: "Upstream live/api flags stay on upstreamStatus. They do not enable a local provider.",
  };
}

export function catalogIsNotEvidence(resource) {
  return {
    listed: Boolean(resource?.id),
    evidenceOfIncident: false,
    reason: "A catalog listing is a discovery lead. It becomes evidence only through a collection record (collected_with).",
  };
}

export { MASTER_SOURCE_REGISTRY };

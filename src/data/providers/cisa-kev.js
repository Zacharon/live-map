import { createNormalizedEvent } from "../../events/normalized-event.js";

export const CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

function severityForKev(item = {}) {
  const ransomware = String(item.knownRansomwareCampaignUse || "").toLowerCase() === "known";
  const dueDate = new Date(item.dueDate || 0).getTime();
  const overdue = Number.isFinite(dueDate) && dueDate < Date.now();
  if (ransomware || overdue) return 85;
  return 72;
}

function safeDescription(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 460);
}

export function normalizeCisaKevItem(item, now = new Date()) {
  const cveId = item?.cveID || item?.cveId;
  if (!cveId) return { event: null, errors: ["missing CVE id"] };
  const title = `${cveId}: ${item.vulnerabilityName || `${item.vendorProject || "Unknown vendor"} ${item.product || "unknown product"}`}`;
  const result = createNormalizedEvent({
    id: `cisa-kev:${cveId}`,
    provider: "cisa-kev",
    providerEventId: cveId,
    domain: "technology-cyber",
    category: "cyber",
    type: "exploited-vulnerability",
    subtype: "actively-exploited-vulnerability",
    title,
    description: safeDescription(item.shortDescription),
    geographic: false,
    mapDisplayStatus: "not-mapped",
    nonGeographicReason: "CISA KEV records identify affected technologies, not a verified incident location.",
    startedAt: item.dateAdded || now,
    updatedAt: item.dateAdded || now,
    ingestedAt: now,
    severity: severityForKev(item),
    confidence: 92,
    status: "active",
    sourceName: "CISA Known Exploited Vulnerabilities Catalog",
    sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    sourceType: "Official",
    sourcePublishedAt: item.dateAdded || null,
    tags: ["CISA", "KEV", cveId, item.vendorProject, item.product, item.knownRansomwareCampaignUse === "Known" ? "ransomware-use" : null].filter(Boolean),
    metadata: {
      verificationStatus: "primary-confirmed",
      coordinateMethod: "not applicable",
      severityReason: "CISA lists this CVE in the Known Exploited Vulnerabilities catalog.",
      cveId,
      vendorProject: item.vendorProject || null,
      product: item.product || null,
      vulnerabilityName: item.vulnerabilityName || null,
      dateAdded: item.dateAdded || null,
      dueDate: item.dueDate || null,
      requiredAction: item.requiredAction || null,
      knownRansomwareCampaignUse: item.knownRansomwareCampaignUse || "Unknown",
      notes: item.notes || null,
      cwes: Array.isArray(item.cwes) ? item.cwes : [],
      details: {
        CVE: cveId,
        Vendor: item.vendorProject || "Unknown",
        Product: item.product || "Unknown",
        "Date added": item.dateAdded || "Unknown",
        "Remediation due": item.dueDate || "Unknown",
        "Ransomware use": item.knownRansomwareCampaignUse || "Unknown",
        CWEs: Array.isArray(item.cwes) ? item.cwes.join(", ") : "Unknown",
      },
    },
  });
  return { event: result.valid ? result.event : null, errors: result.errors };
}

export async function fetchCisaKevEvents(context) {
  const data = await context.fetchJson(CISA_KEV_URL, "CISA KEV");
  const now = new Date(context.now);
  const normalized = [];
  const rejected = [];
  for (const item of (data.vulnerabilities || []).slice(0, 250)) {
    const result = normalizeCisaKevItem(item, now);
    if (result.event) normalized.push(result.event);
    else rejected.push({ id: item?.cveID || null, errors: result.errors });
  }
  return { events: normalized, rejected, receivedCount: data.vulnerabilities?.length || 0, warnings: [] };
}

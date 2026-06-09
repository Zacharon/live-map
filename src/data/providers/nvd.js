import { createNormalizedEvent } from "../../events/normalized-event.js";

export const NVD_CVES_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

function cvssScore(cve = {}) {
  const metrics = cve.metrics || {};
  return (
    metrics.cvssMetricV40?.[0]?.cvssData?.baseScore ??
    metrics.cvssMetricV31?.[0]?.cvssData?.baseScore ??
    metrics.cvssMetricV30?.[0]?.cvssData?.baseScore ??
    metrics.cvssMetricV2?.[0]?.cvssData?.baseScore ??
    null
  );
}

export function normalizeNvdCve(vulnerability, now = new Date()) {
  const cve = vulnerability?.cve || vulnerability;
  const cveId = cve?.id;
  if (!cveId) return { event: null, errors: ["missing CVE id"] };
  const score = cvssScore(cve);
  const description = (cve.descriptions || []).find((item) => item.lang === "en")?.value || "NVD CVE record.";
  const result = createNormalizedEvent({
    id: `nvd:${cveId}`,
    provider: "nvd",
    providerEventId: cveId,
    domain: "technology-cyber",
    category: "cyber",
    type: "exploited-vulnerability",
    subtype: "cve-enrichment",
    title: `${cveId}: NVD vulnerability record`,
    description: description.slice(0, 420),
    geographic: false,
    mapDisplayStatus: "not-mapped",
    nonGeographicReason: "NVD CVE records describe software vulnerabilities, not verified geographic incidents.",
    startedAt: cve.published || now,
    updatedAt: cve.lastModified || cve.published || now,
    ingestedAt: now,
    severity: score ? Math.min(100, Math.round(score * 10)) : 45,
    confidence: 88,
    status: cve.vulnStatus === "Rejected" ? "resolved" : "monitoring",
    sourceName: "NIST National Vulnerability Database",
    sourceUrl: `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cveId)}`,
    sourceType: "Official",
    sourcePublishedAt: cve.published || null,
    tags: ["NVD", cveId, cve.vulnStatus, score && score >= 9 ? "critical-cve" : null].filter(Boolean),
    metadata: {
      verificationStatus: "reported",
      coordinateMethod: "not applicable",
      severityReason: score ? `CVSS base score ${score}.` : "NVD record has no parsed CVSS score.",
      cveId,
      publishedAt: cve.published || null,
      lastModifiedAt: cve.lastModified || null,
      vulnStatus: cve.vulnStatus || null,
      cvss: score,
      weaknesses: cve.weaknesses || [],
      configurations: cve.configurations || [],
      references: cve.references?.referenceData || cve.references || [],
      details: {
        CVE: cveId,
        Status: cve.vulnStatus || "Unknown",
        CVSS: score ?? "Unknown",
        Published: cve.published || "Unknown",
        "Last modified": cve.lastModified || "Unknown",
      },
    },
  });
  return { event: result.valid ? result.event : null, errors: result.errors };
}

export async function fetchNvdEvents(context) {
  const targets = (context.nvdCveIds || []).slice(0, 20);
  if (!targets.length) {
    return {
      events: [],
      rejected: [],
      status: "healthy",
      warnings: ["NVD enrichment is configured but no focused CVE targets were supplied; bulk CVE download is intentionally disabled."],
      requestAttempted: false,
    };
  }
  const now = new Date(context.now);
  const normalized = [];
  const rejected = [];
  for (const cveId of targets) {
    const params = new URLSearchParams({ cveId });
    const data = await context.fetchJson(`${NVD_CVES_URL}?${params}`, "NVD CVE API");
    for (const vulnerability of data.vulnerabilities || []) {
      const result = normalizeNvdCve(vulnerability, now);
      if (result.event) normalized.push(result.event);
      else rejected.push({ id: cveId, errors: result.errors });
    }
  }
  return { events: normalized, rejected };
}

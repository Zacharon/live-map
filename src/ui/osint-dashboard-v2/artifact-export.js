/**
 * Client-side artifact export helpers (Markdown / JSON / clipboard / download).
 * No network calls. Browser-only for download/clipboard; pure for formatters.
 */

import {
  ARTIFACT_SCHEMA_VERSION,
  ARTIFACT_CAVEATS_V1,
} from "../../artifacts/event-artifacts.js";

function isoOrDash(value) {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Date(n).toISOString();
  } catch {
    return "—";
  }
}

function line(label, value) {
  const text = value == null || value === "" ? "—" : String(value);
  return `- **${label}:** ${text}`;
}

function relatedBullet(ref) {
  const reasons = Array.isArray(ref.matchReasons) && ref.matchReasons.length
    ? ref.matchReasons.join(", ")
    : "related";
  const when = isoOrDash(ref.occurredAt);
  const source = ref.sourceName || ref.provider || "Unknown source";
  return `- \`${ref.eventId}\` — ${ref.title || "Untitled"} — ${source} — ${when} — (${reasons})`;
}

function fieldBullet(field) {
  const value = field.present ? String(field.value) : "—";
  return `- **${field.label || field.key}:** ${value}`;
}

/**
 * Human-readable Markdown with required section headers.
 * @param {object} artifact
 * @returns {string}
 */
export function artifactToMarkdown(artifact) {
  if (!artifact || typeof artifact !== "object") {
    return [
      "## Artifact Summary",
      "",
      "No artifact available.",
      "",
      "## Event / Cluster Details",
      "",
      "—",
      "",
      "## Source Attribution",
      "",
      "—",
      "",
      "## Location",
      "",
      "—",
      "",
      "## Timeline",
      "",
      "—",
      "",
      "## Related Events",
      "",
      "—",
      "",
      "## Normalized Fields",
      "",
      "—",
      "",
      "## Analyst Notes",
      "",
      "—",
      "",
      "## Caveats",
      "",
      ...ARTIFACT_CAVEATS_V1.map((c) => `- ${c}`),
      "",
      "## Generated Metadata",
      "",
      line("Schema version", ARTIFACT_SCHEMA_VERSION),
    ].join("\n");
  }

  const isCluster = artifact.artifactType === "cluster";
  const source = artifact.source || {};
  const related = isCluster
    ? (artifact.representativeEvents || artifact.relatedEvents || [])
    : (artifact.relatedEvents || []);
  const fields = artifact.normalizedFields || [];
  const caveats = artifact.caveats || artifact.limitations || ARTIFACT_CAVEATS_V1;
  const confidence = artifact.confidence?.display ?? "Not scored in v1";
  const corroboration = artifact.corroboration?.display
    ?? (artifact.corroborationCount != null ? String(artifact.corroborationCount) : "—");

  const summaryLines = isCluster
    ? [
      line("Artifact type", "cluster"),
      line("Title", artifact.title),
      line("Cluster ID", artifact.clusterId),
      line("Event count", artifact.eventCount),
      line("Severity", artifact.severity || artifact.severitySummary),
      line("Confidence", confidence),
      line("Corroboration", corroboration),
    ]
    : [
      line("Artifact type", "event"),
      line("Title", artifact.title),
      line("Event ID", artifact.eventId),
      line("Severity", artifact.severity),
      line("Domain", artifact.domainLabel || artifact.domain),
      line("Category", artifact.category),
      line("Confidence", confidence),
      line("Corroboration", corroboration),
    ];

  const detailLines = isCluster
    ? [
      line("Attention", artifact.attentionLabel),
      line("Domain", artifact.domainLabel || artifact.domain),
      line("Category / type", artifact.typeLabel || artifact.category),
      line("Sources", artifact.providerSummary || (artifact.sources || []).join(", ")),
      line("Source count", artifact.sourceCount),
    ]
    : [
      line("Provider ID", artifact.providerId),
      line("Type label", artifact.typeLabel),
      line("Cluster ID", artifact.clusterId),
      line("Change status", artifact.context?.changeStatus),
    ];

  const sourceLines = isCluster
    ? [
      line("Providers / sources", artifact.providerSummary || (artifact.sources || []).join(", ")),
      line("Source count", artifact.sourceCount),
    ]
    : [
      line("Source name", artifact.sourceName || source.sourceName),
      line("Source URL", artifact.sourceUrl || source.sourceUrl),
      line("Provider", artifact.providerName || source.provider),
      line("Provider URL", source.providerUrl),
      line("Source type", source.sourceType),
      line("Source tier", source.sourceTier),
      line("Verification", source.verificationStatus),
    ];

  const locationLines = isCluster
    ? [
      line("Location summary", artifact.locationSummary || artifact.locationLabel),
    ]
    : [
      line("Location", artifact.locationLabel),
      line("Country", artifact.country),
      line("Latitude", artifact.latitude),
      line("Longitude", artifact.longitude),
      line("Geographic", artifact.geographic),
    ];

  const timelineLines = isCluster
    ? [
      line("Started", isoOrDash(artifact.startedAt)),
      line("Ended", isoOrDash(artifact.endedAt)),
    ]
    : [
      line("Occurred", isoOrDash(artifact.occurredAt)),
      line("Updated", isoOrDash(artifact.updatedAt)),
    ];

  const relatedLines = related.length
    ? related.map(relatedBullet)
    : ["- None in current in-memory view."];

  const fieldLines = fields.length ? fields.map(fieldBullet) : ["- —"];

  return [
    "## Artifact Summary",
    "",
    ...summaryLines,
    "",
    "## Event / Cluster Details",
    "",
    ...detailLines,
    "",
    "## Source Attribution",
    "",
    ...sourceLines,
    "",
    "## Location",
    "",
    ...locationLines,
    "",
    "## Timeline",
    "",
    ...timelineLines,
    "",
    "## Related Events",
    "",
    ...relatedLines,
    "",
    "## Normalized Fields",
    "",
    ...fieldLines,
    "",
    "## Analyst Notes",
    "",
    artifact.analystNotes || "—",
    "",
    "## Caveats",
    "",
    ...caveats.map((c) => `- ${c}`),
    "",
    "## Generated Metadata",
    "",
    line("Artifact ID", artifact.artifactId),
    line("Schema version", artifact.schemaVersion || ARTIFACT_SCHEMA_VERSION),
    line("Generated at", artifact.generatedAt),
    line("Artifact type", artifact.artifactType),
    "",
  ].join("\n");
}

/**
 * Stable JSON-serializable object.
 * @param {object} artifact
 * @returns {object}
 */
export function artifactToJson(artifact) {
  if (!artifact || typeof artifact !== "object") {
    return {
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      artifactType: "unknown",
      artifactId: "unknown",
      generatedAt: new Date().toISOString(),
      error: "No artifact",
    };
  }
  // Structured clone via JSON to drop non-serializable values and ensure stability.
  const clone = JSON.parse(JSON.stringify(artifact));
  clone.schemaVersion = artifact.schemaVersion || ARTIFACT_SCHEMA_VERSION;
  return clone;
}

export function artifactToJsonString(artifact, pretty = true) {
  return JSON.stringify(artifactToJson(artifact), null, pretty ? 2 : 0);
}

function slugPart(value) {
  return String(value || "artifact")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "artifact";
}

export function artifactFilename(artifact, ext = "json") {
  const kind = artifact?.artifactType === "cluster" ? "cluster" : "event";
  const id = slugPart(artifact?.eventId || artifact?.clusterId || artifact?.artifactId || "id");
  const day = (artifact?.generatedAt || new Date().toISOString()).slice(0, 10).replace(/-/g, "");
  return `live-map-${kind}-artifact-v1-${id}-${day}.${ext}`;
}

/**
 * Download a text file via Blob + object URL (browser only).
 */
export function downloadTextFile(filename, text, mimeType = "text/plain") {
  if (typeof document === "undefined") return false;
  try {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

export function downloadArtifactMarkdown(artifact) {
  return downloadTextFile(
    artifactFilename(artifact, "md"),
    artifactToMarkdown(artifact),
    "text/markdown;charset=utf-8",
  );
}

export function downloadArtifactJson(artifact) {
  return downloadTextFile(
    artifactFilename(artifact, "json"),
    artifactToJsonString(artifact, true),
    "application/json;charset=utf-8",
  );
}

/**
 * Copy text with clipboard API and safe fallback.
 * @returns {Promise<boolean>}
 */
export async function copyTextToClipboard(text) {
  const value = String(text ?? "");
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through
  }
  if (typeof document === "undefined") return false;
  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return Boolean(ok);
  } catch {
    return false;
  }
}

export async function copyArtifactMarkdown(artifact) {
  return copyTextToClipboard(artifactToMarkdown(artifact));
}

export async function copyArtifactJson(artifact) {
  return copyTextToClipboard(artifactToJsonString(artifact, true));
}

/**
 * Run export action by name.
 * @param {"copy-md"|"download-md"|"copy-json"|"download-json"} action
 * @param {object} artifact
 * @returns {Promise<boolean>}
 */
export async function runArtifactExportAction(action, artifact) {
  switch (action) {
    case "copy-md":
      return copyArtifactMarkdown(artifact);
    case "download-md":
      return downloadArtifactMarkdown(artifact);
    case "copy-json":
      return copyArtifactJson(artifact);
    case "download-json":
      return downloadArtifactJson(artifact);
    default:
      return false;
  }
}

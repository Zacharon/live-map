/**
 * Audience-specific allowlisted projection. Do not ship the case and hide fields in CSS.
 */

const ALLOWED_GEOMETRY_PRECISION = new Set(["region", "unknown"]);

function safeHttps(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export function projectPublicAssessment(assessment, caseObject = {}, { audience = "public-map" } = {}) {
  const operational = caseObject.lastOperational || {};
  const dimensions = {};
  const maritimeSignals = Object.fromEntries(Object.entries(assessment.extra?.result?.maritimeSignals || operational.maritimeSignals || {}).map(([id, value]) => [id, {
    id, label: value.label, state: value.state || "unknown", note: value.note,
    evaluatedAt: value.evaluatedAt || null, knowledgeCutoff: value.knowledgeCutoff || null,
    confidence: value.confidence || "unknown", coverage: value.coverage || "unknown",
    currentEvidenceCount: (value.currentEvidenceIds || []).length,
    unknowns: value.unknowns || [],
  }]));
  for (const [id, value] of Object.entries(operational.dimensions || assessment.extra?.result?.dimensions || {})) {
    dimensions[id] = {
      id,
      state: value.state || "unknown",
      reasons: (value.reasons || []).slice(0, 3),
    };
  }
  const historical = (caseObject.evidence || []).filter((record) => record.extra?.historicalPublic || record.extra?.frozenSample);
  const sample = historical[0] || null;
  const dates = historical.map((record) => String(record.observedAt || "").slice(0, 10)).filter(Boolean).sort();
  const provenance = sample ? {
    acquisition: "historical_public",
    live: false,
    sourceUrl: safeHttps(sample.sourceUrl),
    queryUrl: safeHttps(sample.extra?.queryUrl || sample.canonicalUrl),
    observationPeriod: dates.length ? { start: dates[0], end: dates.at(-1) } : null,
    publicationDate: sample.extra?.publicationTimestamp || null,
    publicationDateNote: sample.extra?.publicationTimestampReason || "unknown",
    retrievedAt: sample.retrievedAt || null,
    originalUnit: sample.unit || null,
    geographicCoverage: sample.extra?.geographicCoverage || "unknown",
    limitations: sample.extra?.measurementMeaning || "unknown",
    reuseTerms: sample.extra?.reuseTerms || sample.rightsAttribution || "unknown",
  } : null;
  const evidence = (caseObject.evidence || []).map((record) => ({
    id: record.id,
    kind: record.evidenceKind,
    recordKind: record.recordKind,
    title: record.title,
    observedAt: record.observedAt,
    valueOrigin: record.valueOrigin,
    synthetic: record.synthetic === true,
    sourceId: record.sourceId || null,
    sourceUrl: safeHttps(record.sourceUrl),
    geometryPrecision: ALLOWED_GEOMETRY_PRECISION.has(record.geometryPrecision) ? record.geometryPrecision : "region",
  }));
  return {
    kind: "public-projection",
    audience,
    asOf: assessment.extra?.knowledgeCutoff || assessment.extra?.evaluationTime || null,
    chokepointId: assessment.chokepointId,
    title: assessment.title,
    explanation: assessment.summary,
    operationalStatus: assessment.extra?.result?.operational || operational.operationalStatus || "unknown",
    evidenceRank: assessment.extra?.result?.evidenceRank || operational.evidenceRank || "insufficient",
    dimensions,
    maritimeSignals,
    synthetic: assessment.synthetic === true,
    provenance,
    limitations: (assessment.extra?.gaps || operational.caveats || []).slice(0, 8),
    contradictionsVisible: (assessment.extra?.contradictions || []).length > 0,
    evidence,
    reviewState: assessment.extra?.reviewState || "draft",
    method: "L01–L11 operational evaluator; thresholds engineering-default-unvalidated",
    withheld: [
      "private notes",
      "local filesystem paths",
      "credentials",
      "precise restricted geometry",
      "full investigation graph",
    ],
  };
}

export function renderPublicMarkdown(projection) {
  const dims = Object.values(projection.dimensions || {}).map((item) => `- ${item.id}: ${item.state}`).join("\n");
  const maritime = Object.values(projection.maritimeSignals || {}).map((item) => `- ${item.label}: ${item.state}. Current evidence: ${item.currentEvidenceCount || 0}. Assessed: ${item.evaluatedAt || "unknown"}; known by: ${item.knowledgeCutoff || "unknown"}. Confidence: ${item.confidence}; coverage: ${item.coverage}. ${item.note} ${(item.unknowns || []).join(" ")}`).join("\n");
  const evidence = (projection.evidence || []).map((item) => `- ${item.id} · ${item.kind} · ${item.valueOrigin}${item.synthetic ? " · SYNTHETIC" : ""}`).join("\n");
  return [
    `# ${projection.title}`,
    "",
    `As of: ${projection.asOf || "unspecified"}`,
    `Audience: ${projection.audience}`,
    `Operating status: ${projection.operationalStatus} (not a composite risk score)`,
    `Evidence rank: ${projection.evidenceRank}`,
    `Review state: ${projection.reviewState}`,
    "",
    "## Independent dimensions",
    dims || "- none evaluated",
    "",
    "## Independent maritime signals",
    maritime || "- No maritime evidence assessment available; unknown is not zero.",
    "",
    "## Evidence (attributed, public-safe)",
    evidence || "- none",
    "",
    ...(projection.provenance ? [
      "## Provenance",
      `- Acquisition: ${projection.provenance.acquisition}`,
      `- Source: ${projection.provenance.sourceUrl || "unknown"}`,
      `- Observation period: ${projection.provenance.observationPeriod ? `${projection.provenance.observationPeriod.start} through ${projection.provenance.observationPeriod.end}` : "unknown"}`,
      `- Publication date: ${projection.provenance.publicationDate || "unknown"} (${projection.provenance.publicationDateNote || "unknown"})`,
      `- Retrieved: ${projection.provenance.retrievedAt || "unknown"}`,
      `- Original unit: ${projection.provenance.originalUnit || "unknown"}`,
      `- Geographic coverage: ${projection.provenance.geographicCoverage || "unknown"}`,
      `- Limitations: ${projection.provenance.limitations || "unknown"}`,
      `- Reuse: ${projection.provenance.reuseTerms || "unknown"}`,
      "",
    ] : []),
    "## Limitations",
    ...(projection.limitations || []).map((item) => `- ${item}`),
    "",
    projection.synthetic ? "SYNTHETIC OR FIXTURE CONTENT — not a current-events claim." : "Informational public-information product. Not operational guidance.",
    "",
    "Withheld from this projection: " + (projection.withheld || []).join("; ") + ".",
  ].join("\n");
}

export function assertProjectionSafe(projection) {
  const blob = JSON.stringify(projection);
  const errors = [];
  if (/[A-Za-z]:\\Users\\|\/home\/[\w.-]+/i.test(blob)) errors.push("filesystem-path-leak");
  if (/api[_-]?key|secret|password|Bearer\s+/i.test(blob)) errors.push("credential-leak");
  if (projection.notes || projection.privateNotes) errors.push("private-notes-present");
  return { ok: errors.length === 0, errors };
}

export function classifyRipestatObservation(record = {}) {
  const visibility = Number(record.visibility ?? record.visibilityScore);
  const rpki = String(record.rpkiStatus || record.validity || "").toLowerCase();
  if (Number.isFinite(visibility) && visibility < 25) {
    return { material: true, type: "internet-routing-visibility-drop", severity: 68, reason: "RIPEstat visibility fell below the configured threshold." };
  }
  if (["invalid", "not-found-invalid"].includes(rpki)) {
    return { material: true, type: "rpki-route-origin-invalid", severity: 58, reason: "RIPEstat reported an RPKI route-origin validity problem." };
  }
  return { material: false, type: "internet-routing-observation", severity: 30, reason: "Observation did not cross anomaly thresholds." };
}


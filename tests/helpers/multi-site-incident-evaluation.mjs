// Evaluation-only contract: no production provider or API imports this module.
export function validateMultiSiteIncidentFixture(input) {
  const errors = [];
  const require = (condition, message) => { if (!condition) errors.push(message); };
  require(input?.mode === "frozen-evaluation" && input?.live === false, "fixture must remain frozen, never live");
  require(input?.label?.startsWith("Frozen evaluation fixture"), "frozen label required");
  const checkField = (field, path) => {
    require(field && typeof field === "object", `${path}: evidence field required`);
    if (!field) return;
    for (const key of ["value", "source", "publisher", "publishedAt", "eventDate", "observedAt", "retrievedAt", "claimantType", "claimant", "scope", "confidence", "verification", "evidenceKind", "provenance"]) {
      require(Object.hasOwn(field, key), `${path}: missing ${key}`);
    }
    const source = input.sources?.[field.sourceId];
    if (field.sourceId) {
      require(Boolean(source), `${path}: missing source`);
      require(field.source === source?.url && field.publisher === source?.publisher && field.publishedAt === source?.publishedAt && field.retrievedAt === source?.retrievedAt && field.provenance === source?.retrieval, `${path}: provenance mismatch`);
      require(Boolean(field.claimantType && field.claimant && field.scope), `${path}: attribution required`);
      require(field.evidenceKind === "claim", `${path}: sourced claim cannot become observation`);
    } else {
      require(field.evidenceKind === "unknown" && [null, "unknown"].includes(field.value), `${path}: unsourced value must remain unknown`);
      require(field.source === null && field.publisher === null && field.claimant === null, `${path}: unsourced attribution must remain empty`);
    }
    // This frozen snapshot contains no independently established observations.
    require(field.verification === "unverified" && field.confidence === "unknown" && field.observedAt === null, `${path}: no independent verification in this snapshot`);
  };
  require(input?.sites?.length === 4, "four distinct sites required");
  require(new Set(input?.sites?.map(site => site.id)).size === 4, "site ids must be unique");
  for (const site of input?.sites || []) {
    require(site.geography?.geometry === null && site.geography?.precision === "region-label-only", `${site.id}: no sourced geometry`);
    for (const key of ["reportedAttack", "physicalDamageClaimed", "physicalDamageObserved", "operationalStatus", "casualties", "commercialServiceEffects"]) checkField(site[key], `${site.id}.${key}`);
    require(site.physicalDamageObserved?.value === null, `${site.id}: claimed damage is not observed damage`);
    require(site.operationalStatus?.value === "unknown", `${site.id}: facility operations unknown`);
    require(site.casualties?.value === null, `${site.id}: aggregate casualties cannot be allocated`);
    require(site.restorationUpdates?.length === 0 && site.restorationStatus === "pending", `${site.id}: restoration not sourced`);
    const expected = { severity: "unknown", confidence: "unknown", impact: "unknown", corroboration: 0, freshness: "frozen", completeness: "partial" };
    require(Object.keys(site.dimensions || {}).length === 6 && Object.entries(expected).every(([key, value]) => site.dimensions?.[key] === value), `${site.id}: assessment dimensions must remain separate and unsupported values unknown`);
  }
  for (const record of input?.nonSiteRecords || []) checkField(record.evidence, record.id);
  const interceptions = input?.nonSiteRecords?.find(record => record.id === "mod-interceptions");
  require(interceptions?.kind === "interception-claim" && interceptions?.evidence?.claimantType === "official-military" && interceptions?.unit === "drones-claimed-intercepted" && interceptions?.launchTotal === null && interceptions?.physicalDamage === null, "interceptions are military claims, not launches or damage");
  const terms = input?.nonSiteRecords?.find(record => record.id === "ceasefire-terms");
  require(terms?.mutuallyConfirmedTerms === null && terms?.evidence?.provenance === "brief-only", "ceasefire terms unconfirmed");
  return { valid: errors.length === 0, errors };
}

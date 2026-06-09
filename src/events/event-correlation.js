function toRad(value) {
  return (value * Math.PI) / 180;
}

export function distanceKm(a, b) {
  const earthRadius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function correlateEventsToMarkets(events = [], exchanges = [], now = Date.now()) {
  const important = events.filter((event) => ["critical", "high"].includes(event.severity));
  const correlations = [];
  for (const event of important) {
    const entityIds = event.metadata?.companyIdentity?.id ? [event.metadata.companyIdentity.id] : [];
    const instrumentIds = event.metadata?.tickerSymbols || [];
    if (event.domain === "finance-markets" && (entityIds.length || instrumentIds.length)) {
      correlations.push({
        id: `${event.id}-issuer`,
        relationshipType: "Issuer disclosure",
        eventId: event.id,
        entityId: entityIds[0] || null,
        instrumentId: instrumentIds[0] || null,
        confidence: 86,
        explanation: `${event.title} is associated with the disclosed issuer or ticker metadata. This is not evidence of price impact or causality and requires analyst review.`,
        temporalProximity: "same filing record",
        geographicProximity: "not applicable",
        evidence: [event.sourceUrl].filter(Boolean),
        analystReviewRequired: true,
        generatedAt: now,
      });
    }
    if (event.domain === "commodity-supply-chain") {
      correlations.push({
        id: `${event.id}-commodity-signal`,
        relationshipType: "Commodity category signal",
        eventId: event.id,
        entityId: event.metadata?.commodity || event.subtype || null,
        instrumentId: null,
        confidence: 72,
        explanation: `${event.title} is associated with a commodity category by official source metadata. This does not claim market causality and requires analyst review.`,
        temporalProximity: "same official observation window",
        geographicProximity: event.geographic === false ? "not applicable" : "provider supplied",
        evidence: [event.sourceUrl].filter(Boolean),
        analystReviewRequired: true,
        generatedAt: now,
      });
    }
    if (event.geographic === false || !Number.isFinite(Number(event.lat)) || !Number.isFinite(Number(event.lon))) continue;
    for (const exchange of exchanges) {
      const distance = distanceKm({ lat: event.lat, lon: event.lon }, exchange.coordinates);
      if (distance <= 750) {
        correlations.push({
          id: `${event.id}-${exchange.id}`,
          relationshipType: "Geographically proximate",
          eventId: event.id,
          entityId: exchange.id,
          instrumentId: exchange.primaryIndex || null,
          marketEntityId: exchange.id,
          distanceKm: Math.round(distance),
          timeDifferenceMinutes: Math.round((now - Number(event.occurredAt || now)) / 60000),
          confidence: distance < 250 ? 68 : 45,
          explanation: `${event.title} is geographically proximate to ${exchange.name}. This is not evidence of causality and requires analyst review.`,
          temporalProximity: `${Math.round((now - Number(event.occurredAt || now)) / 60000)} minutes`,
          geographicProximity: `${Math.round(distance)} km`,
          evidence: [event.sourceUrl].filter(Boolean),
          analystReviewRequired: true,
          generatedAt: now,
        });
      }
    }
  }
  return correlations.slice(0, 12);
}

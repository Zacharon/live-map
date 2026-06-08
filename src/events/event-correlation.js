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
    for (const exchange of exchanges) {
      const distance = distanceKm({ lat: event.lat, lon: event.lon }, exchange.coordinates);
      if (distance <= 750) {
        correlations.push({
          id: `${event.id}-${exchange.id}`,
          eventId: event.id,
          marketEntityId: exchange.id,
          relationshipType: "Geographically proximate",
          distanceKm: Math.round(distance),
          timeDifferenceMinutes: Math.round((now - Number(event.occurredAt || now)) / 60000),
          confidence: distance < 250 ? 68 : 45,
          explanation: `${event.title} is geographically proximate to ${exchange.name}. This is not evidence of causality and requires analyst review.`,
          generatedAt: now,
        });
      }
    }
  }
  return correlations.slice(0, 12);
}

// Display priority is not verification. No source-volume signal is used here.
const severity = { critical: 4, high: 3, medium: 2, low: 1 };
export const wrapLongitude = (lon) => ((lon + 180) % 360 + 360) % 360 - 180;
export function inViewport(lat, lon, box) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return false;
  if (!box) return true;
  if (lat < box.south || lat > box.north) return false;
  if (box.east - box.west >= 360) return true;
  const west = wrapLongitude(box.west), east = wrapLongitude(box.east), x = wrapLongitude(lon);
  return west <= east ? x >= west && x <= east : x >= west || x <= east;
}
export function zoomBand(zoom) { return zoom < 4 ? 'world' : zoom < 7 ? 'regional' : 'local'; }
export function attentionOrder(a, b) {
  return (severity[b.severity] || 0) - (severity[a.severity] || 0)
    || (Number(b.impactScore) || 0) - (Number(a.impactScore) || 0)
    || (Number(b.confidence) || 0) - (Number(a.confidence) || 0)
    || (Number(b.occurredAt) || 0) - (Number(a.occurredAt) || 0)
    || String(a.id).localeCompare(String(b.id));
}
export function selectMapEvents(filtered, { zoom = 2, bbox, selectedId } = {}) {
  const band = zoomBand(zoom), budget = { world: 18, regional: 80, local: 240 }[band];
  const eligible = filtered.filter(e => e.geographic !== false && inViewport(e.lat, e.lon, bbox)).sort(attentionOrder);
  const minimumSeverity = { world: 3, regional: 2, local: 0 }[band];
  const candidates = eligible.filter(e => (severity[e.severity] || 0) >= minimumSeverity);
  const displayed = candidates.slice(0, budget);
  const selected = eligible.find(e => e.id === selectedId);
  const selectionIncluded = Boolean(selected && !displayed.includes(selected));
  if (selectionIncluded) {
    if (displayed.length === budget) displayed.pop();
    displayed.push(selected);
  }
  const hiddenByScale = eligible.filter(e => (severity[e.severity] || 0) < minimumSeverity && e !== selected).length;
  const hiddenByBudget = eligible.length - displayed.length - hiddenByScale;
  const scaleExplanation = { world: 'Major events (high/critical). Zoom in for medium and lower severity.', regional: 'Medium, high and critical events. Zoom in for lower severity.', local: 'All severities eligible.' }[band];
  return { band, budget, displayed, eligible: eligible.length, summarized: eligible.length - displayed.length,
    hiddenByScale, hiddenByBudget, selectionIncluded,
    explanation: `${scaleExplanation}${selectionIncluded ? ' Inspected event retained within the marker limit.' : ''} Priority: severity, reported impact, confidence, event time. Display priority is not verification. Nearby markers are display groups, not verified incidents.` };
}
export function selectMovingObjects(objects, { bbox, aircraft, vessels, limit = 500, now = Date.now() }) {
  const latest = new Map();
  const tracks = new Map();
  for (const object of objects) {
    if (!(object.objectType === 'aircraft' ? aircraft : object.objectType === 'vessel' && vessels)) continue;
    if (!inViewport(object.latitude, object.longitude, bbox) || !Number.isFinite(object.observedAt)) continue;
    if(!tracks.has(object.id)) tracks.set(object.id,[]);
    tracks.get(object.id).push(...(object.observedTrack || []),{latitude:object.latitude,longitude:object.longitude,observedAt:object.observedAt});
    if (!latest.has(object.id) || object.observedAt > latest.get(object.id).observedAt) latest.set(object.id, object);
  }
  return [...latest.values()].sort((a,b) => b.observedAt-a.observedAt || String(a.id).localeCompare(String(b.id))).slice(0,limit)
    .map(o => ({ ...o, stale: Boolean(o.stale || now - o.observedAt > 600000),observedTrack:[...new Map(tracks.get(o.id).filter(p=>inViewport(p.latitude,p.longitude,bbox) && Number.isFinite(p.observedAt) && p.observedAt<=o.observedAt).map(p=>[p.observedAt,p])).values()].sort((a,b)=>a.observedAt-b.observedAt).slice(-20) }));
}

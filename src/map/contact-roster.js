import { distanceKm } from '../events/event-deduplication.js';
import { inViewport } from './attention-policy.js';
import { escapeHtml, safeSourceUrl } from '../events/event-normalizer.js';

// Contacts UX inspired by gods-eye-view; this Leaflet implementation operates
// only on the already fetched, bounded observation set. It never expands fetches.
export function nearbyContacts(objects, center, bbox, limit = 30) {
  return objects.filter(object => inViewport(object.latitude, object.longitude, bbox))
    .map(object => ({ ...object, distanceKm: distanceKm(center, object) }))
    .filter(object => Number.isFinite(object.distanceKm) && object.distanceKm <= 250)
    .sort((a,b) => a.distanceKm-b.distanceKm || String(a.id).localeCompare(String(b.id)))
    .slice(0, limit);
}

export function renderContactRoster(objects, selectedId, returnAvailable) {
  return `<div class="contact-heading"><strong>Nearby contacts</strong><span>Within 250 km · available observations</span></div>
    ${returnAvailable ? '<button type="button" data-contact-return>Return to previous view</button>' : ''}
    ${objects.length ? objects.map(object => `<button type="button" class="contact-row" data-contact-id="${escapeHtml(object.id)}" aria-pressed="${object.id===selectedId}"><span>${object.objectType==='aircraft'?'✈':'▴'} ${escapeHtml(object.displayName)}</span><small>${Math.round(object.distanceKm)} km · ${object.stale?'Delayed':'Observed'}</small></button>`).join('') : '<p class="contact-empty">No available contacts nearby. Enable aircraft or vessels and zoom to local scale.</p>'}`;
}

export function renderContactDetail(object) {
  if (!object) return '';
  const sourceUrl = safeSourceUrl(object.sourceUrl);
  const timestamp = new Date(object.observedAt);
  // Server public view flattens this metadata; local/demo normalizers can nest it.
  const provenance=object.providerMetadata?.public || object.providerMetadata || {};
  const license=safeSourceUrl(provenance.licenseUrl);
  return `<div class="contact-heading"><strong>${escapeHtml(object.displayName)}</strong><button type="button" data-contact-close aria-label="Close contact">×</button></div>
    <p>${escapeHtml(object.objectType)} · ${object.stale?'Delayed position':'Observed position'}</p>
    <dl><dt>Position observed</dt><dd>${Number.isFinite(timestamp.getTime())?escapeHtml(timestamp.toISOString()):'Not supplied'}</dd><dt>Heading</dt><dd>${Number.isFinite(object.heading)?Math.round(object.heading)+'°':'Not supplied'}</dd><dt>Observed track</dt><dd>${object.observedTrack?.length || 1} samples · no predicted movement</dd></dl>
    <p>${sourceUrl?`<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(object.sourceName || 'Source')}</a>`:escapeHtml(object.sourceName || 'Source not supplied')}</p>
    ${license ? `<p><a href="${escapeHtml(license)}" target="_blank" rel="noopener noreferrer">${escapeHtml(provenance.licenseId || "Data license")}</a> · ${escapeHtml(provenance.attribution || object.sourceName || "")}</p>` : ""}
    ${provenance.coverage ? `<p>${escapeHtml(provenance.coverage)}</p>` : ""}
    ${provenance.changes ? `<p>${escapeHtml(provenance.changes)}</p>` : ""}
    ${provenance.timestampBasis ? `<p>${escapeHtml(provenance.timestampBasis)}</p>` : ""}`;
}

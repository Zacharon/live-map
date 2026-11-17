import { CATEGORIES, SEVERITIES } from "../config.js";
import { escapeHtml, exactTime, relativeTime, safeSourceUrl } from "../events/event-normalizer.js";
import { normalizeVerificationStatus } from "../events/event-quality.js";

export function verificationLabel(value) {
  return {
    "primary-confirmed": "Primary confirmed", corroborated: "Corroborated",
    "single-source": "Single source", reported: "Reported", observed: "Observed",
    disputed: "Disputed", corrected: "Corrected", retracted: "Retracted",
    unverified: "Unverified",
  }[normalizeVerificationStatus(value)];
}

export function renderWatchEventCard(event, { cardMode = "compact", selectedEventId = null, changeStatus = null } = {}) {
  const expanded = cardMode === "expanded";
  const category = CATEGORIES[event.category] || CATEGORIES.other;
  const severity = SEVERITIES[event.severity] || SEVERITIES.low;
  const sourceUrl = safeSourceUrl(event.sourceUrl);
  const confidence = Number.isFinite(event.confidence) ? `${Math.round(event.confidence)}%` : "Not scored";
  const status = verificationLabel(event.verificationStatus);
  const location = event.geographic === false ? "No supported map location" : event.place || event.country || "Location unknown";
  const selected = String(event.id) === String(selectedEventId);
  const changed = ["new", "updated"].includes(changeStatus) ? changeStatus : "";
  return `<article class="event-card ${expanded ? "expanded" : "compact"} record-${escapeHtml(event.recordKind || "event")}${selected ? " is-selected" : ""}${changed ? ` is-${changed}` : ""}" data-id="${escapeHtml(event.id)}" ${selected ? 'aria-current="true"' : ""}>
    <div class="event-meta"><span class="category-pill" style="--cat:${event.taxonomyColor || category.color}">${escapeHtml(event.domainLabel || category.label)}</span><span class="severity-tag" style="--sev:${severity.color}">${escapeHtml(severity.label)}</span>${changed ? `<span class="change-badge change-badge-${changed}">${changed === "new" ? "New" : "Updated"}</span>` : ""}</div>
    <h2><button type="button" class="event-title-button" data-event-detail="${escapeHtml(event.id)}">${escapeHtml(event.title)}</button></h2>
    <div class="consumer-card-line"><span>${escapeHtml(location)}</span><time title="Occurrence: ${escapeHtml(exactTime(event.occurredAt))}">${event.occurredAt == null ? 'Time unknown' : escapeHtml(new Date(event.occurredAt).toLocaleString('en-GB', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'UTC' })) + ' UTC'}</time></div>
    ${expanded ? `<p class="event-summary">${escapeHtml(event.summary || "No summary supplied.")}</p><dl class="event-facts"><div><dt>Occurred</dt><dd>${escapeHtml(exactTime(event.occurredAt))}</dd></div><div><dt>Published</dt><dd>${escapeHtml(exactTime(event.firstReportedAt))}</dd></div><div><dt>Confidence</dt><dd>${confidence}</dd></div></dl>` : ""}
    <div class="source-row standard-source-row"><span>${escapeHtml(event.sourceName || "Unknown source")}</span><span class="verification-label" data-verification="${escapeHtml(event.verificationStatus || "unverified")}">${status}</span>${sourceUrl ? `<a class="mini-source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Source ↗</a>` : ""}<button type="button" class="mini-source-link event-detail-button" data-event-detail="${escapeHtml(event.id)}">Inspect</button></div>
  </article>`;
}

export function workspaceCoverage({ demo, dataMode, sourceStatus = {}, apiStatus, apiFailure,localPreview }) {
  if (demo || dataMode === "mixed") return { label: "Synthetic demo", detail: "Invented map reports. Historical measurements are labeled separately.", status: "synthetic" };
  if (apiStatus === "loading") return { label: "Loading coverage", detail: "Awaiting the event API. No coverage claim yet.", status: "loading" };
  if (apiFailure && apiFailure.kind !== 'offline-preview') return { label: "Data unavailable", detail: "The API failed. Retained records are cached; current coverage is unknown.", status: "unavailable" };
  if (localPreview) {
    const rows=localPreview.sources||[],good=rows.filter(s=>s.status==='healthy'&&!s.stale).length;
    return {label:good===rows.length?'Public sources retrieved':`${good}/${rows.length} sources current`,detail:rows.map(s=>s.coverage).join(' ')+(localPreview.cacheOnly?' Saved public reads; no new upstream retrieval.':' Other domains are not connected in this local preview.'),status:good===rows.length?'available':'partial'};
  }
  const providers = Object.values(sourceStatus);
  const healthy = providers.filter((item) => item.ok && !item.stale && !['degraded', 'unavailable', 'stale', 'configuration-required', 'disabled'].includes(item.status)).length;
  const stale = providers.filter((item) => item.stale).length;
  if (apiFailure && apiFailure.kind !== 'offline-preview') return { label: "Data unavailable", detail: "The API failed. Any retained records are cached; coverage is not current.", status: "unavailable" };
  if (dataMode === "public" && !providers.length) return { label: "Historical snapshots", detail: "Saved public extracts; current operating conditions and unreported areas remain unknown.", status: "historical" };
  if (!providers.length) return { label: "Coverage unknown", detail: "No source diagnostics are available. Loaded records do not establish current coverage.", status: "unknown" };
  return { label: `${healthy}/${providers.length} sources healthy`, detail: `${stale} stale sources. Unreported areas are coverage gaps, not evidence of safety.`, status: stale || healthy < providers.length ? "partial" : "available" };
}

export function renderWorkspaceSummary(container, { state, events, band }) {
  if (!container) return;
  const coverage = workspaceCoverage(state);
  const scope = state.selectedCountryIso3 ? state.selectedCountryIso3+' reports' : state.watchSource ? state.watchSource+' reports' : state.mapView.viewportOnly ? "Map area" : "All loaded regions";
  const undated = events.filter((event) => event.occurredAt === null).length;
  const end = workspaceWindowEnd(state);
  const date = new Date(end).toISOString().slice(0,10);
  const markup = `<div class="scope-fact"><span>${scope}</span><strong>${events.length} reports<small> · ${band.toLowerCase()}${undated ? ` · ${undated} undated` : ""}</small></strong></div><div class="scope-time"><span>${state.mapView.asOf ? 'Historical window' : state.demo ? 'Demo window' : 'Loaded data window'}</span><strong>Ends ${date} · UTC</strong></div><details class="coverage-summary" data-coverage="${coverage.status}"><summary>${escapeHtml(coverage.label)}</summary><div class="coverage-popover"><p>${escapeHtml(coverage.detail)}</p><a href="/sources">Inspect source coverage ↗</a></div></details>`;
  // Preserve an open coverage explanation while the camera changes.
  if (container.dataset.markup !== markup) {
    const wasOpen = container.querySelector('details')?.open;
    container.innerHTML = markup;
    container.dataset.markup = markup;
    if (wasOpen) container.querySelector('details').open = true;
  }
}

export function workspaceWindowEnd(state) {
  const asOf = state.mapView?.asOf ? Date.parse(state.mapView.asOf) : NaN;
  if (Number.isFinite(asOf)) return asOf;
  if (state.demo) return Date.now();
  const dates = (state.events || []).map(e => e.occurredAt).filter(t => typeof t === 'number' && Number.isFinite(t));
  // Saved extracts anchor to their available occurrence range, never retrieval time.
  return !Object.keys(state.sourceStatus || {}).length && dates.length ? Math.max(...dates) : Date.now();
}

export function renderLensGuide(container, state) {
  if (!container) return;
  const lens = state.spaceLens ? 'space' : state.selectedPreset;
  const descriptions = {
    weather: ['Weather desk', '<div class="weather-desk-head"><span>WEATHER MAP</span><strong>Available reports</strong></div><p>Report locations, not radar or a continuous forecast field. Event occurrence and source revision are available in each inspector.</p><div class="weather-key"><span style="--key:#86bfe5">Storm</span><span style="--key:#32c8df">Flood</span><span style="--key:#ff843d">Wildfire</span></div><dl class="weather-frame"><div><dt>Valid time</dt><dd>Per report · UTC</dd></div><div><dt>Radar / forecast field</dt><dd>Not connected</dd></div><div><dt>Wind frame</dt><dd>Synthetic proof only</dd></div></dl><p>Wind arrows point toward flow. The proof uses the 2D map; it has no current meteorological validity.</p><a href="https://www.weather.gov/forecastmaps/" target="_blank" rel="noopener noreferrer">NWS forecast maps ↗</a><a href="https://earth.nullschool.net/" target="_blank" rel="noopener noreferrer">Current wind · Earth Nullschool ↗</a><a href="https://www.windy.com/" target="_blank" rel="noopener noreferrer">Current wind · Windy ↗</a>'+ (state.demo ? '<button type="button" data-wind-proof-toggle>Toggle synthetic wind · 2D map</button>' : '')],
    flights: ['Air desk', '<p>Aircraft observations appear at local scale. Select a nearby contact to see its position time, source and observed track. Airports are reference locations.</p><p>Coverage is incomplete. Delayed positions stay labeled; no global fleet polling.</p><button type="button" data-open-contacts>Open nearby contacts</button>'],
    ships: ['Sea desk', '<p>Vessel observations appear at local scale. Ports and passages are reference context. Position data does not establish cargo, intent or operating conditions.</p><p>Coverage is incomplete. The PortWatch series is a separate historical transit-call estimate.</p><button type="button" data-open-contacts>Open nearby contacts</button>'],
    space: ['Space · module proof', '<p>The orbital module is a bounded software proof. No satellites or live orbital elements are loaded on this globe.</p><p>Basemap: local Natural Earth imagery. It is not current satellite imagery.</p><a href="https://satellitemap.space/" target="_blank" rel="noopener noreferrer">Satellite reference map ↗</a><a href="https://www.nesdis.noaa.gov/imagery/satellite-maps" target="_blank" rel="noopener noreferrer">NOAA imagery reference ↗</a><button type="button" data-open-drawer="left">Inspect available layers</button>'],
  };
  const spec = descriptions[lens];
  container.hidden = !spec;
  if (!spec) return;
  container.querySelector('summary').textContent = spec[0];
  const content=container.querySelector('div');
  if(content.innerHTML !== spec[1]) content.innerHTML=spec[1];
}

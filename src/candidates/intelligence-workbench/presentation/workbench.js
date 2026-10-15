import { createCesiumGlobe } from './cesium-adapter.js';
import { sceneLayers } from './scene-layers.js';
import { workspace, reduceWorkspace } from '../application/workspace.js';
import { projections, LAYERS } from '../application/projections.js';
import { referenceKey } from '../core/time.js';
import { NOW as DEMO_NOW, DATA_VERSION as DEMO_VERSION, scenarioRecords } from '../data/scenario.js';
import { liveRecords } from '../data/live-records.js';
import { REGIONS, matchesFilters, registerPage, recordClock, recordType } from '../application/record-filters.js';
import { SOURCE_DIRECTORY } from '../data/source-directory.js';
import { ENERGY_DIMENSIONS, buildEnergyState } from '../../../intelligence/energy-state.js';
import { cameraHeightFromLeafletZoom, metersPerPixelFromCamera, leafletZoomFromMetersPerPixel } from '../../../map/semantic-bands.js';
import { symbolSvg } from './symbols.js';
import { createInvestigationCase, draftOperationalAssessment } from '../../../intelligence/investigation-cycle.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const demo = params.get('mode')==='demo';
let NOW=demo?DEMO_NOW:Date.now(), DATA_VERSION=demo?DEMO_VERSION:'public-beta/1';
let state = workspace({ layout: params.get('layout') || 'systems', view: params.get('view'), camera: { lat: 20, lon: 24, zoom: 2.65 },timeMode:demo?'known':'situation' }, NOW);
let records = demo?scenarioRecords():[], sourceStatus={}, loadError=null, refreshTimer=null, refreshing=false;
const initialSelection = records.find(r => r.ref.id === params.get('selected'));
if (initialSelection) state = reduceWorkspace(state, { type: 'select', ref: initialSelection.ref });
let rows = [], globe = null, layerRuntime = null, leaflet = null, leafMarkers = new Map(), basemap = null, labelBasemap = null;
let basemapLoaded=0,basemapErrors=0,labelTilesLoaded=0,labelTilesErrors=0;
let previousCamera = null, availability = params.get('availability') || 'synthetic';
let destroyed = false, updates = 0, listenerCount = 0, fieldKey = null;
let renderFrame = null, noticeTimer = null, applyingCamera = false;
let recordPage = 0;
const typeLabels = {earthquake:'Earthquakes',weather:'Weather alerts',storm:'Storms',wildfire:'Wildfires',flood:'Floods',volcano:'Volcanoes',drought:'Droughts',tsunami:'Tsunamis','space-weather':'Space weather',satellite:'Satellites',other:'Other events'};
const unbind = [];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const utc = value => value == null || !Number.isFinite(Number(value)) ? 'Unknown' : `${new Date(value).toISOString().slice(0,19).replace('T', ' ')} UTC`;
const recordKind = record => record.source.kind || 'Demo';
const reasonText = reason => ({projected:'Projected in this view', 'layer-disabled':'Layer hidden', 'hidden-at-this-scale':'Hidden at this scale',
  'outside-viewport':'Outside the current area', 'outside-view-frustum':'Outside the camera view', 'earth-occluded':'Hidden behind Earth',
  'unknown-observation-time':'Observation time unknown', 'unknown-knowledge-time':'Knowledge time unknown', 'not-known-at-cutoff':'Not known at this time',
  'observation-after-target':'Observed after this time', 'outside-observation-window':'Outside the observation window',
  'provider-unavailable':'Source unavailable', 'missing-or-unsupported-position':'No source point location', 'withdrawn-revision':'Absent from current snapshot', 'filter-excluded':'Excluded by current filters'})[reason] || reason.replaceAll('-', ' ');
function filters() {return {source:$('sourceFilter').value,type:$('typeFilter').value,region:$('regionFilter').value,days:$('ageFilter').value,search:$('recordFilter').value,energy:$('energyFilter').value};}
function renderEnergyState() {
  const energy=buildEnergyState(records,{asOf:state.asOf,knownAt:state.knownAt});
  const links={PRODUCTION_POLICY:['OPEC policy decision · Oct 4','https://www.opec.org/pr-detail/1891616-4-october-2026.html'],ACTUAL_OUTPUT:['EIA production reports','https://www.eia.gov/petroleum/data.php'],EXPORT_LOADINGS:['JODI export reports','https://www.jodidata.org/oil/database/overview.aspx'],TRANSIT_FLOW:['IMF PortWatch · AIS estimates','https://portwatch.imf.org/'],EMERGENCY_STOCK_RELEASE:['IEA oil security','https://www.iea.org/about/oil-security-and-emergency-response'],RETAIL_WHOLESALE_PRICE:['EIA fuel prices','https://www.eia.gov/petroleum/gasdiesel/']};
  replaceMarkup($('energyStates'),ENERGY_DIMENSIONS.map(d=>{const lane=energy.dimensions[d.id],[label,url]=links[d.id];return `<div class="energy-state"><button data-energy="${d.id}" aria-pressed="${$('energyFilter').value===d.id}">${escape(d.label)}</button><small>${lane.records.length?lane.records.length+' loaded source records':'Unknown · no qualifying records loaded'}</small><p>${escape(d.meaning)}</p><a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a><small>External reference · not imported</small></div>`;}).join(''));
  document.body.dataset.energyState=JSON.stringify(energy);
}
function filterOptions() {
  const source=$('sourceFilter').value,type=$('typeFilter').value;
  const ids=[...new Set([...SOURCE_DIRECTORY.filter(s=>s.id).map(s=>s.id),...records.map(r=>r.ref.source)])];
  const types=[...new Set([...records.map(recordType),...records.filter(r=>r.ref.source==='nws'&&r.metadata.alertEvent).map(r=>`nws:${r.metadata.alertEvent}`)])].sort();
  replaceMarkup($('sourceFilter'),'<option value="all">All sources</option>'+ids.map(id=>`<option value="${escape(id)}">${escape(SOURCE_DIRECTORY.find(s=>s.id===id)?.name||id)} (${records.filter(r=>r.ref.source===id&&!r.withdrawn).length})</option>`).join(''));
  replaceMarkup($('typeFilter'),'<option value="all">All types</option>'+types.map(id=>`<option value="${escape(id)}">${escape(typeLabels[id]||(id.startsWith('nws:')?'NWS · '+id.slice(4):id))}</option>`).join(''));
  $('sourceFilter').value=ids.includes(source)?source:'all';$('typeFilter').value=types.includes(type)?type:'all';
}
function renderDirectory() {
  replaceMarkup($('sourceDirectory'),SOURCE_DIRECTORY.map(s=>`<div class="source-entry">${s.id?`<button data-source="${s.id}" aria-pressed="${$('sourceFilter').value===s.id}">${escape(s.name)} · ${records.filter(r=>r.ref.source===s.id&&!r.withdrawn).length} records</button>`:`<strong>${escape(s.name)}</strong>`}<small>${escape(s.scope)}</small><small>${s.external?'External reference · not imported':escape(sourceStatus[s.id]?.availability||'Unavailable')+' · shared source snapshots'}</small><a href="${s.url}" target="_blank" rel="noopener noreferrer">Original site ↗</a>${s.docs?` · <a href="${s.docs}" target="_blank" rel="noopener noreferrer">Data details ↗</a>`:''}</div>`).join(''));
}
function safeLink(url) {try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function recordLinks(record) {
  const seen=new Set();return `<div class="source-links"><span class="eyebrow">Original sources & supporting links</span>${[{label:'Original source',url:record.source.url},...(record.links||[])].filter(l=>safeLink(l.url)&&!seen.has(l.url)&&seen.add(l.url)).map(l=>`<a href="${escape(safeLink(l.url))}" target="_blank" rel="noopener noreferrer">${escape(l.label)} ↗</a>`).join('')}</div>`;
}
function recordNarrative(record) {
  return `<div class="record-narrative"><span class="eyebrow">${record.ref.source==='swpc'?'Original NOAA notice':'Source description'}</span>${record.summary?`<p>${escape(record.summary)}</p>`:'<p>Description not supplied. Use the original report.</p>'}${record.metadata.instruction?`<span class="eyebrow">NWS instructions</span><p>${escape(record.metadata.instruction)}</p>`:''}${record.ref.source==='gdacs'?'<p class="source-statement">GDACS alert levels describe the provider’s model. Representative points may be centroids; they are not measured positions or independent corroboration.</p>':''}</div>`;
}
function replaceMarkup(element, markup) {
  if (element.innerHTML === markup) return;
  const active = document.activeElement;
  const ref = element.contains(active) ? active?.dataset?.ref : null;
  const field = element.contains(active) ? active?.dataset?.field : null;
  element.innerHTML = markup;
  if (ref) element.querySelector(`[data-ref="${CSS.escape(ref)}"]`)?.focus({preventScroll:true});
  else if (field) element.querySelector(`[data-field="${CSS.escape(field)}"]`)?.focus({preventScroll:true});
}

function bind(element, event, callback) { element.addEventListener(event, callback); listenerCount++; unbind.push(() => { element.removeEventListener(event, callback); listenerCount--; }); }
function notify(message) { $('notice').textContent = message; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('notice').textContent = ''; }, 6000); }
function selectedRecord() { return state.selected ? rows.find(p => p.key === referenceKey(state.selected))?.record || null : null; }
function dispatch(action) { state = reduceWorkspace(state, action); render(); }
function select(ref, focus = false) { fieldKey = null; dispatch({ type: 'select', ref }); if (focus) (state.layout==='ledger'?$('documentBody'):$('evidence')).focus({ preventScroll: true }); }
function pick(id) {
  const key = id.startsWith('domain:') ? id.slice(7) : '';
  const record = records.find(r => referenceKey(r.ref) === key);
  if (record) select(record.ref);
}
function queueRender() { if (!destroyed && renderFrame == null) renderFrame = requestAnimationFrame(() => { renderFrame = null; render(); }); }
function captureCamera() { return globe?.ok && state.view === 'globe' ? globe.currentTarget() : state.camera; }
function move(camera, remember = true) {
  if (remember) previousCamera = captureCamera();
  applyingCamera = true;
  state = reduceWorkspace(state, { type: 'camera', value: { ...camera, pose: camera.pose || null } });
  if (state.view === 'globe' && globe?.ok) globe.applyView(state.camera);
  if (state.view === 'leaflet' && leaflet) leaflet.setView([state.camera.lat, state.camera.lon], state.camera.zoom, { animate: false });
  applyingCamera = false;
  render();
}
function layerMarkup() {
  $('layers').innerHTML = LAYERS.map(l => `<div class="layer-row"><label><input type="checkbox" data-layer="${l.id}" ${!demo&&(l.id==='aircraft'||l.id==='vessels'||l.id==='satellites'&&!records.some(r=>r.layer==='satellites'))?'disabled':''} ${state.layers[l.id]?'checked':''}><span class="layer-key" aria-hidden="true">${symbolSvg(l.id,l.color)}</span>${l.label}</label><small>${demo?'Demo · '+l.coverage:l.id==='events'?'USGS · NWS · EONET · GDACS · NOAA SWPC':l.id==='vessels'?'Unavailable · no permitted AIS collector':l.id==='aircraft'?'Disabled · regional feed pilot not activated':'Calculated · CelesTrak stations / '+(sourceStatus.celestrak?.availability||'Unavailable')}</small><small>${demo?l.legend:l.id==='events'?'Source points / GDACS representative points; area-only and space-weather records in register':'No demo replacement'}</small></div>`).join('');
}
function provenance(record) {
  return `<div class="provenance-rail"><strong>${demo?'△ Demo / invented fixture':`${escape(recordKind(record))} · ${escape(record.source.availability)}`}</strong><div><span>${demo?'Observed':record.valueOrigin==='calculated'?'Calculated for':'Source event time'}</span><code>${utc(record.valueOrigin==='calculated'?record.time.calculatedFor:record.time.observedAt)}</code></div><div><span>Retrieved</span><code>${utc(record.time.receivedAt)}</code></div><div><span>Source ID</span><code>${escape(record.sourceId||record.ref.id)}</code></div><div><span>${record.valueOrigin==='calculated'?'Element epoch':'Source revision / update'}</span><code>${demo?escape(record.source.version):record.valueOrigin==='calculated'?escape(record.position.calculation.elementEpoch):utc(record.updatedAt)}</code></div><div><span>Source locator</span><code>${escape(record.source.locator)}</code></div></div>`;
}
function fields(record) {
  const p = record.position, t = record.time;
  const height = p.height.value == null ? 'Unknown' : `${p.height.value} ${p.height.unit} · ${p.height.quantity} · ${p.height.reference}`;
  const latitude=p.latitude==null?'Unknown':`${Math.abs(p.latitude)}° ${p.latitude<0?'S':'N'}`;
  const longitude=p.longitude==null?'Unknown':`${Math.abs(p.longitude)}° ${p.longitude<0?'W':'E'}`;
  return [ ['Position', `${latitude} / ${longitude} · ${p.horizontalReference}`, 'position'],
    [record.valueOrigin==='calculated'?'Calculated height':'Observed height', height, 'position.height'], ['Display anchor', p.renderHeightMeters != null ? `${p.renderHeightMeters} m · physical height` : record.layer==='vessels' ? 'Surface convention · not measured vessel height' : 'Horizontal-location proxy · no usable ellipsoid height', 'position.renderHeightMeters'],
    ['Observed at', utc(t.observedAt), 'time.observedAt'], ['Published at', utc(t.publishedAt), 'time.publishedAt'],
    ['Received at', utc(t.receivedAt), 'time.receivedAt'], ['Heading', record.heading == null ? 'Unknown' : `${record.heading}° · observed fixture heading`, 'heading'],
    ['Uncertainty', p.uncertaintyMeters == null ? 'Not supplied' : `${p.uncertaintyMeters} m`, 'position.uncertaintyMeters'],
    ...(record.energy?[['Energy state',record.energy.dimension,'energy.dimension'],['Evidence stage',record.energy.stage||'Unknown','energy.stage'],['Value / units',record.energy.value==null?'Unknown':`${record.energy.value} ${record.energy.units||'units unknown'}`,'energy.value'],['Commodity / scope',`${record.energy.commodity||'Unknown'} · ${record.energy.scope||'scope not supplied'}`,'energy.scope'],['Reporting / target period',record.energy.period||'Unknown','energy.period'],['Price basis',record.energy.priceBasis||'Not supplied / not applicable','energy.priceBasis']]:[]),
    ...(record.valueOrigin==='calculated'?[['Element epoch',record.position.calculation?.elementEpoch||'Unknown','elementEpoch'],['Calculated for',utc(t.calculatedFor),'calculatedFor'],['Calculated at',utc(t.calculatedAt),'calculatedAt'],['Model / transformation',record.position.calculation?.modelVersion+' · '+record.position.calculation?.transformation,'modelVersion'],['Element retrieval',record.metadata.elementAcquisition||'Unknown','elementAcquisition']]:[]),
    ...(!demo&&record.ref.source==='usgs'?[['Magnitude',record.metadata.magnitude??'Unknown','magnitude'],['Depth below surface',record.metadata.depthKm==null?'Unknown':`${record.metadata.depthKm} km · source depth, not ellipsoid height`,'depthKm']]:[]),
    ...(!demo&&record.ref.source==='nws'?[['Expires',utc(t.validTo),'expires'],['Severity (NWS)',record.metadata.severity||'Unknown','severity'],['Urgency (NWS)',record.metadata.urgency||'Unknown','urgency'],['Certainty (NWS)',record.metadata.certainty||'Unknown','certainty'],['Issued by',record.metadata.senderName||'Unknown','senderName'],['Covered areas',record.metadata.areaDesc||'Unknown','areaDesc']]:[]),
    ...(record.ref.source==='gdacs'?[['Point meaning',record.metadata.coordinateMethod,'coordinateMethod'],['Alert level (GDACS model)',record.metadata.alertLevel||'Unknown','alertLevel'],['Source magnitude / impact text',record.metadata.sourceSeverityText||'Not supplied','sourceSeverityText'],['Affected countries',(record.metadata.affectedCountries||[]).map(c=>c.countryname).join(', ')||record.countryName||'Unknown','affectedCountries'],['Event end (source UTC)',record.metadata.sourceEndTime||'Unknown','sourceEndTime']]:[]),
    ...(record.ref.source==='swpc'?[['NOAA product ID',record.metadata.productId,'productId'],['Serial number',record.metadata.serialNumber||'Unknown','serialNumber'],['Geographic scope','Not a point observation; retained in the evidence register','geographic']]:[]) ];
}
function fieldTable(record, document = false) {
  return `<table class="${document?'document-table':'field-table'}">${document?'<thead><tr><th>Field</th><th>Source assertion</th></tr></thead>':''}<tbody>${fields(record).map(([label,value,key])=>`<tr><${document?'td':'th'} scope="row">${label}</${document?'td':'th'}><td><button data-field="${key}">${escape(value)}</button></td></tr>`).join('')}</tbody></table>`;
}
function renderEvidence(record) {
  const projected = rows.find(p => p.key === referenceKey(record.ref));
  replaceMarkup($('evidence'), `<div class="evidence-head"><span class="eyebrow">${record.ref.kind} / source inspection</span><h2>${escape(record.title)}</h2><p class="source-statement">${escape(record.place)}</p></div><p class="evidence-status">${reasonText(projected?.reason || 'not-known-at-cutoff')}${record.stale?' · Retained stale source data':''}. Selection remains available when hidden.</p>${recordNarrative(record)}${recordLinks(record)}${provenance(record)}${fieldTable(record)}<div class="document-meta" id="fieldLocator">${fieldKey ? `Field: ${escape(fieldKey)}<br>Supporting locator: ${escape(record.fieldLocators[fieldKey]||record.source.locator)}<br>Revision ${record.revision} · ${DATA_VERSION}` : 'Select a field to inspect its source locator.'}</div><div class="evidence-actions">${record.source.url?`<a href="${escape(record.source.url)}" target="_blank" rel="noopener noreferrer">Open original source ↗</a>`:''}<button id="openInvestigation">Open in Evidence Ledger</button><button id="export">Export selected evidence</button>${demo?'<button id="prepareReview">Inspect existing review workflow</button>':''}</div><p class="source-statement">${demo?'Invented fixture. No real-world finding.':'A source report is not an analyst conclusion. Public snapshots do not establish an assessment or review approval.'}</p>`);
}
function renderDocument(record) {
  document.querySelector('.document-heading h1').innerHTML = record ? escape(record.title) : 'Read the evidence.<br>Keep the gaps visible.';
  if (!record) {
    if(!demo){$('documentBody').innerHTML='<p class="empty-selection">Choose a record directly from the evidence register. Filter by source, event type, region or date. The register includes records outside the map and notices with no point location.</p><p class="source-statement">Source coverage is bounded: USGS covers seven days, EONET covers recent open events, GDACS supplies its latest 100 app-feed reports, NWS supplies U.S. alert areas, and NOAA supplies space-weather notices. Browse additional original sources in the source directory.</p>';return;}
    $('documentBody').innerHTML = `<div class="document-excerpt">A record does not need a map marker to belong here.</div><p class="document-meta">SYNTHETIC SCENARIO / ${DATA_VERSION}<br>Choose the same event or contact in the observation register.<br>Field values, time, source and selection stay linked across all three directions.</p><table class="document-table"><thead><tr><th>Evidence family</th><th>Scope</th></tr></thead><tbody><tr><td>Events</td><td>Twelve invented regional observations</td></tr><tr><td>Contacts</td><td>Forty invented aircraft / vessel observations plus twelve satellite positions</td></tr><tr><td>Institutions</td><td>Pilot specification only; no transaction records imported</td></tr></tbody></table>`;
  } else {
      $('documentBody').innerHTML = `<p class="source-statement">${escape(record.place)} · ${escape(typeLabels[recordType(record)]||recordType(record))}</p>${recordNarrative(record)}${recordLinks(record)}${provenance(record)}<div class="evidence-actions"><button data-export="true">Export selected evidence</button></div>${fieldTable(record,true)}<p class="document-meta" data-field-locator>Select a field to inspect its source locator.</p><p class="source-statement">Missing values remain unknown. This is a source record, not a reviewed assessment.</p>`;
  }
}
function renderLinked(record) {
  const subset = record ? [record] : demo?records.filter(r=>r.ref.kind==='event').slice(0,4):[];
  $('timeline').innerHTML = subset.map(r=>`<button class="timeline-item" data-ref="${escape(referenceKey(r.ref))}"><span>${utc(recordClock(r).at)} · ${recordClock(r).label.toLowerCase()}</span>${escape(r.title)}</button>`).join('');
  if (record) $('timeline').innerHTML += `<div class="timeline-item"><span>${utc(record.time.receivedAt)} · received</span>Revision r${record.revision} entered this ${demo?'fixture':'public source'} snapshot</div>`;
  $('relationships').innerHTML = record||demo?`<div class="graph-link"><div class="graph-node">${escape(record?.source.name||'Demo source')}</div><span>→<small> reports</small></span><button class="graph-node" ${record?`data-ref="${escape(referenceKey(record.ref))}"`:'disabled'}>${record?escape(record.title):'Select a record'}</button></div><p class="source-statement">Source → record. No ownership or causal relationship is inferred.</p>`:'<p class="source-statement">Select a record. No institutional or financial relationships have been established.</p>';
  $('gaps').innerHTML = record||demo?`<div class="gap-row">Publication time: ${record?.time.publishedAt==null?'not supplied':utc(record.time.publishedAt)}</div><div class="gap-row">Position uncertainty: not supplied</div><div class="gap-row">Independent corroboration: not established</div>${record && record.position.renderHeightMeters == null?'<div class="gap-row">Physical display height: unavailable; proxy disclosed</div>':''}`:'<p class="source-statement">Archive recovery, review publication and live vehicle feeds are unavailable.</p>';
}
function renderRegister() {
  const page=registerPage(rows,{page:recordPage,visibleOnly:!$('showExcluded').checked});recordPage=page.page;
  $('recordCount').textContent=`${page.start}–${page.end} of ${page.total} matching records`;
  $('previousRecords').disabled=page.page===0;$('nextRecords').disabled=page.page===page.lastPage;
  replaceMarkup($('records'),page.entries.map(p=>{const clock=recordClock(p.record);return `<button class="record-row ${p.selected?'selected':''}" aria-pressed="${Boolean(p.selected)}" data-ref="${escape(p.key)}"><span class="row-meta"><span>${escape(p.record.ref.source.toUpperCase())} · ${recordKind(p.record)}</span><span>${p.record.stale?'Stale':escape(typeLabels[recordType(p.record)]||recordType(p.record))}</span></span><strong>${escape(p.record.title)}</strong><span class="record-place">${escape(p.record.place)}</span><span class="row-meta"><span>${clock.label} · ${utc(clock.at)}</span></span><span class="row-status">${p.record.position.valid?reasonText(p.reason):'No point location · inspect directly'}${p.record.withdrawn?' · absent from current snapshot':''}</span></button>`;}).join('')||'<p class="empty-selection">No records match these filters. Clear filters or include records off map. Source coverage varies; no demo data fills gaps.</p>');
}
function refreshStatus(){
  $('modeLabel').textContent=demo?'Demo · invented fixtures':'Read-only beta';
  $('dataMode').value=demo?'demo':'live';$('refreshData').hidden=demo;$('refreshData').disabled=refreshing;
  $('fixtureStatus').parentElement.hidden=!demo;$('pilot').hidden=!demo;$('typeFilter').parentElement.dataset.mode=demo?'demo':'live';
  filterOptions();renderDirectory();
  $('scopeCount').textContent=demo?'12 events / 40 air & sea / 12 satellites':`${records.filter(r=>!r.withdrawn).length} loaded public records`;
  const last=Math.max(0,...Object.values(sourceStatus).map(s=>s.lastSuccessAt||0));
  $('snapshotTime').textContent=utc(demo?DEMO_NOW:last||null);
  $('dataStatus').innerHTML=demo?'△ Demo<span>Invented records · no live coverage</span>':`${loadError?'Unavailable':refreshing?'Refreshing':records.length?'Public source snapshots':'Unavailable'}<span>${escape(loadError||'No simulated records · coverage varies')}</span>`;
  $('sourceHealth').innerHTML=demo?'<span class="eyebrow">Demo coverage</span><p>Invented global contacts. No real vehicles or satellite elements.</p>':`<span class="eyebrow">Source health</span>${Object.entries(sourceStatus).map(([id,s])=>`<div class="source-health"><strong>${escape(id.toUpperCase())} · ${escape(s.dataKind)} / ${escape(s.availability)}</strong><small>${escape(s.coverage)}</small><small>Last success ${utc(s.lastSuccessAt)}</small><small>Source time ${utc(s.sourceGeneratedAt)}</small>${s.error?`<small>${escape(s.error)} · retained last success</small>`:''}</div>`).join('')||'<p>Waiting for shared public snapshots. No upstream polling from this browser.</p>'}`;
}
async function refreshLive(){
  if(demo||refreshing||destroyed)return;refreshing=true;refreshStatus();
  try{
    const response=await fetch('/api/events',{signal:AbortSignal.timeout(15000),cache:'no-cache'});
    const envelope=await response.json();if(!response.ok&&!Object.keys(envelope.sourceStatus||{}).length)throw new Error('API unavailable');const next=liveRecords(envelope);
    const previous=records.find(r=>state.selected&&referenceKey(r.ref)===referenceKey(state.selected));
    if(previous&&!next.some(r=>referenceKey(r.ref)===referenceKey(previous.ref)))next.push({...previous,withdrawn:true,stale:true});
    records=next;sourceStatus=envelope.sourceStatus;layerMarkup();loadError=response.ok?null:'Public snapshot unavailable. Last successful records remain labeled stale.';
    const wasNow=Number($('time').value)===Number($('time').max);NOW=Number.isFinite(envelope.generatedAt)?envelope.generatedAt:Date.now();
    state=reduceWorkspace(state,{type:'time',asOf:wasNow?NOW:state.asOf,knownAt:NOW,mode:'situation'});
    DATA_VERSION=`public-beta/1 · ${envelope.generatedAt}`;
    if(!state.selected&&params.get('selected')){const r=records.find(r=>r.ref.id===params.get('selected'));if(r)state=reduceWorkspace(state,{type:'select',ref:r.ref});}
  }catch{
    loadError='API unavailable. Retained records are stale; no demo replacement.';
    records=records.map(r=>({...r,stale:true,source:{...r.source,availability:'Stale'}}));
    sourceStatus=Object.fromEntries(Object.entries(sourceStatus).map(([id,s])=>[id,{...s,availability:s.lastSuccessAt?'Stale':'Unavailable',error:'beta-api-unavailable'}]));
  }finally{refreshing=false;render();}
}
function render() {
  if (destroyed) return;
  updates++;
  document.body.dataset.layout = state.layout;
  document.querySelectorAll('nav [data-layout]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.layout===state.layout)));
  const viewVisibility = state.view === 'globe' && layerRuntime ? layerRuntime.visibility : () => null;
  const bbox = state.view === 'leaflet' && leaflet ? (()=>{const b=leaflet.getBounds();return {south:b.getSouth(),north:b.getNorth(),west:b.getWest(),east:b.getEast()};})() : null;
  const currentFilters=filters();
  const matches=record=>matchesFilters(record,currentFilters,state.asOf);
  rows = projections(records, state, { visibility: viewVisibility, bbox, availability:demo?availability:'public' }).map(row=>matches(row.record)?row:{...row,reason:'filter-excluded',renderable:false});
  refreshStatus();
  if (layerRuntime && state.view === 'globe') layerRuntime.sync(rows, state.layers);
  if (leaflet && state.view === 'leaflet') syncLeaflet();
  if (leaflet && state.view === 'leaflet') {
    const bounds=$('fallbackMap').getBoundingClientRect();
    const loadedTiles=[...$('fallbackMap').querySelectorAll('img.leaflet-tile-loaded')].filter(tile=>{
      const rect=tile.getBoundingClientRect();
      return tile.complete && tile.naturalWidth>0 && rect.right>bounds.left && rect.left<bounds.right && rect.bottom>bounds.top && rect.top<bounds.bottom;
    });
    basemapLoaded=loadedTiles.filter(tile=>tile.closest('.english-basemap')).length;
    labelTilesLoaded=loadedTiles.filter(tile=>tile.closest('.english-labels')).length;
  }
  const record = selectedRecord();
  $('evidence').hidden = !record || state.layout==='ledger';
  $('records').hidden = false;
  document.querySelector('.inspector').classList.toggle('has-selection',Boolean(record)&&state.layout!=='ledger');
  $('register-controls')?.classList.toggle('selected',Boolean(record));
  $('clearSelection').hidden = !record;
  $('inspectorTitle').textContent = 'Evidence register';
  if (record) renderEvidence(record);
  renderRegister(); renderDocument(record); renderLinked(record); renderEnergyState();
  const region = state.camera.zoom < 4 ? 'World overview' : state.camera.zoom < 7 ? 'Regional context' : 'Local plan';
  $('place').textContent = region + (state.camera.zoom >= 4 ? ` · ${state.camera.lat.toFixed(2)}° / ${state.camera.lon.toFixed(2)}°` : '');
  $('mapTitle').textContent = region;
  const counts = rows.reduce((counts,row)=>{counts[row.reason]=(counts[row.reason]||0)+1;return counts;},{});
  $('projectionCaption').textContent = demo?`${rows.filter(p=>p.ref.kind==='contact'&&p.renderable).length} / 52 demo contacts · ${rows.filter(p=>p.renderable).length} / ${records.length} records in view`:`${rows.filter(p=>p.renderable).length} mapped / ${rows.filter(p=>matches(p.record)).length} matching / ${records.length} loaded · area-only alerts remain in feed`;
  $('timeLabel').textContent = new Date(state.asOf).toISOString().slice(11,16)+' UTC';
  $('knowledgeLabel').textContent = demo?`Knowledge cutoff ${new Date(state.knownAt).toISOString().slice(11,16)} UTC. ${state.timeMode==='situation'?'Later snapshot revisions allowed explicitly.':'Later revisions excluded.'}`:'Latest source snapshots; archived revisions unavailable. Time changes the event cutoff.';
  document.body.dataset.renderer = state.view;
  document.body.dataset.selectedReference = state.selected ? referenceKey(state.selected) : '';
  document.body.dataset.projectionReasons = JSON.stringify(counts);
  document.body.dataset.cameraIntent = JSON.stringify(state.camera);
  document.body.dataset.entityCounts = JSON.stringify(layerRuntime?.counts() || {});
  document.body.dataset.sceneEntityCount = String(globe?.ok ? globe.viewer.entities.values.length : 0);
  document.body.dataset.viewerIdentity = globe?.viewer?.scene?.canvas?.dataset?.candidateViewerId || '';
  document.body.dataset.pickPoints = JSON.stringify(state.view==='globe' && layerRuntime ? layerRuntime.pickPoints(rows) : []);
  document.body.dataset.timeContext = JSON.stringify({asOf:state.asOf,knownAt:state.knownAt,timeMode:state.timeMode});
  document.body.dataset.dataMode=demo?'demo':'live';document.body.dataset.loadedRecords=String(records.length);document.body.dataset.sourceHealth=JSON.stringify(sourceStatus);
  document.body.dataset.recordFilters=JSON.stringify(currentFilters);document.body.dataset.matchingRecords=String(rows.filter(p=>p.reason!=='filter-excluded').length);
  document.body.dataset.basemapStatus=state.view==='leaflet'?JSON.stringify({loaded:basemapLoaded,errors:basemapErrors,labelsLoaded:labelTilesLoaded,labelErrors:labelTilesErrors}):'not-requested';
  $('mapDisclosure').textContent=state.view==='leaflet'?'Esri dark map · English labels · tiles require network':'Natural Earth II · offline geography';
  $('view').value = state.view;
  $('retryMap').hidden=state.view!=='leaflet';
  $('fixtureStatus').value = availability;
  if (!demo&&loadError) $('mapAvailability').textContent=loadError;
  else if (availability!=='synthetic') $('mapAvailability').textContent = availability==='unavailable' ? 'Fixture source unavailable. Retained records remain inspectable; no scene positions are displayed.' : 'Stale fixture state. Cached observations are labeled stale; coverage is not current.';
  else if (state.view==='leaflet') $('mapAvailability').textContent = globe?.ok ? '' : 'WebGL unavailable. 2D street map; selection and records remain available.';
  else if (globe?.ok) $('mapAvailability').textContent = '';
  if(state.view==='leaflet' && basemapErrors && !basemapLoaded) $('mapAvailability').textContent='Map tiles unavailable. Check your connection and choose Retry map.';
  else if(state.view==='leaflet' && labelTilesErrors && !labelTilesLoaded) $('mapAvailability').textContent='English map labels unavailable. Check your connection and choose Retry map.';
  // Test observation is read-only: actions still travel through the actual controls.
  globalThis.workbenchEvidence = { state: structuredClone(state), rows: rows.map(({key,reason,renderable,anchor,heightMeters,physicalHeightMeters,selected})=>({key,reason,renderable,anchor,heightMeters,physicalHeightMeters,selected})),
    entityCounts: layerRuntime?.counts() || {}, viewerExists: Boolean(globe?.ok), viewerIdentity: globe?.viewer?.scene?.canvas?.dataset?.candidateViewerId,
    updates, listenerCount, availability, version: DATA_VERSION };
}
function syncLeaflet() {
  const L = globalThis.L;
  for (const row of rows) {
    if (!row.renderable) { const old=leafMarkers.get(row.key);if(old){leaflet.removeLayer(old);leafMarkers.delete(row.key);}continue; }
    const record=row.record,p=record.position,layer=LAYERS.find(l=>l.id===row.layer);
    let marker=leafMarkers.get(row.key);
    const size=row.selected?42:row.layer==='events'?24:34;
    const icon=L.divIcon({className:`contact-symbol ${row.selected?'selected':''}`,html:symbolSvg(row.layer,layer.color),iconSize:[size,size],iconAnchor:[size/2,size/2]});
    if (!marker) { marker=L.marker([p.latitude,p.longitude],{icon,keyboard:true,title:`${record.title} · ${recordKind(record)}`});marker.on('click',()=>select(record.ref));marker.addTo(leaflet);leafMarkers.set(row.key,marker); }
    else marker.setIcon(icon);
    marker.bindTooltip(`${escape(record.title)} · ${recordKind(record)}`);
  }
  for(const [key,marker] of leafMarkers)if(!rows.some(row=>row.key===key)){leaflet.removeLayer(marker);leafMarkers.delete(key);}
}
async function changeView(value, forced = false) {
  if (value==='leaflet') {
    if (state.view==='globe' && globe?.ok) state=reduceWorkspace(state,{type:'globe-camera',value:globe.currentTarget()});
    state=reduceWorkspace(state,{type:'view',value});
    $('globeStage').hidden=true;$('fallbackMap').hidden=false;
    if (!leaflet) { const L=globalThis.L;if(!L){notify('Leaflet assets unavailable. Use the record list.');render();return;}leaflet=L.map('fallbackMap',{worldCopyJump:true,minZoom:2,maxZoom:18,zoomAnimation:false});
      basemap=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',{maxZoom:18,maxNativeZoom:16,keepBuffer:1,updateWhenIdle:true,className:'english-basemap',attribution:'Sources: <a href="https://goto.arcgisonline.com/maps/World_Dark_Gray_Base" target="_blank" rel="noopener">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, GIS user community'}).addTo(leaflet);
      leaflet.createPane('englishLabels');leaflet.getPane('englishLabels').style.zIndex='350';leaflet.getPane('englishLabels').style.pointerEvents='none';
      labelBasemap=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',{maxZoom:18,maxNativeZoom:16,keepBuffer:1,updateWhenIdle:true,className:'english-labels',pane:'englishLabels'}).addTo(leaflet);
      basemap.on('loading',()=>{basemapLoaded=0;basemapErrors=0;queueRender();});
      basemap.on('tileload',queueRender);basemap.on('tileerror',()=>{basemapErrors++;queueRender();});
      labelBasemap.on('loading',()=>{labelTilesLoaded=0;labelTilesErrors=0;queueRender();});
      labelBasemap.on('tileload',queueRender);labelBasemap.on('tileerror',()=>{labelTilesErrors++;queueRender();});
      leaflet.on('moveend',()=>{if(applyingCamera||state.view!=='leaflet')return;const c=leaflet.getCenter();state=reduceWorkspace(state,{type:'camera',value:{lat:c.lat,lon:((c.lng+180)%360+360)%360-180,zoom:leaflet.getZoom(),heading:0,pitch:-90}});queueRender();}); }
    applyingCamera=true;leaflet.setView([state.camera.lat,state.camera.lon],state.camera.zoom,{animate:false});leaflet.invalidateSize();applyingCamera=false;
    if (forced) notify('WebGL unavailable. Context and selection are preserved in the explicit Leaflet fallback.');
  } else {
    if (!globe?.ok) { notify('Globe unavailable. The record list and Leaflet remain available.');return; }
    state=reduceWorkspace(state,{type:'view',value:'globe'});$('fallbackMap').hidden=true;$('globeStage').hidden=false;
    globe.viewer.resize();if(state.globeCamera){const camera=state.globeCamera;move(camera,false);state=reduceWorkspace(state,{type:'globe-camera',value:null});}
  }
  render();
}
function download(record) {
  const row=rows.find(p=>p.key===referenceKey(record.ref));
  const blob=new Blob([JSON.stringify({ schema:'live-map-candidate-evidence/1', version:DATA_VERSION, synthetic:demo, publicationAuthorized:false,
    workspace:state, evidence:record, projection:{reason:row.reason,anchor:row.anchor,physicalHeightMeters:row.physicalHeightMeters} },null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`evidence-${record.ref.id.replace(/[^a-z0-9_-]/gi,'_')}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Source evidence exported. No assessment approval is included.');
}
bind(document,'click',event=>{
  const target=event.target.closest('button');if(!target)return;
  if(target.dataset.layout){const camera=captureCamera();state=reduceWorkspace(state,{type:'camera',value:camera});dispatch({type:'layout',value:target.dataset.layout});requestAnimationFrame(()=>{globe?.viewer?.resize();leaflet?.invalidateSize();queueRender();});}
  if(target.dataset.ref){const record=records.find(r=>referenceKey(r.ref)===target.dataset.ref);if(record)select(record.ref);}
  if(target.dataset.source){$('sourceFilter').value=target.dataset.source;recordPage=0;render();$('sourceFilter').focus({preventScroll:true});}
  if(target.dataset.energy){$('energyFilter').value=target.dataset.energy;recordPage=0;render();$('energyFilter').focus({preventScroll:true});}
  if(target.dataset.field){fieldKey=target.dataset.field;const record=selectedRecord();if(record){const locator=record.fieldLocators[fieldKey]||record.source.locator;const markup=`Field: ${escape(fieldKey)}<br>Supporting locator: ${escape(locator)}<br>Revision r${record.revision} · ${DATA_VERSION}`;$('fieldLocator').innerHTML=markup;document.querySelectorAll('[data-field-locator]').forEach(el=>el.innerHTML=markup);notify(`Field source: ${locator} · r${record.revision}`);}}
  if(target.id==='openInvestigation')dispatch({type:'layout',value:'ledger'});
  if((target.id==='export'||target.dataset.export) && selectedRecord())download(selectedRecord());
  if(target.id==='prepareReview') {
    // Existing investigation logic remains authoritative; this is an unapproved synthetic draft.
    const caseObject=createInvestigationCase({now:new Date(NOW)});
    const {assessment}=draftOperationalAssessment(caseObject,{now:NOW,asOf:new Date(NOW).toISOString()});
    notify(`Separate synthetic Hormuz case: ${assessment.extra?.reviewState || 'review_required'}. This observation has not been added to that case or reviewed.`);
  }
});
bind($('layers'),'change',event=>{if(event.target.dataset.layer)dispatch({type:'layer',id:event.target.dataset.layer,enabled:event.target.checked});});
bind($('clearSelection'),'click',()=>{const key=state.selected?referenceKey(state.selected):null;select(null);document.querySelector(`.record-row[data-ref="${CSS.escape(key||'')}"]`)?.focus();});
bind($('region'),'click',()=>move({lat:40,lon:10,zoom:4.5,heading:0,pitch:-90}));
bind($('retryMap'),'click',()=>{basemapLoaded=0;basemapErrors=0;labelTilesLoaded=0;labelTilesErrors=0;basemap?.redraw();labelBasemap?.redraw();render();});
bind($('global'),'click',()=>move({lat:20,lon:24,zoom:2.65,heading:0,pitch:-90}));
bind($('plan'),'click',()=>move({...captureCamera(),pose:null,pitch:-90}));
bind($('back'),'click',()=>{if(previousCamera){const back=previousCamera;previousCamera=captureCamera();move(back,false);}else notify('No previous camera view yet.');});
bind($('focus'),'click',()=>{
  const record=selectedRecord();
  if(!record?.position.valid){notify('Select a record with a usable location first.');return;}
  const lat=record.position.latitude,lon=record.position.longitude;
  let zoom=record.ref.kind==='contact'?9:6;
  if(record.layer==='satellites'&&state.view==='globe'){
    // Keep the camera above the physical orbital position, including narrow panes.
    const heightAtZero=cameraHeightFromLeafletZoom(0,{latitude:lat,viewportWidthPx:$('globeStage').clientWidth||1000});
    const targetHeight=Math.max(0,record.position.renderHeightMeters||0)+1_000_000;
    zoom=Math.min(4.5,Math.log2(heightAtZero/targetHeight));
  }
  move({lat,lon,zoom,heading:0,pitch:-90});
});
bind($('view'),'change',()=>changeView($('view').value));
bind($('fixtureStatus'),'change',()=>{availability=$('fixtureStatus').value;render();});
bind($('theme'),'click',()=>{const light=document.body.dataset.theme!=='light';document.body.dataset.theme=light?'light':'dark';$('theme').textContent=light?'Dark appearance':'Light appearance';$('theme').setAttribute('aria-pressed',String(light));});
bind($('recordFilter'),'input',()=>{recordPage=0;render();});bind($('showExcluded'),'change',()=>{recordPage=0;renderRegister();});
for(const id of ['sourceFilter','typeFilter','regionFilter','ageFilter','energyFilter'])bind($(id),'change',()=>{recordPage=0;render();});
bind($('resetFilters'),'click',()=>{$('recordFilter').value='';for(const id of ['sourceFilter','typeFilter','regionFilter','ageFilter','energyFilter'])$(id).value='all';$('showExcluded').checked=true;recordPage=0;render();});
bind($('previousRecords'),'click',()=>{recordPage--;renderRegister();$('records').scrollTop=0;});bind($('nextRecords'),'click',()=>{recordPage++;renderRegister();$('records').scrollTop=0;});
bind($('refreshData'),'click',refreshLive);bind($('dataMode'),'change',()=>{const url=new URL(location.href);if($('dataMode').value==='demo')url.searchParams.set('mode','demo');else url.searchParams.delete('mode');location.assign(url);});
bind($('skipRecords'),'click',event=>{event.preventDefault();$('records').focus();});
$('energyFilter').innerHTML='<option value="all">All records</option>'+ENERGY_DIMENSIONS.map(d=>`<option value="${d.id}">${d.label}</option>`).join('');
function updateTime(){const asOf=NOW-Number($('time').max)*60000+Number($('time').value)*60000;dispatch({type:'time',asOf,knownAt:$('timeMode').value==='situation'?NOW:asOf,mode:$('timeMode').value});}
bind($('time'),'input',updateTime);bind($('timeMode'),'change',updateTime);
bind($('save'),'click',()=>{try{state=reduceWorkspace(state,{type:'camera',value:captureCamera()});localStorage.setItem(`live-map:systems:${demo?'demo':'live'}:v1`,JSON.stringify(state));notify('Workspace saved with domain selection, time, layers and camera pose.');}catch{notify('Storage unavailable. Export evidence to keep this workspace context.');}});
bind($('restore'),'click',()=>{try{const saved=localStorage.getItem(`live-map:systems:${demo?'demo':'live'}:v1`);if(!saved){notify('No saved workspace.');return;}state=workspace(JSON.parse(saved),NOW);if(!demo){state.timeMode='situation';state.knownAt=NOW;['aircraft','vessels'].forEach(id=>{state.layers[id]=false;});}const desiredCamera=state.camera;if(state.view==='globe')state=reduceWorkspace(state,{type:'globe-camera',value:null});layerMarkup();const range=Number($('time').max);$('time').value=String(Math.max(0,Math.min(range,(state.asOf-(NOW-range*60000))/60000)));$('timeMode').value=state.timeMode;changeView(state.view);move(desiredCamera,false);notify('Saved workspace restored.');}catch{notify('Saved workspace unavailable or invalid.');}});
bind($('pilot'),'click',()=>{$('pilotDialog').showModal();});bind($('closePilot'),'click',()=>{$('pilotDialog').close();});
$('pilotScope').textContent='Proposed scope: Environment Agency — Flood Modeller software licensing, Find a Tender notice 005023-2025. Published notice metadata is discoverable; full original retrieval and retained source review remain a pilot precondition.';
bind(window,'pagehide',()=>{destroyed=true;clearInterval(refreshTimer);clearTimeout(noticeTimer);if(renderFrame!=null)cancelAnimationFrame(renderFrame);unbind.forEach(remove=>remove());layerRuntime?.dispose();globe?.destroy();basemap?.off();labelBasemap?.off();leaflet?.remove();leafMarkers.clear();});
if(!demo){$('time').max='1440';$('time').value='1440';$('time').step='60';$('time').setAttribute('aria-label','Event cutoff across the past 24 hours');$('timeMode').value='situation';$('timeMode').disabled=true;['aircraft','vessels'].forEach(id=>{state.layers[id]=false;});}
$('regionFilter').innerHTML=REGIONS.map(r=>`<option value="${r.id}">${r.label}</option>`).join('');
layerMarkup();render();
if(!demo){refreshLive();refreshTimer=setInterval(()=>{if(!document.hidden)refreshLive();},300000);}
try {
  if(params.get('failWebgl')==='1')throw new Error('WebGL initialization forced unavailable for this fixture');
  globe=await createCesiumGlobe($('globeStage'),state.camera,{
    darkAtlas:true,onSelectId:pick,
    cameraHeightFromZoom:(z,lat,width)=>cameraHeightFromLeafletZoom(z,{latitude:lat,viewportWidthPx:width||1000}),
    cameraZoomFromHeight:(height,lat,width)=>Math.max(2,Math.min(19,leafletZoomFromMetersPerPixel(metersPerPixelFromCamera({heightMeters:height,latitude:lat,viewportWidthPx:width}),lat)||3)),
    onViewChange:camera=>{if(applyingCamera||destroyed||!layerRuntime)return;state=reduceWorkspace(state,{type:'camera',value:camera});queueRender();},
    onViewportChange:queueRender,
    onContextLoss:()=>{globe.ok=false;layerRuntime?.dispose();layerRuntime=null;changeView('leaflet',true);},
  });
  if(!globe.ok)throw new Error(globe.reason);
  globe.viewer.scene.canvas.dataset.candidateViewerId='single-candidate-viewer';
  layerRuntime=sceneLayers(globe);
  // A user can restore a workspace while Cesium's assets are still loading.
  // Apply the latest state once ready, rather than the older startup camera.
  if(state.view==='globe')move(state.camera,false);
  // Freeze the clock and keep a single viewer through zoom and layout changes.
  globe.viewer.clock.currentTime=globe.Cesium.JulianDate.fromDate(new Date(NOW));globe.viewer.clock.shouldAnimate=false;
  const onRender=()=>{ if(state.view==='globe'&&!destroyed) {
    // Visibility is recounted at camera completion; do not schedule perpetual frames.
    document.body.dataset.webglRendered='true';
  }};
  globe.viewer.scene.postRender.addEventListener(onRender);unbind.push(()=>globe?.viewer?.scene?.postRender.removeEventListener(onRender));
  if(state.view==='leaflet')await changeView('leaflet');else render();
}catch(error){$('mapAvailability').textContent=String(error.message);await changeView('leaflet',true);}

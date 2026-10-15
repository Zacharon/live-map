import { escapeHtml as esc } from '../events/event-normalizer.js';
export function ceasefireMarkdown(result) {
  return ['# Ceasefire claim verification — SYNTHETIC',`As of: ${result.asOf}`,`Scope: ${JSON.stringify(result.scope)}`,result.note,
    `Announcement: ${result.announcement}`,...result.parties.map(p=>`${p.party}: ${p.statuses.join(' + ')}; compliance ${p.compliance}; ${p.independentOrigins} independent origins; conflicts ${p.conflicts.join(', ') || 'none recorded'}`),
    ...['attackReports','attackObservations','damageReports','damageConfirmations','sanctionsAnnouncements','sanctionsEffective','implementation'].map(k=>`${k}: ${result[k].join(', ') || 'unknown'}`),
    'Sanctions impact: unknown','Review: review_required; no human approval',...result.dispositions.map(r=>`${r.id}: ${r.kind}; ${r.usable?'in scope':r.reasons.join(', ')}`)].join('\n');
}
export function renderCeasefireAssessment(result) {
  return `<section data-ceasefire-assessment><h3>Ceasefire claim verification</h3><p class="fixture-banner">SYNTHETIC — invented parties and geography. No current-events claim.</p>
    <p>${esc(result.note)}</p><dl class="v2-detail-facts">${Object.entries(result.scope).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(Array.isArray(v)?v.join(', '):v)}</dd></div>`).join('')}<div><dt>As of</dt><dd>${esc(result.asOf)}</dd></div></dl>
    <p>Diplomatic announcement: <strong>${esc(result.announcement)}</strong></p>
    ${result.parties.map(p=>`<article><h3>${esc(p.party)}</h3><p>${esc(p.statuses.join(' + '))}</p><p>Compliance: ${esc(p.compliance)} · ${p.independentOrigins} independent observation origin(s)</p><p>Acknowledgments: ${esc(p.acknowledgments.join(', ')||'unknown')}; rejection: ${esc(p.rejections.join(', ')||'unknown')}; silence: ${esc(p.silence.join(', ')||'none recorded')}</p><p>Observation candidates: ${esc(p.observations.join(', ')||'none')}; conflicting reports: ${esc(p.conflicts.join(', ')||'none recorded')}</p></article>`).join('')}
    <dl class="v2-detail-facts">${['attackReports','attackObservations','damageReports','damageConfirmations','sanctionsAnnouncements','sanctionsEffective','implementation','sanctionsImpact'].map(k=>`<div><dt>${esc(k)}</dt><dd>${esc(Array.isArray(result[k])?result[k].join(', ')||'unknown':result[k])}</dd></div>`).join('')}</dl>
    <h3>Record dispositions</h3><ul>${result.dispositions.map(r=>`<li>${esc(r.id)} · ${esc(r.kind)} · ${r.usable?'in scope':esc(r.reasons.join(', '))}</li>`).join('')}</ul><p>Review required. No approval or publication control is provided for this fixture.</p></section>`;
}

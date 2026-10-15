import { escapeHtml } from '../events/event-normalizer.js';
import { maritimeEvidenceFreshness } from '../intelligence/maritime-signals.js';

const valueText=value=>value==null?'unknown':typeof value==='object'?JSON.stringify(value):String(value);
export function renderEvidenceDetail(record) {
  if (!record) return '<p class="panel-help" data-evidence-empty>Select a ledger record to inspect its source, dates and coverage. Selection does not require the globe.</p>';
  const extra=record.extra || {};
  const confidence=extra.analyticalConfidence;
  const scopedConfidence=confidence && ['low','medium','high'].includes(confidence.level) && confidence.rationale ? confidence : {level:'unknown',rationale:'No scoped analytical confidence assessment.'};
  let link='Source URL unknown';
  try {const url=new URL(record.sourceUrl);if(['https:','http:'].includes(url.protocol))link=`<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">Open source</a>`;} catch {}
  return `<article class="maritime-evidence" data-evidence-detail="${escapeHtml(record.id)}" aria-label="Selected evidence">
    <button type="button" data-evidence-back>Back to ledger</button>
    <h3>${escapeHtml(record.title || record.id)}</h3>
    <p><code>${escapeHtml(record.id)}</code> · revision ${escapeHtml(String(record.revision || 1))}${record.synthetic?' · SYNTHETIC FIXTURE':extra.historicalPublic?' · HISTORICAL PUBLIC EXTRACT':''}</p>
    <dl class="v2-detail-facts">${[
      ['Kind / origin',`${record.evidenceKind || 'unknown'} / ${record.valueOrigin || 'unknown'}`],
      ...(extra.ceasefire ? [['Ceasefire assertion',extra.ceasefire],['Organization / origin',{organization:record.sourceOrganizationId,origin:record.evidentialOriginId,syndication:record.syndication}],['Summary',record.summary]] : []),
      ['Value / units',`${valueText(record.value)} ${record.unit || 'units unknown'}`],
      ['Provider',record.sourceId],['Method',extra.ceasefire?.method || extra.method || extra.measurementBasis],
      ['Observed',record.observedAt],['Published',record.reportedAt],['Retrieved',record.retrievedAt],
      ['Freshness',extra.ceasefire ? `${extra.ceasefire.freshness || 'unknown'} at fixture cutoff; not a current feed` : maritimeEvidenceFreshness(record, Date.now())],
      ['Observation period',extra.observationPeriod || {start:record.effectiveStart || record.observedAt,end:record.effectiveEnd || record.observedAt}],['Coverage',record.coverage],
      ['Confidence',scopedConfidence],['Limitations',record.qualityLimitations?.length ? record.qualityLimitations : null],['Contradicts',extra.contradictsId],
      ...(extra.proxyNotThroughput ? [['Measurement boundary','AIS visibility proxy; does not measure cargo throughput.']] : []),
    ].map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHtml(valueText(value))}</dd></div>`).join('')}</dl>
    <p>${link}</p><p class="panel-help">Dates and coverage describe this record. A ledger selection does not establish current flow or safety.</p>
  </article>`;
}

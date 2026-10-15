import { escapeHtml } from '../events/event-normalizer.js';
import { maritimeEvidenceFreshness } from '../intelligence/maritime-signals.js';

const valueText=value=>value==null?'unknown':typeof value==='object'?JSON.stringify(value):String(value);
export function renderEvidenceDetail(record) {
  if (!record) return '<p class="panel-help" data-evidence-empty>Select a ledger record to inspect its source, dates and coverage. Selection does not require the globe.</p>';
  const extra=record.extra || {};
  const confidence=extra.analyticalConfidence;
  const scopedConfidence=confidence && ['unknown','low','medium','high'].includes(confidence.level) && confidence.rationale ? confidence : {level:'unknown',rationale:'No scoped analytical confidence assessment.'};
  let link='Source URL unknown';
  try {const url=new URL(record.sourceUrl);if(['https:','http:'].includes(url.protocol))link=`<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">Open source</a>`;} catch {}
  return `<article class="maritime-evidence" data-evidence-detail="${escapeHtml(record.id)}" aria-label="Selected evidence">
    <button type="button" data-evidence-back>Back to ledger</button>
    <h3>${escapeHtml(record.title || record.id)}</h3>
    <p><code>${escapeHtml(record.id)}</code> · revision ${escapeHtml(String(record.revision || 1))}${record.synthetic?' · SYNTHETIC FIXTURE':extra.historicalReporting?' · HISTORICAL REPORTING FIXTURE':extra.historicalPublic?' · HISTORICAL PUBLIC EXTRACT':''}</p>
    <dl class="v2-detail-facts">${[
      ['Kind / origin',`${record.evidenceKind || 'unknown'} / ${record.valueOrigin || 'unknown'}`],
      ...(extra.attributedTo ? [['Attribution',extra.attributedTo],['Statement',record.summary],['Source access',extra.sourceAccess],['Independent corroboration',extra.independentCorroboration]] : []),
      ...(extra.vessel ? [['Reported vessel identity / class',`${extra.vessel.reportedIdentity} · ${extra.vessel.reportedClass}`],['Reported location / precision',`${extra.reportedLocation?.label || 'unknown'} · ${extra.reportedLocation?.precision || 'unknown'}`],['Associated vessels',extra.associatedVessels?.join(', ')],['IMO / MMSI','unknown']] : []),
      ...(extra.occurrencePeriod ? [['Occurrence (reported period)',extra.occurrencePeriod]] : []),
      ['Value / units',`${valueText(record.value)} ${record.unit || 'units unknown'}`],
      ['Provider',record.sourceId],['Method',extra.method || extra.measurementBasis],
      ['Observed',record.observedAt],['Published',record.reportedAt || extra.publicationDate],['Retrieved',record.retrievedAt],
      ['Freshness',extra.historicalReporting ? 'historical reporting; no current tracking' : maritimeEvidenceFreshness(record, Date.now())],
      ['Observation period',extra.occurrencePeriod || extra.observationPeriod || {start:record.effectiveStart || record.observedAt,end:record.effectiveEnd || record.observedAt}],['Coverage',record.coverage],
      ['Confidence',scopedConfidence],['Limitations',record.qualityLimitations?.length ? record.qualityLimitations : null],['Contradicts',extra.contradictsId],
      ...(extra.proxyNotThroughput ? [['Measurement boundary','AIS visibility proxy; does not measure cargo throughput.']] : []),
    ].map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHtml(valueText(value))}</dd></div>`).join('')}</dl>
    <p>${link}</p><p class="panel-help">Dates and coverage describe this record. A ledger selection does not establish current flow or safety.</p>
  </article>`;
}

export function sourceStatusText(result) {
  const statuses = result.sourceStatus || {};
  const values = Object.entries(statuses);
  if (!values.length) return result.mode === "fallback" ? "Fallback source active" : "Live feed connected";
  const live = values.filter(([, status]) => status.ok && !status.stale).length;
  const degraded = values.filter(([, status]) => (status.ok && status.stale) || status.status === "degraded").length;
  const disabled = values.filter(([, status]) => status.status === "disabled" || status.status === "configuration-required").length;
  const unavailable = values.filter(([, status]) => !status.ok && !["disabled", "configuration-required"].includes(status.status)).length;
  const parts = [`${live} live`];
  if (degraded) parts.push(`${degraded} degraded`);
  if (unavailable) parts.push(`${unavailable} unavailable`);
  if (disabled) parts.push(`${disabled} disabled or credential-gated`);
  const prefix = result.mode === "fallback" ? "Fallback active" : result.systemStatus === "partial-data" ? "Partial public feed" : "Public feed";
  return `${prefix}: ${parts.join(", ")}.`;
}

export function renderSourceHealth(element, result, errors = []) {
  if (!element) return;
  element.textContent = sourceStatusText(result);
  const diagnostics = Object.entries(result.sourceStatus || {}).map(([key, status]) => {
    const duration = Number.isFinite(status.durationMs) ? `${status.durationMs}ms` : "duration unknown";
    const lastSuccess = status.lastSuccessfulAt ? `last success ${new Date(status.lastSuccessfulAt).toLocaleString()}` : "no successful refresh";
    return `${key.toUpperCase()}: ${status.status || (status.ok ? "healthy" : "unavailable")} / ${status.acceptedCount ?? status.count ?? 0} accepted / ${status.rejectedCount ?? 0} rejected / ${duration} / ${lastSuccess}`;
  });
  element.title = [...diagnostics, ...errors].join("\n");
}

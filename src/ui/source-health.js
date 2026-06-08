export function sourceStatusText(result) {
  const statuses = result.sourceStatus || {};
  const values = Object.entries(statuses);
  if (!values.length) return result.mode === "fallback" ? "USGS fallback" : "Live feed";
  const live = values
    .filter(([, status]) => status.ok && !status.stale)
    .map(([key, status]) => `${key.toUpperCase()} ${status.count}`);
  const stale = values
    .filter(([, status]) => status.ok && status.stale)
    .map(([key, status]) => `${key.toUpperCase()} stale ${status.count}`);
  const failed = values.filter(([, status]) => !status.ok).map(([key]) => `${key.toUpperCase()} unavailable`);
  return [...live, ...stale, ...failed].join(" - ");
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

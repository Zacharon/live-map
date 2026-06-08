export function sourceStatusText(result) {
  const statuses = result.sourceStatus || {};
  const values = Object.entries(statuses);
  if (!values.length) return result.mode === "fallback" ? "USGS fallback" : "Live feed";
  const live = values.filter(([, status]) => status.ok).map(([key, status]) => `${key.toUpperCase()} ${status.count}`);
  const failed = values.filter(([, status]) => !status.ok).map(([key]) => `${key.toUpperCase()} delayed`);
  return [...live, ...failed].join(" - ");
}

export function renderSourceHealth(element, result, errors = []) {
  if (!element) return;
  element.textContent = sourceStatusText(result);
  element.title = errors.join("\n");
}

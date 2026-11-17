// Provider metadata is untrusted even when it bypasses ingestion (cached/imported UI data).
export function safeSourceUrl(value) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value.trim())) return null;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function escape(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

export function sourceLink(value, label, className = "") {
  const url = safeSourceUrl(value);
  return url
    ? `<a class="${escape(className)}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>`
    : `<span class="${escape(className)}" title="Source URL unavailable">${escape(label)} unavailable</span>`;
}

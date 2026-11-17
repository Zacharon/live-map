const PRIVATE_IPV4_RANGES = [
  [/^10\./, "private-10"],
  [/^127\./, "loopback"],
  [/^169\.254\./, "link-local"],
  [/^192\.168\./, "private-192"],
  [/^172\.(1[6-9]|2\d|3[0-1])\./, "private-172"],
  [/^0\./, "reserved-0"],
];

function isIpv4Address(host = "") {
  const parts = String(host).split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    if (part.length > 1 && part.startsWith("0")) return false;
    const value = Number(part);
    return Number.isInteger(value) && value >= 0 && value <= 255;
  });
}

export function isPrivateHostname(hostname = "") {
  const host = String(hostname).toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return true;
  if (isIpv4Address(host)) return PRIVATE_IPV4_RANGES.some(([pattern]) => pattern.test(host));
  return false;
}

export function assertSafeFetchUrl(value, options = {}) {
  const allowedProtocols = options.allowedProtocols || ["https:", "http:"];
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid feed URL");
  }
  if (!allowedProtocols.includes(url.protocol)) throw new Error(`Blocked unsafe protocol ${url.protocol}`);
  if (url.username || url.password) throw new Error("Blocked credentials in feed URL");
  // The registry uses DNS names. Refuse IPv6 literals altogether rather than
  // incompletely classifying mapped, translated, or special-purpose addresses.
  if (url.hostname.startsWith("[")) throw new Error("Blocked IPv6 literal feed host");
  if (isPrivateHostname(url.hostname)) throw new Error(`Blocked private or local host ${url.hostname}`);
  if (options.allowedHosts && !options.allowedHosts.includes(url.hostname)) throw new Error(`Host ${url.hostname} is not allowlisted`);
  return url;
}

export function assertSafeRedirect(previousUrl, nextUrl) {
  if (typeof nextUrl !== "string" || !nextUrl.trim()) throw new Error("Blocked missing redirect destination");
  const previous = assertSafeFetchUrl(previousUrl);
  const resolved = assertSafeFetchUrl(new URL(nextUrl, previous).href);
  // Untrusted Location headers cannot expand a registry-controlled feed's
  // authority to another host, port or protocol. DNS/egress remain host controls.
  if (resolved.origin !== previous.origin) throw new Error("Blocked redirect outside configured feed origin");
  return resolved;
}


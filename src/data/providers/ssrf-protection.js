import net from "node:net";

const PRIVATE_IPV4_RANGES = [
  [/^10\./, "private-10"],
  [/^127\./, "loopback"],
  [/^169\.254\./, "link-local"],
  [/^192\.168\./, "private-192"],
  [/^172\.(1[6-9]|2\d|3[0-1])\./, "private-172"],
  [/^0\./, "reserved-0"],
];

export function isPrivateHostname(hostname = "") {
  const host = String(hostname).toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return true;
  if (net.isIP(host) === 4) return PRIVATE_IPV4_RANGES.some(([pattern]) => pattern.test(host));
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
  if (isPrivateHostname(url.hostname)) throw new Error(`Blocked private or local host ${url.hostname}`);
  if (options.allowedHosts && !options.allowedHosts.includes(url.hostname)) throw new Error(`Host ${url.hostname} is not allowlisted`);
  return url;
}

export function assertSafeRedirect(previousUrl, nextUrl) {
  const resolved = new URL(nextUrl, previousUrl);
  return assertSafeFetchUrl(resolved.href);
}


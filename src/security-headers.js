// Security headers for HTML pages served by the Cloudflare Worker. Netlify sets the
// same headers from netlify.toml; tests fail if the two policies drift apart.
export const STRICT_CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://server.arcgisonline.com https://services.arcgisonline.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org https://a.basemaps.cartocdn.com https://b.basemaps.cartocdn.com https://c.basemaps.cartocdn.com https://d.basemaps.cartocdn.com; connect-src 'self' https://earthquake.usgs.gov https://eonet.gsfc.nasa.gov https://api.weather.gov https://api.reliefweb.int https://www.gdacs.org https://server.arcgisonline.com https://services.arcgisonline.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org https://a.basemaps.cartocdn.com https://b.basemaps.cartocdn.com https://c.basemaps.cartocdn.com https://d.basemaps.cartocdn.com; font-src 'self' data:; frame-src 'self' https://app.netlify.com; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests";

// Only the 3D globe page adds 'unsafe-eval', for the eval in Cesium's bundled Knockout.
export const GLOBE_CSP = STRICT_CSP.replace("script-src 'self' 'wasm-unsafe-eval'", "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'");

const GLOBE_PATHS = new Set(["/globe", "/globe/", "/globe.html"]);

export function contentSecurityPolicyFor(pathname) {
  return GLOBE_PATHS.has(pathname) ? GLOBE_CSP : STRICT_CSP;
}

export function withSecurityHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if ((headers.get("content-type") || "").includes("text/html")) {
    headers.set("Content-Security-Policy", contentSecurityPolicyFor(pathname));
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

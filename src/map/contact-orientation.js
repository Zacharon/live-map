// Adapted from gods-eye-view src/data/iconOrientation.js, stabilizeScreenRotation.
// Copyright (c) 2026 Bilawal Sidhu. MIT; see vendor/gods-eye-view/LICENSE.
// Upstream: 759652207fd1279ece97f0f19af566feb9a82146.
// Uses north-up Leaflet headings; the Cesium projection is deliberately omitted.
export function stabilizeScreenRotation(previous, next, deadbandRad = Math.PI / 360) {
  if (!Number.isFinite(next)) return Number.isFinite(previous) ? previous : null;
  if (!Number.isFinite(previous)) return next;
  const delta = Math.atan2(Math.sin(next - previous), Math.cos(next - previous));
  return Math.abs(delta) < Math.max(0, deadbandRad) ? previous : next;
}

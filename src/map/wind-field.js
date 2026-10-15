/**
 * Compact browser-readable wind field. Vectors first.
 * Animation illustrates a field; it is not continuous observation.
 * Synthetic and recorded caches stay separate.
 */

export const WIND_LEVEL = "10 m";
export const WIND_UNITS = "m/s";

export function meteorologicalToFromDirection(u, v) {
  const toward = Math.atan2(u, v) * 180 / Math.PI;
  return (toward + 180 + 360) % 360;
}

export function validateWindField(field) {
  const errors = [];
  if (!field || typeof field !== "object") return { valid: false, errors: ["missing field"] };
  for (const key of ["model", "runTime", "validTime", "forecastLeadHours", "level", "units", "grid"]) errors.push(!(field[key] || field[key] === 0) && key !== "grid" ? `missing ${key}` : null);
  if (!field.grid || !Array.isArray(field.grid.lats) || !Array.isArray(field.grid.lons) || !Array.isArray(field.grid.u) || !Array.isArray(field.grid.v)) errors.push("grid requires lats, lons, u, v");
  if (field.grid?.u?.length !== field.grid?.v?.length) errors.push("u/v length mismatch");
  if (field.synthetic && field.cache !== "synthetic") errors.push("synthetic field must use the synthetic cache");
  if (!field.synthetic && field.cache === "synthetic") errors.push("recorded field cannot use the synthetic cache");
  return { valid: errors.filter(Boolean).length === 0, errors: errors.filter(Boolean) };
}

export function sampleWind(field, lat, lon) {
  const grid = field?.grid;
  if (!grid) return null;
  const lats = grid.lats;
  const lons = grid.lons;
  let lonAdj = ((lon + 180) % 360 + 360) % 360 - 180;
  if (lons[0] >= 0 && lonAdj < 0) lonAdj += 360;
  let latIndex = -1;
  let lonIndex = -1;
  let latDist = Infinity;
  let lonDist = Infinity;
  for (let i = 0; i < lats.length; i += 1) {
    const d = Math.abs(lats[i] - lat);
    if (d < latDist) { latDist = d; latIndex = i; }
  }
  for (let j = 0; j < lons.length; j += 1) {
    const d = Math.min(Math.abs(lons[j] - lonAdj), 360 - Math.abs(lons[j] - lonAdj));
    if (d < lonDist) { lonDist = d; lonIndex = j; }
  }
  if (latIndex < 0 || lonIndex < 0) return null;
  const idx = latIndex * lons.length + lonIndex;
  const u = grid.u[idx];
  const v = grid.v[idx];
  if (u == null || v == null || grid.mask?.[idx] === 0) return { nodata: true, u: null, v: null };
  return { u, v, speed: Math.hypot(u, v), fromDeg: meteorologicalToFromDirection(u, v), nodata: false, level: field.level, validTime: field.validTime };
}

export function createWindFieldRenderer(map, field, { synthetic = false } = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = synthetic ? "wind-proof" : "wind-field";
  canvas.setAttribute("aria-label", `${synthetic ? "SYNTHETIC" : "Recorded GFS"} wind vectors, ${field.units || WIND_UNITS}, ${field.level || WIND_LEVEL}; arrows point toward flow`);
  map.getContainer().append(canvas);
  let enabled = false;
  let opacity = 0.75;
  let reduced = false;
  function draw() {
    canvas.hidden = !enabled || document.hidden;
    if (canvas.hidden) return;
    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;
    const ctx = canvas.getContext("2d");
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = synthetic ? "#a4d8f5" : "#d7ecff";
    ctx.lineWidth = 1.3;
    const step = reduced ? 72 : 44;
    for (let x = 24; x < size.x; x += step) {
      for (let y = 24; y < size.y; y += step) {
        const p = map.containerPointToLatLng([x, y]);
        const sample = sampleWind(field, p.lat, p.lng);
        if (!sample || sample.nodata) continue;
        const angle = Math.atan2(-sample.v, sample.u);
        const length = Math.min(28, sample.speed * 1.6);
        const ex = x + Math.cos(angle) * length;
        const ey = y + Math.sin(angle) * length;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(ex, ey);
        ctx.moveTo(ex - 5 * Math.cos(angle - 0.5), ey - 5 * Math.sin(angle - 0.5));
        ctx.lineTo(ex, ey);
        ctx.lineTo(ex - 5 * Math.cos(angle + 0.5), ey - 5 * Math.sin(angle + 0.5));
        ctx.stroke();
      }
    }
  }
  return {
    set(active, alpha = opacity, options = {}) {
      enabled = active;
      opacity = alpha;
      reduced = options.reduced === true || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      map.off("moveend resize", draw);
      document.removeEventListener("visibilitychange", draw);
      if (active) {
        map.on("moveend resize", draw);
        document.addEventListener("visibilitychange", draw);
      }
      draw();
    },
    destroy() {
      map.off("moveend resize", draw);
      document.removeEventListener("visibilitychange", draw);
      canvas.remove();
    },
    metadata: {
      model: field.model,
      runTime: field.runTime,
      validTime: field.validTime,
      forecastLeadHours: field.forecastLeadHours,
      level: field.level,
      units: field.units,
      gridResolution: field.gridResolution,
      retrievedAt: field.retrievedAt,
      synthetic: field.synthetic === true,
      cache: field.cache,
    },
  };
}

export function recordedGfsSample() {
  return null;
}

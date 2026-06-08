export function setGlobeMode(mode, events) {
  const mapEl = document.getElementById("map");
  const globe = document.getElementById("globeStage");
  const is3d = mode === "3d";
  mapEl.hidden = is3d;
  globe.hidden = !is3d;
  if (!is3d) return;
  globe.innerHTML = `
    <div class="globe-card">
      <strong>3D globe beta</strong>
      <p>A WebGL globe adapter boundary is ready, but Cesium/MapLibre globe is intentionally not loaded in Phase 1 to keep the production 2D map stable.</p>
      <p>${events.length} filtered events are preserved and ready for the future 3D renderer.</p>
    </div>`;
}

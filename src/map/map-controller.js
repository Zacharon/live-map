export function createMapController() {
  const map = L.map("map", { zoomControl: false, minZoom: 2, worldCopyJump: true, preferCanvas: true }).setView([22, 10], 2.35);
  L.control.zoom({ position: "bottomright" }).addTo(map);

  const basemaps = {
    satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Tiles (c) Esri - Source: Esri, Maxar, Earthstar Geographics, and contributors",
    }),
    labels: L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Labels (c) Esri",
      pane: "overlayPane",
    }),
    dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19, attribution: "(c) OpenStreetMap (c) CARTO" }),
    street: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "(c) OpenStreetMap contributors" }),
  };

  basemaps.satellite.addTo(map);
  basemaps.labels.addTo(map);

  const markerLayer = typeof L.markerClusterGroup === "function"
    ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 44, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 7 }).addTo(map)
    : L.layerGroup().addTo(map);
  const ciiLayer = L.layerGroup().addTo(map);
  let activeBase = "satellite";

  function switchBase(name) {
    Object.values(basemaps).forEach((layer) => map.hasLayer(layer) && map.removeLayer(layer));
    activeBase = name;
    if (name === "satellite") {
      basemaps.satellite.addTo(map);
      basemaps.labels.addTo(map);
    } else {
      basemaps[name].addTo(map);
    }
    markerLayer.bringToFront();
  }

  function fitEvents(events) {
    if (events.length) map.fitBounds(events.map((event) => [event.lat, event.lon]), { padding: [40, 40], maxZoom: 7 });
  }

  function renderCountryRisk(scores, visible) {
    ciiLayer.clearLayers();
    if (!visible) return;
    scores.filter((score) => score.coordinates).slice(0, 30).forEach((score) => {
      const circle = L.circleMarker([score.coordinates.lat, score.coordinates.lon], {
        radius: 8 + score.score / 12,
        color: score.color,
        fillColor: score.color,
        fillOpacity: 0.22,
        weight: 2,
      });
      circle.bindTooltip(`<strong>${score.countryName}</strong><br>CII ${score.score} - ${score.levelLabel}<br>${score.confidence}% confidence`);
      ciiLayer.addLayer(circle);
    });
  }

  return {
    map,
    markerLayer,
    switchBase,
    fitWorld: () => map.setView([22, 10], 2.35),
    fitEvents,
    renderCountryRisk,
    activeBase: () => activeBase,
  };
}

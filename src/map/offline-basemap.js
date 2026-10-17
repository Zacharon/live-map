/**
 * Offline dark/natural geographic fallback. Simplified land, not a street tile service.
 * Coordinates are coarse Natural Earth–style continent outlines (public-domain geography).
 */

export const OFFLINE_BASEMAP_CREDIT = "Offline dark basemap — simplified geography";

const LAND = [
  [[-168, 65], [-141, 70], [-130, 55], [-125, 49], [-95, 49], [-83, 44], [-74, 45], [-67, 45], [-80, 25], [-97, 26], [-105, 22], [-117, 32], [-125, 38], [-124, 48], [-135, 57], [-166, 54], [-168, 65]],
  [[-82, 12], [-78, 8], [-62, -5], [-35, -7], [-34, -20], [-40, -22], [-58, -34], [-68, -55], [-75, -50], [-71, -18], [-81, -5], [-77, 8], [-87, 14], [-82, 12]],
  [[-10, 36], [-9, 43], [0, 51], [8, 58], [12, 66], [25, 71], [40, 68], [30, 60], [28, 45], [18, 42], [29, 41], [36, 36], [10, 37], [-5, 36], [-10, 36]],
  [[-17, 15], [-16, 21], [0, 6], [10, 5], [14, -12], [40, -15], [32, 0], [43, 12], [51, 12], [40, -3], [40, -26], [18, -35], [20, -12], [9, 4], [-14, 7], [-17, 15]],
  [[32, 31], [34, 31], [36, 31], [34, 29], [32, 31]],
  [[34, 31], [39, 22], [44, 13], [48, 14], [54, 17], [57, 22], [56, 26], [48, 28], [44, 19], [39, 16], [36, 21], [34, 28], [34, 31]],
  [[44, 37], [48, 37], [52, 27], [57, 27], [61, 25], [66, 25], [62, 30], [61, 37], [50, 40], [44, 40], [44, 37]],
  [[44, 41], [48, 43], [50, 40], [61, 45], [75, 37], [68, 24], [62, 24], [61, 30], [48, 40], [44, 41]],
  [[68, 23], [73, 19], [80, 22], [88, 22], [92, 26], [97, 16], [104, 1], [109, 2], [105, 12], [109, 20], [122, 31], [129, 43], [141, 45], [146, 43], [142, 46], [135, 54], [162, 55], [180, 65], [170, 70], [140, 75], [100, 72], [80, 73], [60, 68], [70, 55], [75, 45], [68, 23]],
  [[113, -10], [131, -12], [153, -27], [151, -34], [146, -39], [115, -35], [114, -22], [113, -10]],
  [[166, -34], [179, -37], [178, -47], [166, -47], [166, -34]],
];

export function landFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: LAND.map((ring, index) => ({
      type: "Feature",
      id: `land-${index}`,
      properties: { kind: "offline-land" },
      geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] },
    })),
  };
}

export function addOfflineDarkLayer(map, L) {
  const pane = map.getPane("offline-dark") || map.createPane("offline-dark");
  pane.style.zIndex = "250";
  pane.style.pointerEvents = "none";
  const renderer = L.svg({ pane: "offline-dark", padding: 0.5 });
  const land = L.geoJSON(landFeatureCollection(), {
    pane: "offline-dark",
    renderer,
    interactive: false,
    style: {
      color: "#8ea0b8",
      weight: 0.8,
      fillColor: "#3b516c",
      fillOpacity: 1,
    },
  });
  const group = L.layerGroup([land]);
  group.addTo(map);
  map.attributionControl?.addAttribution(OFFLINE_BASEMAP_CREDIT);
  return group;
}

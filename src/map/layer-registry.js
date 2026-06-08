import { LAYER_CATALOG } from "../data/layers.js";

export function layerCountsByStatus(layers = LAYER_CATALOG) {
  return layers.reduce((counts, layer) => {
    counts[layer.status] = (counts[layer.status] || 0) + 1;
    return counts;
  }, {});
}

export function implementedLayers(layers = LAYER_CATALOG) {
  return layers.filter((layer) => layer.implemented);
}

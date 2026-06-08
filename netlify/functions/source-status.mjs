import { LAYER_CATALOG } from "../../src/data/layers.js";
import { jsonResponse } from "./lib/response.mjs";

export default async () => {
  const status = LAYER_CATALOG.reduce((acc, layer) => {
    acc[layer.status] = (acc[layer.status] || 0) + 1;
    return acc;
  }, {});
  return jsonResponse(status, {
    sourceStatus: {
      layerCatalog: { status: "operational", count: LAYER_CATALOG.length },
    },
  });
};

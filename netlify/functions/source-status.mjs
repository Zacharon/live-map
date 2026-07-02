import { LAYER_CATALOG } from "../../src/data/layers.js";
import { jsonResponse, withPublicApiGuard } from "./lib/response.mjs";

export default async (request) => {
  return withPublicApiGuard(request, () => {
    const status = LAYER_CATALOG.reduce((acc, layer) => {
      acc[layer.status] = (acc[layer.status] || 0) + 1;
      return acc;
    }, {});
    return jsonResponse(status, {
      sourceStatus: {
        layerCatalog: { status: "operational", count: LAYER_CATALOG.length },
      },
    });
  });
};

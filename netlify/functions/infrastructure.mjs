import { LAYER_CATALOG } from "../../src/data/layers.js";
import { jsonResponse, withPublicApiGuard } from "./lib/response.mjs";

export default async (request) => {
  return withPublicApiGuard(request, () => {
    const infrastructureLayers = LAYER_CATALOG.filter((layer) => ["Infrastructure", "Transportation"].includes(layer.category));
    return jsonResponse({
      layers: infrastructureLayers,
      assets: [],
    }, {
      sourceStatus: {
        infrastructureRegistry: { status: "planned", count: infrastructureLayers.length },
      },
      warnings: ["Static infrastructure assets are scaffolded only. No outage status is implied."],
    });
  });
};

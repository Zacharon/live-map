import { LAYER_CATALOG } from "../../src/data/layers.js";
import { jsonResponse } from "./lib/response.mjs";

export default async () => {
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
};

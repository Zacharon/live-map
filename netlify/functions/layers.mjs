import { LAYER_CATALOG } from "../../src/data/layers.js";
import { jsonResponse } from "./lib/response.mjs";

export default async () => jsonResponse(LAYER_CATALOG, {
  sourceStatus: {
    layerCatalog: { status: "operational", count: LAYER_CATALOG.length },
  },
});

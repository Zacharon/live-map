import { LAYER_CATALOG } from "../../src/data/layers.js";
import { jsonResponse, withPublicApiGuard } from "./lib/response.mjs";

export default async (request) =>
  withPublicApiGuard(request, () =>
    jsonResponse(LAYER_CATALOG, {
      sourceStatus: {
        layerCatalog: { status: "operational", count: LAYER_CATALOG.length },
      },
    })
  );

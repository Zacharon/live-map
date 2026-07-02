import { createSourcesResponse } from "../../src/api/sources-response.js";
import { withPublicApiGuard } from "./lib/response.mjs";

export default async (request) => {
  return withPublicApiGuard(request, () => createSourcesResponse(request));
};

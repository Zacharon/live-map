import { createProviderHealthResponse } from "../../src/api/provider-health-response.js";
import { withPublicApiGuard } from "./lib/response.mjs";

export default async (request) => {
  return withPublicApiGuard(request, () => createProviderHealthResponse(request));
};

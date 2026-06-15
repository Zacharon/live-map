import { createProviderHealthResponse } from "../../src/api/provider-health-response.js";

export default async (request) => {
  return createProviderHealthResponse(request);
};

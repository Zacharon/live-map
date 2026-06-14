import { createSourcesResponse } from "../../src/api/sources-response.js";

export default async (request) => {
  return createSourcesResponse(request);
};

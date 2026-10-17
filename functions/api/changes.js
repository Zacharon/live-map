import { createChangesResponse } from "../../src/api/changes-response.js";
import { apiBodyLimitBytes, apiContentLength, checkApiRateLimit, jsonPayloadTooLargeResponse, jsonRateLimitResponse } from "../../src/api/rate-limit.js";

export async function onRequest(context) {
  const length = apiContentLength(context.request);
  if (length != null && length > apiBodyLimitBytes(context.env)) return jsonPayloadTooLargeResponse();
  const rateLimit = checkApiRateLimit(context.request, context.env);
  if (!rateLimit.allowed) return jsonRateLimitResponse(rateLimit);
  return createChangesResponse(context.request, { env: context.env });
}

import {
  apiBodyLimitBytes,
  apiContentLength,
  checkApiRateLimit,
  jsonPayloadTooLargeResponse,
  jsonRateLimitResponse,
} from "../../../src/api/rate-limit.js";

class PublicApiRequestError extends Error {
  constructor(response) {
    super("Invalid public API request");
    this.name = "PublicApiRequestError";
    this.response = response;
  }
}

export function jsonResponse(data, options = {}) {
  const generatedAt = Date.now();
  const body = {
    data,
    generatedAt,
    sourceStatus: options.sourceStatus || {},
    warnings: options.warnings || [],
    errors: options.errors || [],
    requestId: options.requestId || `req-${generatedAt}-${Math.random().toString(36).slice(2, 8)}`,
  };
  return new Response(JSON.stringify(body), {
    status: options.status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": options.cacheControl || "public, max-age=60, s-maxage=60",
    },
  });
}

function runtimeEnv() {
  return globalThis.process?.env || {};
}

function jsonBadRequestResponse(message) {
  return Response.json(
    {
      error: "bad-request",
      message,
    },
    {
      status: 400,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
}

async function readBoundedText(request, limitBytes) {
  if (!request.body) return "";
  const reader = request.body.getReader?.();
  if (!reader) {
    if (apiContentLength(request) == null) throw new PublicApiRequestError(jsonPayloadTooLargeResponse());
    return request.text();
  }

  const decoder = new TextDecoder();
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > limitBytes) throw new PublicApiRequestError(jsonPayloadTooLargeResponse());
    chunks.push(decoder.decode(value, { stream: true }));
  }

  chunks.push(decoder.decode());
  return chunks.join("");
}

export function guardPublicApiRequest(request, options = {}) {
  const env = options.env || runtimeEnv();
  const declaredLength = apiContentLength(request);
  if (declaredLength != null && declaredLength > apiBodyLimitBytes(env)) {
    return jsonPayloadTooLargeResponse();
  }

  const rateLimit = checkApiRateLimit(request, env);
  if (!rateLimit.allowed) return jsonRateLimitResponse(rateLimit);
  return null;
}

export async function withPublicApiGuard(request, handler, options = {}) {
  const guardResponse = guardPublicApiRequest(request, options);
  if (guardResponse) return guardResponse;
  return handler();
}

export function jsonRequestErrorResponse(error) {
  return error instanceof PublicApiRequestError ? error.response : null;
}

export async function parseJson(request) {
  const env = runtimeEnv();
  const limitBytes = apiBodyLimitBytes(env);
  const declaredLength = apiContentLength(request);
  if (declaredLength != null && declaredLength > limitBytes) {
    throw new PublicApiRequestError(jsonPayloadTooLargeResponse());
  }

  const text = await readBoundedText(request, limitBytes);
  if (!text.trim()) return {};

  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    throw new PublicApiRequestError(jsonBadRequestResponse("Malformed JSON request body."));
  }
}

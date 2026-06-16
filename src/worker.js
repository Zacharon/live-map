import { ApiInputError, MAX_JSON_BODY_BYTES, apiErrorResponse, contentLength } from "./api/request-validation.js";

function installCloudflareEnv(env) {
  if (!env || typeof env !== "object") return;
  const currentProcess = globalThis.process || {};
  globalThis.process = {
    ...currentProcess,
    env: {
      ...(currentProcess.env || {}),
      ...env,
    },
  };
}

function jsonResponse(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

async function eventsResponse(request, env) {
  installCloudflareEnv(env);
  const { createEventsResponse } = await import("./api/events-response.js");
  return createEventsResponse(request, {
    env,
    runtimeMode: "cloudflare-workers",
  });
}

async function sourcesResponse(request) {
  const { createSourcesResponse } = await import("./api/sources-response.js");
  return createSourcesResponse(request);
}

async function providerHealthResponse(request, env) {
  installCloudflareEnv(env);
  const { createProviderHealthResponse } = await import("./api/provider-health-response.js");
  return createProviderHealthResponse(request, {
    env,
    runtimeMode: "cloudflare-workers",
  });
}

async function safeApiResponse(callback) {
  try {
    return await callback();
  } catch (error) {
    return apiErrorResponse(error, {
      "access-control-allow-origin": "*",
    });
  }
}

function assetAliasRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const length = contentLength(request);
    if (url.pathname.startsWith("/api/") && length != null && length > MAX_JSON_BODY_BYTES) {
      return apiErrorResponse(new ApiInputError(413, "payload-too-large", "Request body is too large."), {
        "access-control-allow-origin": "*",
      });
    }

    if (url.pathname === "/api/events") {
      return safeApiResponse(() => eventsResponse(request, env));
    }

    if (url.pathname === "/api/sources") {
      return safeApiResponse(() => sourcesResponse(request));
    }

    if (url.pathname === "/api/provider-health") {
      return safeApiResponse(() => providerHealthResponse(request, env));
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse(
        {
          error: "not-found",
          message: "API route not implemented on Cloudflare yet",
        },
        404
      );
    }

    if (url.pathname === "/sources") {
      return env.ASSETS.fetch(assetAliasRequest(request, "/source-explorer.html"));
    }

    return env.ASSETS.fetch(request);
  },
};

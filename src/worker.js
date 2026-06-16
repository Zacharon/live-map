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

function assetAliasRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/events") {
      return eventsResponse(request, env);
    }

    if (url.pathname === "/api/sources") {
      return sourcesResponse(request);
    }

    if (url.pathname === "/api/provider-health") {
      return providerHealthResponse(request, env);
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

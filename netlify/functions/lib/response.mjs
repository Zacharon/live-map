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

export async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

import { jsonRequestErrorResponse, jsonResponse, parseJson, withPublicApiGuard } from "./lib/response.mjs";

export default async (request) => {
  return withPublicApiGuard(request, async () => {
    if (request.method !== "POST") {
      return jsonResponse(null, { status: 405, errors: ["Use POST for AI brief requests."] });
    }
    let body;
    try {
      body = await parseJson(request);
    } catch (error) {
      const response = jsonRequestErrorResponse(error);
      if (response) return response;
      throw error;
    }
    return jsonResponse({
      briefType: body.briefType || "global",
      enabled: false,
      generatedText: null,
      provider: body.provider || "disabled",
      model: body.model || "not-configured",
      citations: [],
      safety: "AI briefs are scaffolded. Configure a server-side provider before generation.",
    }, {
      warnings: ["AI generation is disabled until a provider is explicitly configured server-side."],
      sourceStatus: {
        aiProvider: { status: "disabled" },
      },
    });
  });
};

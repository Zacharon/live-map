import { jsonRequestErrorResponse, jsonResponse, parseJson, withPublicApiGuard } from "./lib/response.mjs";

function validateRule(rule) {
  const errors = [];
  if (!rule.name || rule.name.length < 3) errors.push("Alert name must be at least 3 characters.");
  if (!rule.conditions || typeof rule.conditions !== "object") errors.push("Alert conditions are required.");
  return errors;
}

export default async (request) => {
  return withPublicApiGuard(request, async () => {
    if (request.method !== "POST") {
      return jsonResponse(null, { status: 405, errors: ["Use POST to test alert rules."] });
    }
    let rule;
    try {
      rule = await parseJson(request);
    } catch (error) {
      const response = jsonRequestErrorResponse(error);
      if (response) return response;
      throw error;
    }
    const errors = validateRule(rule);
    return jsonResponse({
      valid: errors.length === 0,
      externalDelivery: false,
      previewOnly: true,
    }, {
      errors,
      warnings: ["External notifications are disabled until explicit delivery setup exists."],
    });
  });
};

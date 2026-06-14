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

export async function onRequest(context) {
  installCloudflareEnv(context.env);
  // Load shared code after context.env is installed because provider modules may
  // inspect server-only environment during initialization in both runtimes.
  const { createEventsResponse } = await import("../../src/api/events-response.js");
  return createEventsResponse(context.request, {
    env: context.env,
    runtimeMode: "cloudflare-pages-function",
  });
}

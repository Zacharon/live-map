export function abortError(message = "Upstream request timed out.") {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

export function createLinkedSignal(parentSignal, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1, Number(timeoutMs) || 1));
  const onParentAbort = () => controller.abort();
  if (parentSignal?.aborted) controller.abort();
  else if (parentSignal) parentSignal.addEventListener("abort", onParentAbort, { once: true });
  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timeout);
      parentSignal?.removeEventListener?.("abort", onParentAbort);
    },
  };
}

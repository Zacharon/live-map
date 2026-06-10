export function aishubStatus() {
  return {
    providerId: "aishub",
    status: "configuration-required",
    ok: false,
    message: "AISHub access depends on its participation/access model and is not activated.",
    coverage: "AIS availability depends on contributor/access terms.",
    delay: "Do not assume unrestricted real-time or commercial redistribution.",
    nextRefreshAfterMs: 120000,
  };
}

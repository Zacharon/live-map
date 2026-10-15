// Persistence is optional. Keep the running workspace usable when privacy
// settings deny storage; callers can report a failed save without losing state.
export const workspaceStorage = {
  getItem(key) {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  },
  setItem(key, value) {
    try {
      if (!globalThis.localStorage) return false;
      globalThis.localStorage.setItem(key, value);
      return true;
    } catch { return false; }
  },
};

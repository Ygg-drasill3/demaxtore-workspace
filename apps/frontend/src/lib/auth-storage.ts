import { createJSONStorage, type StateStorage } from "zustand/middleware";

const AUTH_STORAGE_KEY = "dmx.auth";

/** sessionStorage → localStorage migration for existing sessions (BUG-002). */
function migrateLegacyAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const legacy = sessionStorage.getItem(AUTH_STORAGE_KEY);
    const current = localStorage.getItem(AUTH_STORAGE_KEY);
    if (legacy && !current) {
      localStorage.setItem(AUTH_STORAGE_KEY, legacy);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    /* private browsing / quota */
  }
}

function storage(): StateStorage {
  migrateLegacyAuthStorage();
  return localStorage;
}

export const authPersistStorage = createJSONStorage(() => storage());

export { AUTH_STORAGE_KEY };

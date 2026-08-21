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

function memoryStorage(): StateStorage {
  const map = new Map<string, string>();
  return {
    getItem: (name) => map.get(name) ?? null,
    setItem: (name, value) => {
      map.set(name, value);
    },
    removeItem: (name) => {
      map.delete(name);
    },
  };
}

function storage(): StateStorage {
  migrateLegacyAuthStorage();
  // Node 26 / some test runners expose `localStorage` without a working setItem
  // unless `--localstorage-file` is passed. Fall back so auth persist never throws.
  try {
    if (typeof localStorage === "undefined" || typeof localStorage.setItem !== "function") {
      return memoryStorage();
    }
    const probe = "__dmx_ls_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return memoryStorage();
  }
}

export const authPersistStorage = createJSONStorage(() => storage());

export { AUTH_STORAGE_KEY };

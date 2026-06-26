// apps/frontend/src/store/auth.store.ts
import axios from "axios";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RegisterInput, UserDTO } from "@dmx/contracts/auth";
import { AUTH_STORAGE_KEY, authPersistStorage } from "@/lib/auth-storage";

type AuthStatus = "idle" | "hydrating" | "authenticated" | "unauthenticated";

interface AuthState {
  user: UserDTO | null;
  accessToken: string | null;
  status: AuthStatus;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<UserDTO>;
  register: (input: RegisterInput) => Promise<UserDTO>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  logoutLocal: () => void;
  setSession: (user: UserDTO, accessToken: string) => void;
}

/** Isolated client — avoids circular imports with api.ts interceptors. */
const authHttp = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  withCredentials: true,
  timeout: 10_000,
});

let hydrateInFlight: Promise<void> | null = null;

export function resetAuthHydrateFlight(): void {
  hydrateInFlight = null;
}

function applyStorageSession(patch: { user: UserDTO | null; accessToken: string | null }) {
  if (patch.user && patch.accessToken) {
    useAuth.setState({ user: patch.user, accessToken: patch.accessToken, status: "authenticated" });
    return;
  }
  if (!patch.user && !patch.accessToken) {
    useAuth.setState({ user: null, accessToken: null, status: "unauthenticated" });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== AUTH_STORAGE_KEY || e.newValue == null) return;
    try {
      const parsed = JSON.parse(e.newValue).state;
      if (!parsed) return;
      applyStorageSession({ user: parsed.user ?? null, accessToken: parsed.accessToken ?? null });
    } catch {
      /* ignore corrupt storage */
    }
  });
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      status: "idle",

      hydrate: async () => {
        if (hydrateInFlight) return hydrateInFlight;
        hydrateInFlight = (async () => {
          set({ status: "hydrating" });
          try {
            const { data } = await authHttp.post<{ user?: UserDTO; accessToken: string }>("/auth/refresh");
            set((s) => ({
              user: data.user ?? s.user,
              accessToken: data.accessToken,
              status: "authenticated",
            }));
          } catch {
            set({ user: null, accessToken: null, status: "unauthenticated" });
          } finally {
            hydrateInFlight = null;
          }
        })();
        return hydrateInFlight;
      },

      login: async (email, password) => {
        const { data } = await authHttp.post<{ user: UserDTO; accessToken: string }>("/auth/login", {
          email,
          password,
        });
        set({ user: data.user, accessToken: data.accessToken, status: "authenticated" });
        return data.user;
      },

      register: async (input) => {
        const { data } = await authHttp.post<{ user: UserDTO; accessToken: string }>("/auth/register", input);
        set({ user: data.user, accessToken: data.accessToken, status: "authenticated" });
        return data.user;
      },

      refresh: async () => {
        const { data } = await authHttp.post<{ user?: UserDTO; accessToken: string }>("/auth/refresh");
        set((s) => ({
          user: data.user ?? s.user,
          accessToken: data.accessToken,
          status: "authenticated",
        }));
      },

      logout: async () => {
        get().logoutLocal();
        try {
          await authHttp.post("/auth/logout");
        } catch {
          /* cookie may already be cleared */
        }
      },

      logoutLocal: () => set({ user: null, accessToken: null, status: "unauthenticated" }),

      setSession: (user, accessToken) => set({ user, accessToken, status: "authenticated" }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: authPersistStorage,
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.user) state.status = "idle";
      },
    },
  ),
);

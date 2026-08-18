// apps/frontend/src/store/auth.store.ts
import axios from "axios";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RegisterInput, UserDTO } from "@dmx/contracts/auth";
import type { PasswordlessScope } from "@dmx/contracts/passwordless-access";
import { AUTH_STORAGE_KEY, authPersistStorage } from "@/lib/auth-storage";

type AuthStatus = "idle" | "hydrating" | "authenticated" | "unauthenticated";
type AccessMode = "full" | "passwordless";

interface AuthState {
  user: UserDTO | null;
  accessToken: string | null;
  accessMode: AccessMode;
  passwordlessScope: PasswordlessScope | null;
  status: AuthStatus;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<UserDTO>;
  register: (input: RegisterInput) => Promise<UserDTO>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  logoutLocal: () => void;
  setSession: (user: UserDTO, accessToken: string) => void;
  setPasswordlessSession: (user: UserDTO, accessToken: string, scope: PasswordlessScope) => void;
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

function applyStorageSession(patch: {
  user: UserDTO | null;
  accessToken: string | null;
  accessMode?: AccessMode;
  passwordlessScope?: PasswordlessScope | null;
}) {
  if (patch.user && patch.accessToken) {
    useAuth.setState({
      user: patch.user,
      accessToken: patch.accessToken,
      accessMode: patch.accessMode ?? useAuth.getState().accessMode ?? "full",
      passwordlessScope: patch.passwordlessScope ?? useAuth.getState().passwordlessScope,
      status: "authenticated",
    });
    return;
  }
  if (!patch.user && !patch.accessToken) {
    useAuth.setState({
      user: null,
      accessToken: null,
      accessMode: "full",
      passwordlessScope: null,
      status: "unauthenticated",
    });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== AUTH_STORAGE_KEY || e.newValue == null) return;
    try {
      const parsed = JSON.parse(e.newValue).state;
      if (!parsed) return;
      applyStorageSession({
        user: parsed.user ?? null,
        accessToken: parsed.accessToken ?? null,
        accessMode: parsed.accessMode,
        passwordlessScope: parsed.passwordlessScope ?? null,
      });
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
      accessMode: "full",
      passwordlessScope: null,
      status: "idle",

      hydrate: async () => {
        if (get().accessMode === "passwordless") {
          set({ status: get().accessToken ? "authenticated" : "unauthenticated" });
          return;
        }
        if (hydrateInFlight) return hydrateInFlight;

        const priorUser = get().user;
        const priorToken = get().accessToken;

        hydrateInFlight = (async () => {
          set({ status: "hydrating" });
          try {
            // login-static persists user + accessToken; refresh cookie may be unavailable on HTTP dev.
            if (priorUser && priorToken) {
              try {
                const { data: me } = await authHttp.get<UserDTO>("/auth/me", {
                  headers: { Authorization: `Bearer ${priorToken}` },
                });
                set({
                  user: me,
                  accessToken: priorToken,
                  accessMode: "full",
                  passwordlessScope: null,
                  status: "authenticated",
                });
                try {
                  const { data } = await authHttp.post<{ user?: UserDTO; accessToken: string }>("/auth/refresh");
                  set((s) => ({
                    user: data.user ?? s.user,
                    accessToken: data.accessToken,
                    accessMode: "full",
                    passwordlessScope: null,
                    status: "authenticated",
                  }));
                } catch {
                  /* keep persisted access token when refresh cookie is missing (local E2E over HTTP) */
                }
                return;
              } catch {
                /* fall through to cookie refresh */
              }
            }

            const { data } = await authHttp.post<{ user?: UserDTO; accessToken: string }>("/auth/refresh");
            set((s) => ({
              user: data.user ?? s.user,
              accessToken: data.accessToken,
              accessMode: "full",
              passwordlessScope: null,
              status: "authenticated",
            }));
          } catch {
            set({
              user: null,
              accessToken: null,
              accessMode: "full",
              passwordlessScope: null,
              status: "unauthenticated",
            });
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
        set({ user: data.user, accessToken: data.accessToken, accessMode: "full", passwordlessScope: null, status: "authenticated" });
        return data.user;
      },

      register: async (input) => {
        const { data } = await authHttp.post<{ user: UserDTO; accessToken: string }>("/auth/register", input);
        set({ user: data.user, accessToken: data.accessToken, accessMode: "full", passwordlessScope: null, status: "authenticated" });
        return data.user;
      },

      refresh: async () => {
        const { data } = await authHttp.post<{ user?: UserDTO; accessToken: string }>("/auth/refresh");
        set((s) => ({
          user: data.user ?? s.user,
          accessToken: data.accessToken,
          accessMode: "full",
          passwordlessScope: null,
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

      logoutLocal: () => set({
        user: null,
        accessToken: null,
        accessMode: "full",
        passwordlessScope: null,
        status: "unauthenticated",
      }),

      setSession: (user, accessToken) => set({
        user,
        accessToken,
        accessMode: "full",
        passwordlessScope: null,
        status: "authenticated",
      }),

      setPasswordlessSession: (user, accessToken, scope) => set({
        user,
        accessToken,
        accessMode: "passwordless",
        passwordlessScope: scope,
        status: "authenticated",
      }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: authPersistStorage,
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        accessMode: s.accessMode,
        passwordlessScope: s.passwordlessScope,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;
        if (state.user && state.accessToken) {
          state.status = "authenticated";
        } else if (!state.user) {
          state.status = "idle";
        }
      },
    },
  ),
);

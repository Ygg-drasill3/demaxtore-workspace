// apps/frontend/src/lib/api.ts
import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { useAuth } from "@/store/auth.store";
import { useToast } from "@/store/toast.store";
import type { ApiError } from "@dmx/contracts/api";
import { waitForAuthReady } from "@/lib/wait-for-auth";

export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,                  // sends refresh-token cookie
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// --- Request: attach bearer + idempotency for unsafe methods ----------------
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await waitForAuthReady();
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.method && /^(post|put|patch|delete)$/i.test(config.method)) {
    if (!config.headers["Idempotency-Key"]) {
      config.headers["Idempotency-Key"] = crypto.randomUUID();
    }
  }
  return config;
});

// --- Response: 401 → silent refresh, surface ApiError consistently ----------
let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ApiError>) => {
    const status   = error.response?.status;
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };

    // Pass through validation/business errors untouched
    if (status !== 401 || original._retried || original.url?.includes("/auth/")) {
      maybeToastError(error);
      return Promise.reject(error);
    }

    original._retried = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push(() => api(original).then(resolve).catch(reject));
      });
    }

    isRefreshing = true;
    try {
      await useAuth.getState().refresh();
      pendingQueue.forEach((cb) => cb());
      pendingQueue = [];
      return api(original);
    } catch (e) {
      pendingQueue = [];
      const returnPath = `${window.location.pathname}${window.location.search}`;
      useAuth.getState().logoutLocal();
      const loginUrl = `/login?${new URLSearchParams({ from: returnPath }).toString()}`;
      if (window.location.pathname !== "/login") {
        window.location.replace(loginUrl);
      }
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  },
);

function maybeToastError(err: AxiosError<ApiError>) {
  // Don't auto-toast 4xx form-validation errors — pages handle those inline.
  if ((err.response?.status ?? 0) >= 500) {
    useToast.getState().push({
      type: "ERROR",
      title: "Server error",
      body: err.response?.data?.error?.message ?? err.message,
    });
  }
}

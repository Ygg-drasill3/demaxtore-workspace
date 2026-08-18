import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const ACCESS_KEY = "dmx_access_token";
const REFRESH_KEY = "dmx_refresh_token";

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: ({ access_token, refresh_token }) => {
    if (access_token) localStorage.setItem(ACCESS_KEY, access_token);
    if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({ baseURL: BACKEND_URL });

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const isAuthEndpoint = (original.url || "").includes("/api/auth/");
    if (status !== 401 || original._retried || isAuthEndpoint) {
      return Promise.reject(error);
    }
    const refresh_token = tokenStore.getRefresh();
    if (!refresh_token) {
      tokenStore.clear();
      return Promise.reject(error);
    }
    try {
      refreshing =
        refreshing ||
        axios.post(`${API_BASE}/auth/refresh`, { refresh_token }).finally(() => {
          // reset shared promise after a tick
          setTimeout(() => {
            refreshing = null;
          }, 0);
        });
      const { data } = await refreshing;
      tokenStore.set({ access_token: data.access_token });
      original._retried = true;
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return api(original);
    } catch (e) {
      tokenStore.clear();
      return Promise.reject(error);
    }
  }
);

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

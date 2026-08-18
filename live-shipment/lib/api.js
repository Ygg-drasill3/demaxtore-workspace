import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE, timeout: 30000 });

// AIS provider client (frontend-side abstraction — mirrors backend AISProvider)
export const AisApi = {
  vessels: async ({ bounds, types, limit = 5000 } = {}) => {
    const [minLng, minLat, maxLng, maxLat] = bounds || [-180, -85, 180, 85];
    const params = { min_lng: minLng, min_lat: minLat, max_lng: maxLng, max_lat: maxLat, limit };
    if (types?.length) params.types = types.join(",");
    const { data } = await api.get("/vessels", { params });
    return data;
  },
  search: async (q) => (await api.get("/vessels/search", { params: { q } })).data.results,
  vessel: async (id) => (await api.get(`/vessels/${id}`)).data,
  track: async (id, hours = 24) => (await api.get(`/vessels/${id}/track`, { params: { hours } })).data.track,
  forecast: async (id) => (await api.get(`/vessels/${id}/forecast`)).data.forecast,
  ports: async (q, limit = 100) => (await api.get("/ports", { params: { q, limit } })).data.ports,
  port: async (id) => (await api.get(`/ports/${id}`)).data,
  companies: async () => (await api.get("/companies")).data.companies,
  routes: async () => (await api.get("/routes")).data.routes,
  analytics: async () => (await api.get("/analytics/overview")).data,
  fleet: async () => (await api.get("/fleet")).data.fleet,
  addFleet: async (vessel_id, label) => (await api.post("/fleet", { vessel_id, label })).data,
  removeFleet: async (vessel_id) => (await api.delete(`/fleet/${vessel_id}`)).data,
  alerts: async (limit = 50) => (await api.get("/alerts", { params: { limit } })).data,
  markAlertsRead: async () => (await api.post("/alerts/read")).data,
};

export function wsUrl() {
  const base = BACKEND_URL.replace(/^http/, "ws");
  return `${base}/api/ws`;
}

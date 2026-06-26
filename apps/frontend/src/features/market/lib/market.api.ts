import { api } from "@/lib/api";
import type { MarketInsight } from "@dmx/contracts/market-intelligence";

export const marketApi = {
  insights: () => api.get<MarketInsight>("/market/insights").then((r) => r.data),
  trends: () => api.get("/market/trends").then((r) => r.data),
  categories: () => api.get("/market/categories").then((r) => r.data),
  countries: () => api.get("/market/countries").then((r) => r.data),
  routes: () => api.get("/market/routes").then((r) => r.data),
  opportunities: () => api.get("/market/opportunities").then((r) => r.data),
  recommendations: () => api.get("/market/recommendations").then((r) => r.data),
  supplyGaps: () => api.get("/market/supply-gaps").then((r) => r.data),
  buyerOpportunities: () => api.get("/market/buyers/opportunities").then((r) => r.data),
  forwarderOpportunities: () => api.get("/market/forwarders/opportunities").then((r) => r.data),
};

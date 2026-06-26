import { api } from "@/lib/api";
import type {
  BuyerPerformanceRow,
  ControlTowerAlert,
  ControlTowerMetric,
  ControlTowerOverview,
  SlaMetricRow,
  SupplierPerformanceRow,
} from "@dmx/contracts/control-tower";

export const controlTowerApi = {
  dashboard: () =>
    api.get<import("@dmx/contracts/import-control-tower").ImportControlTowerDashboard>(
      "/control-tower/dashboard",
    ).then((r) => r.data),

  dashboardWithFilters: (params?: Record<string, string>) =>
    api.get<import("@dmx/contracts/import-control-tower").ImportControlTowerDashboard>(
      "/control-tower/dashboard",
      { params },
    ).then((r) => r.data),

  opsDashboard: () =>
    api.get<{
      overview: ControlTowerOverview;
      alerts: { items: ControlTowerAlert[]; total: number };
      sla: SlaMetricRow[];
      freightCommercial: import("@dmx/contracts/freight-commercial").FreightCommercialMetrics;
    }>("/control-tower/ops-dashboard").then((r) => r.data),

  overview: () =>
    api.get<ControlTowerOverview>("/control-tower/overview").then((r) => r.data),

  alerts: (params?: { severity?: string; resolved?: string; limit?: number }) =>
    api.get<{ items: ControlTowerAlert[]; total: number }>("/control-tower/alerts", { params })
      .then((r) => r.data),

  alert: (id: string) =>
    api.get<ControlTowerAlert>(`/control-tower/alerts/${id}`).then((r) => r.data),

  resolveAlert: (id: string, note?: string) =>
    api.post<ControlTowerAlert>(`/control-tower/alerts/${id}/resolve`, { note }).then((r) => r.data),

  metrics: () =>
    api.get<ControlTowerMetric[]>("/control-tower/metrics").then((r) => r.data),

  sla: () =>
    api.get<SlaMetricRow[]>("/control-tower/sla").then((r) => r.data),

  supplierPerformance: () =>
    api.get<SupplierPerformanceRow[]>("/control-tower/supplier-performance").then((r) => r.data),

  buyerPerformance: () =>
    api.get<BuyerPerformanceRow[]>("/control-tower/buyer-performance").then((r) => r.data),

  shipmentTracking: () =>
    api.get<import("@dmx/contracts/shipment-tracking").ShipmentTrackingOpsSummary>(
      "/control-tower/shipment-tracking",
    ).then((r) => r.data),
};

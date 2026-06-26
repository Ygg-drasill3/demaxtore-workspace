import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { controlTowerApi } from "../lib/control-tower.api";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { useEffect, useMemo, useRef } from "react";
import { STALE } from "@/lib/queryClient";

export const ctKeys = {
  all: ["control-tower"] as const,
  overview: () => [...ctKeys.all, "overview"] as const,
  dashboard: () => [...ctKeys.all, "dashboard"] as const,
  alerts: (q?: object) => [...ctKeys.all, "alerts", q] as const,
  metrics: () => [...ctKeys.all, "metrics"] as const,
  sla: () => [...ctKeys.all, "sla"] as const,
  suppliers: () => [...ctKeys.all, "suppliers"] as const,
  buyers: () => [...ctKeys.all, "buyers"] as const,
  shipmentTracking: () => [...ctKeys.all, "shipment-tracking"] as const,
};

export function useImportControlTowerDashboard(params?: Record<string, string>) {
  return useQuery({
    queryKey: [...ctKeys.dashboard(), params],
    queryFn: () => controlTowerApi.dashboardWithFilters(params),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

/** Admin ops bundle (Sprint 4A) */
export function useControlTowerOpsDashboard() {
  return useQuery({
    queryKey: [...ctKeys.dashboard(), "ops"],
    queryFn: controlTowerApi.opsDashboard,
    staleTime: STALE.controlTower,
  });
}

/** @deprecated use useControlTowerOpsDashboard for admin or useImportControlTowerDashboard for buyers */
export function useControlTowerDashboard() {
  return useControlTowerOpsDashboard();
}

export function useControlTowerOverview() {
  return useQuery({
    queryKey: ctKeys.overview(),
    queryFn: controlTowerApi.overview,
    staleTime: STALE.controlTower,
  });
}

export function useControlTowerAlerts(resolved = "false") {
  return useQuery({
    queryKey: ctKeys.alerts({ resolved }),
    queryFn: () => controlTowerApi.alerts({ resolved, limit: 50 }),
    staleTime: STALE.controlTower,
  });
}

export function useControlTowerMetrics() {
  return useQuery({
    queryKey: ctKeys.metrics(),
    queryFn: controlTowerApi.metrics,
    staleTime: STALE.controlTower,
  });
}

export function useControlTowerSla() {
  return useQuery({
    queryKey: ctKeys.sla(),
    queryFn: controlTowerApi.sla,
    staleTime: STALE.controlTower,
  });
}

export function useSupplierPerformance() {
  return useQuery({
    queryKey: ctKeys.suppliers(),
    queryFn: controlTowerApi.supplierPerformance,
    staleTime: STALE.controlTower,
  });
}

export function useBuyerPerformance() {
  return useQuery({
    queryKey: ctKeys.buyers(),
    queryFn: controlTowerApi.buyerPerformance,
    staleTime: STALE.controlTower,
  });
}

export function useShipmentTrackingOps() {
  return useQuery({
    queryKey: ctKeys.shipmentTracking(),
    queryFn: controlTowerApi.shipmentTracking,
    staleTime: STALE.controlTower,
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => controlTowerApi.resolveAlert(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ctKeys.all });
    },
  });
}

/** Invalidate control-tower queries on admin socket events (debounced). */
export function useControlTowerRealtime() {
  const qc = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const invalidate = useMemo(
    () => () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void qc.invalidateQueries({ queryKey: ctKeys.all });
      }, 300);
    },
    [qc],
  );

  useEffect(() => {
    const s = getSocket();
    s.on(SocketEvents.CONTROL_TOWER_ALERT_CREATED, invalidate);
    s.on(SocketEvents.CONTROL_TOWER_ALERT_RESOLVED, invalidate);
    s.on(SocketEvents.CONTROL_TOWER_METRIC_UPDATED, invalidate);
    return () => {
      clearTimeout(timerRef.current);
      s.off(SocketEvents.CONTROL_TOWER_ALERT_CREATED, invalidate);
      s.off(SocketEvents.CONTROL_TOWER_ALERT_RESOLVED, invalidate);
      s.off(SocketEvents.CONTROL_TOWER_METRIC_UPDATED, invalidate);
    };
  }, [invalidate]);
}

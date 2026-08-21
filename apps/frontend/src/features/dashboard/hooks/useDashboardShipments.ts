import { useQuery } from "@tanstack/react-query";
import type { ShipmentPortfolioRow } from "@dmx/contracts/shipment-portfolio";
import { shipmentPortfolioApi } from "@/features/shipment/lib/shipment-portfolio.api";

/**
 * Milestones a customer would describe as "in transit". Counting on the same
 * field the shipment lists render keeps the hero counter and the lists from
 * ever disagreeing.
 */
const TRANSIT_MILESTONES = new Set<string>(["Vessel Departure", "In Transit", "Transshipment"]);

const CLOSED_STATUSES = new Set<string>(["Delivered", "Cancelled"]);

export interface DashboardShipments {
  all: ShipmentPortfolioRow[];
  active: ShipmentPortfolioRow[];
  inTransitCount: number;
  isLoading: boolean;
}

/**
 * Single portfolio query shared by every dashboard shipment surface — hero
 * counters, KPI tiles and the shipment lists all read from this one result.
 */
export function useDashboardShipments(): DashboardShipments {
  const { data, isLoading } = useQuery({
    queryKey: ["shipment-portfolio", "dashboard"],
    queryFn: () => shipmentPortfolioApi.getPortfolio({ limit: 25, offset: 0 }),
    staleTime: 30_000,
  });

  const all = data?.items ?? [];
  const active = all.filter((s) => !CLOSED_STATUSES.has(s.status));
  const inTransitCount = active.filter((s) => TRANSIT_MILESTONES.has(s.currentMilestone)).length;

  return { all, active, inTransitCount, isLoading };
}

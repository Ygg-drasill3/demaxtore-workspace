// =============================================================================
// Sprint 30-04 — Shipment Milestones (planning / ETA / delay; not a logistics FSM)
// =============================================================================

export const SHIPMENT_MILESTONE_TYPES = [
  "BOOKING",
  "CONTAINER_READY",
  "CARGO_PICKUP",
  "PORT_GATE_IN",
  "EXPORT_CUSTOMS",
  "LOADED_ON_VESSEL",
  "DEPARTURE",
  "TRANSSHIPMENT",
  "ARRIVAL",
  "IMPORT_CUSTOMS",
  "DELIVERY",
  "COMPLETED",
] as const;
export type ShipmentMilestoneType = (typeof SHIPMENT_MILESTONE_TYPES)[number];

export const SHIPMENT_MILESTONE_TYPE_LABELS: Record<ShipmentMilestoneType, string> = {
  BOOKING: "Booking",
  CONTAINER_READY: "Container Ready",
  CARGO_PICKUP: "Cargo Pickup",
  PORT_GATE_IN: "Port Gate-In",
  EXPORT_CUSTOMS: "Export Customs",
  LOADED_ON_VESSEL: "Loaded on Vessel",
  DEPARTURE: "Departure",
  TRANSSHIPMENT: "Transshipment",
  ARRIVAL: "Arrival",
  IMPORT_CUSTOMS: "Import Customs",
  DELIVERY: "Delivery",
  COMPLETED: "Completed",
};

export const SHIPMENT_MILESTONE_STATUSES = [
  "PENDING",
  "ACTIVE",
  "COMPLETED",
  "SKIPPED",
] as const;
export type ShipmentMilestonePlanStatus = (typeof SHIPMENT_MILESTONE_STATUSES)[number];

export const SHIPMENT_MILESTONE_RISKS = ["ON_TRACK", "AT_RISK", "DELAYED"] as const;
export type ShipmentMilestoneRisk = (typeof SHIPMENT_MILESTONE_RISKS)[number];

/** Global risk thresholds (minutes). Configurable; not per-shipment. */
export const SHIPMENT_MILESTONE_RISK_THRESHOLDS = {
  atRiskMinutes: 1,
  delayedMinutes: 24 * 60,
} as const;

export interface ShipmentMilestonePermissions {
  canView: boolean;
  canUpdate: boolean;
  canManage: boolean;
  canComplete: boolean;
}

export interface ShipmentMilestoneDto {
  id: string;
  shipmentId: string;
  type: ShipmentMilestoneType;
  label: string;
  plannedAt: string | null;
  estimatedAt: string | null;
  actualAt: string | null;
  /** Effective ETA: actual → estimated → planned */
  effectiveAt: string | null;
  status: ShipmentMilestonePlanStatus;
  delayMinutes: number | null;
  risk: ShipmentMilestoneRisk;
  sequence: number;
  permissions: ShipmentMilestonePermissions;
  createdAt: string;
  updatedAt: string;
  /** Legacy aliases for SPR-30-01 UI compatibility */
  key: string;
  planned: string | null;
  actual: string | null;
}

export interface ShipmentMilestoneSummaryDto {
  current: ShipmentMilestoneDto | null;
  progressCompleted: number;
  progressTotal: number;
  overallRisk: ShipmentMilestoneRisk;
  overallDelayMinutes: number | null;
  eta: string | null;
}

export interface ShipmentMilestonesResponse {
  shipmentId: string;
  items: ShipmentMilestoneDto[];
  summary: ShipmentMilestoneSummaryDto;
}

export interface DelayedShipmentDto {
  shipmentId: string;
  orderRef: string;
  destination: string;
  currentMilestone: string | null;
  delayMinutes: number;
  risk: ShipmentMilestoneRisk;
  eta: string | null;
}

export interface UpcomingMilestoneDto {
  shipmentId: string;
  orderRef: string;
  milestoneId: string;
  type: ShipmentMilestoneType;
  label: string;
  effectiveAt: string;
  risk: ShipmentMilestoneRisk;
}

export const DEFAULT_SHIPMENT_MILESTONE_PLAN: ReadonlyArray<{
  type: ShipmentMilestoneType;
  sequence: number;
  skipByDefault?: boolean;
}> = [
  { type: "BOOKING", sequence: 10 },
  { type: "CONTAINER_READY", sequence: 20 },
  { type: "CARGO_PICKUP", sequence: 30 },
  { type: "PORT_GATE_IN", sequence: 40 },
  { type: "EXPORT_CUSTOMS", sequence: 50 },
  { type: "LOADED_ON_VESSEL", sequence: 60 },
  { type: "DEPARTURE", sequence: 70 },
  { type: "TRANSSHIPMENT", sequence: 80, skipByDefault: true },
  { type: "ARRIVAL", sequence: 90 },
  { type: "IMPORT_CUSTOMS", sequence: 100 },
  { type: "DELIVERY", sequence: 110 },
  { type: "COMPLETED", sequence: 120 },
];

export function computeMilestoneDelayMinutes(input: {
  plannedAt: Date | string | null | undefined;
  estimatedAt?: Date | string | null | undefined;
  actualAt?: Date | string | null | undefined;
}): number | null {
  if (!input.plannedAt) return null;
  const planned = new Date(input.plannedAt).getTime();
  const compareSrc = input.actualAt ?? input.estimatedAt;
  if (!compareSrc) return null;
  const compare = new Date(compareSrc).getTime();
  if (Number.isNaN(planned) || Number.isNaN(compare)) return null;
  return Math.round((compare - planned) / 60_000);
}

export function computeMilestoneRisk(
  delayMinutes: number | null,
  thresholds = SHIPMENT_MILESTONE_RISK_THRESHOLDS,
): ShipmentMilestoneRisk {
  if (delayMinutes == null || delayMinutes < thresholds.atRiskMinutes) return "ON_TRACK";
  if (delayMinutes >= thresholds.delayedMinutes) return "DELAYED";
  return "AT_RISK";
}

export function effectiveMilestoneAt(input: {
  plannedAt?: string | null;
  estimatedAt?: string | null;
  actualAt?: string | null;
}): string | null {
  return input.actualAt ?? input.estimatedAt ?? input.plannedAt ?? null;
}

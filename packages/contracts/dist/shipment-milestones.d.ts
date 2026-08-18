export declare const SHIPMENT_MILESTONE_TYPES: readonly ["BOOKING", "CONTAINER_READY", "CARGO_PICKUP", "PORT_GATE_IN", "EXPORT_CUSTOMS", "LOADED_ON_VESSEL", "DEPARTURE", "TRANSSHIPMENT", "ARRIVAL", "IMPORT_CUSTOMS", "DELIVERY", "COMPLETED"];
export type ShipmentMilestoneType = (typeof SHIPMENT_MILESTONE_TYPES)[number];
export declare const SHIPMENT_MILESTONE_TYPE_LABELS: Record<ShipmentMilestoneType, string>;
export declare const SHIPMENT_MILESTONE_STATUSES: readonly ["PENDING", "ACTIVE", "COMPLETED", "SKIPPED"];
export type ShipmentMilestonePlanStatus = (typeof SHIPMENT_MILESTONE_STATUSES)[number];
export declare const SHIPMENT_MILESTONE_RISKS: readonly ["ON_TRACK", "AT_RISK", "DELAYED"];
export type ShipmentMilestoneRisk = (typeof SHIPMENT_MILESTONE_RISKS)[number];
/** Global risk thresholds (minutes). Configurable; not per-shipment. */
export declare const SHIPMENT_MILESTONE_RISK_THRESHOLDS: {
    readonly atRiskMinutes: 1;
    readonly delayedMinutes: number;
};
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
export declare const DEFAULT_SHIPMENT_MILESTONE_PLAN: ReadonlyArray<{
    type: ShipmentMilestoneType;
    sequence: number;
    skipByDefault?: boolean;
}>;
export declare function computeMilestoneDelayMinutes(input: {
    plannedAt: Date | string | null | undefined;
    estimatedAt?: Date | string | null | undefined;
    actualAt?: Date | string | null | undefined;
}): number | null;
export declare function computeMilestoneRisk(delayMinutes: number | null, thresholds?: {
    readonly atRiskMinutes: 1;
    readonly delayedMinutes: number;
}): ShipmentMilestoneRisk;
export declare function effectiveMilestoneAt(input: {
    plannedAt?: string | null;
    estimatedAt?: string | null;
    actualAt?: string | null;
}): string | null;

export type ControlTowerPriority = "Critical" | "High" | "Medium" | "Low";
export type ControlTowerAttentionKind = "Inspection Pending" | "Booking Pending" | "Document Missing" | "ETA Delay" | "Exception Open" | "Production Delay" | "Cut-Off Risk";
export type ControlTowerRiskKind = "ETA Delay Risk" | "Missing Documents" | "Inspection Overdue" | "Booking Cut-Off Risk" | "Production Delay" | "Forecast Change" | "Shipment Delay";
export interface ImportControlTowerKpis {
    activeTrades: number;
    inProduction: number;
    atSea: number;
    deliveredThisMonth: number;
    delayedTrades: number;
    pendingInspections: number;
    missingDocuments: number;
    criticalExceptions: number;
}
export interface TradePipelineStage {
    key: string;
    label: string;
    count: number;
}
export interface AttentionRequiredItem {
    id: string;
    kind: ControlTowerAttentionKind;
    priority: ControlTowerPriority;
    title: string;
    description: string;
    tradeId: string;
    tradeRef: string;
    workspaceUrl: string;
    dueAt: string | null;
}
export interface LiveActivityItem {
    id: string;
    title: string;
    eventType: string;
    sourceModule: string;
    severity: string;
    tradeId: string;
    tradeRef: string;
    occurredAt: string;
    workspaceUrl: string;
}
export interface UpcomingMilestoneItem {
    id: string;
    label: string;
    tradeId: string;
    tradeRef: string;
    at: string;
    responsibleParty: string | null;
    workspaceUrl: string;
}
export interface CarrierDistributionItem {
    carrier: string;
    count: number;
}
export interface ShipmentVisibilitySummary {
    containersAtSea: number;
    averageEtaDays: number | null;
    arrivalsThisWeek: number;
    delayedShipments: number;
    onTimeShipments: number;
    carrierDistribution: CarrierDistributionItem[];
}
export interface OperationalRiskItem {
    id: string;
    kind: ControlTowerRiskKind;
    severity: ControlTowerPriority;
    title: string;
    tradeId: string;
    tradeRef: string;
    workspaceUrl: string;
}
export interface ImportControlTowerQuery {
    scope?: "all" | "mine";
    country?: string;
    supplier?: string;
    carrier?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    q?: string;
}
export interface ImportControlTowerDashboard {
    kpis: ImportControlTowerKpis;
    pipeline: TradePipelineStage[];
    attentionRequired: AttentionRequiredItem[];
    activityFeed: LiveActivityItem[];
    upcomingMilestones: UpcomingMilestoneItem[];
    shipmentVisibility: ShipmentVisibilitySummary;
    operationalRisks: OperationalRiskItem[];
    refreshedAt: string;
}

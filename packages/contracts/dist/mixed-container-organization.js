import { z } from "zod";
export const ORGANIZATION_STATUSES = [
    "ORGANIZATION_STARTED",
    "SUPPLIER_CONFIRMATION",
    "PROFORMA_INVOICES_PENDING",
    "PROFORMA_INVOICES_COMPLETED",
    "PRODUCTION",
    "READY_FOR_SHIPMENT",
    "SHIPMENT_BOOKED",
    "IN_TRANSIT",
    "DELIVERED",
    "COMPLETED",
];
export const ORGANIZATION_STATUS_LABELS = {
    ORGANIZATION_STARTED: "Organization Started",
    SUPPLIER_CONFIRMATION: "Supplier Confirmation",
    PROFORMA_INVOICES_PENDING: "Proforma Invoices Pending",
    PROFORMA_INVOICES_COMPLETED: "Proforma Invoices Completed",
    PRODUCTION: "Production",
    READY_FOR_SHIPMENT: "Ready for Shipment",
    SHIPMENT_BOOKED: "Shipment Booked",
    IN_TRANSIT: "In Transit",
    DELIVERED: "Delivered",
    COMPLETED: "Completed",
};
export const ORGANIZATION_PROGRESS_STEPS = ORGANIZATION_STATUSES.map((key) => ({ key, label: ORGANIZATION_STATUS_LABELS[key] }));
const STATUS_ORDER = Object.fromEntries(ORGANIZATION_STATUSES.map((s, i) => [s, i]));
export function organizationStatusIndex(status) {
    return STATUS_ORDER[status] ?? 0;
}
export function isOrganizationStepComplete(step, current) {
    return organizationStatusIndex(current) >= organizationStatusIndex(step);
}
export const ORGANIZATION_ACTIVITY_LABELS = {
    "mixed_container.organization_created": "Organization created",
    "mixed_container.organization_manager_assigned": "Operations manager assigned",
    "mixed_container.organization_status_updated": "Organization status updated",
    "mixed_container.organization_started": "Organization started",
    "mixed_container.supplier_confirmed": "Supplier confirmed",
    "mixed_container.proforma_uploaded": "Proforma invoice uploaded",
    "mixed_container.inspection_scheduled": "Inspection scheduled",
    "mixed_container.shipment_booked": "Shipment booked",
    "mixed_container.container_loaded": "Container loaded",
    "mixed_container.vessel_departed": "Vessel departed",
    "mixed_container.delivered": "Delivered",
    "smartcontainer.order_spawned": "Execution orders spawned",
    "smartcontainer.freight_started": "Freight started",
    "smartcontainer.shipment_started": "Shipment started",
    "smartcontainer.execution_completed": "Execution completed",
};
export const ORGANIZATION_MODULE_KEYS = [
    "PURCHASE_ORDERS",
    "PROFORMA_INVOICES",
    "FREIGHTIQ",
    "DOCUMENTS_HUB",
    "INSPECTION",
    "SHIPMENT_TRACKING",
];
export const UpdateOrganizationStatusInput = z.object({
    status: z.enum(ORGANIZATION_STATUSES),
    note: z.string().max(2000).optional(),
});
export const AssignOperationsManagerInput = z.object({
    managerId: z.string().uuid(),
});
export const McOrganizationStatusHistoryDTO = z.object({
    id: z.string().uuid(),
    fromStatus: z.string().nullable(),
    toStatus: z.string(),
    actorUserId: z.string().uuid().nullable(),
    actorName: z.string().nullable(),
    note: z.string().nullable(),
    createdAt: z.string().datetime(),
});
export const McOrganizationModuleStatusDTO = z.object({
    key: z.enum(ORGANIZATION_MODULE_KEYS),
    label: z.string(),
    status: z.string(),
    lastUpdate: z.string().datetime().nullable(),
    lastActivity: z.string().datetime().nullable().optional(),
    responsibleTeam: z.string(),
    workspaceUrl: z.string().nullable(),
    workspaceId: z.string().uuid().nullable(),
});
export const McOrganizationActivityDTO = z.object({
    id: z.string().uuid(),
    eventType: z.string(),
    label: z.string(),
    actorUserId: z.string().uuid().nullable(),
    actorName: z.string().nullable(),
    payload: z.record(z.unknown()),
    sourceModule: z.string(),
    createdAt: z.string().datetime(),
});
export const McOrganizationTaskDTO = z.object({
    id: z.string(),
    title: z.string(),
    moduleKey: z.enum(ORGANIZATION_MODULE_KEYS).nullable(),
    priority: z.enum(["HIGH", "NORMAL", "LOW"]),
    status: z.enum(["OPEN", "COMPLETED"]),
});
export const McOrganizationMilestoneDTO = z.object({
    key: z.string(),
    label: z.string(),
    targetDate: z.string().datetime().nullable(),
    completed: z.boolean(),
});
export const McOrganizationWorkspaceDTO = z.object({
    workspaceId: z.string().uuid(),
    organizationRef: z.string(),
    procurementRequestRef: z.string().nullable(),
    commercialProposalRef: z.string().nullable(),
    buyerName: z.string(),
    buyerOrgName: z.string().nullable(),
    destinationCountry: z.string().nullable(),
    destinationPort: z.string().nullable(),
    assignedOperationsManagerId: z.string().uuid().nullable(),
    assignedOperationsManagerName: z.string().nullable(),
    organizationStatus: z.enum(ORGANIZATION_STATUSES),
    workspaceState: z.string(),
    createdAt: z.string().datetime(),
    organizationStartedAt: z.string().datetime().nullable(),
    executionProgressPercent: z.number().int(),
    synchronizationStatus: z.string().optional(),
    lastSyncedAt: z.string().datetime().nullable().optional(),
    modules: z.array(McOrganizationModuleStatusDTO),
    statusHistory: z.array(McOrganizationStatusHistoryDTO),
    activityTimeline: z.array(McOrganizationActivityDTO),
    outstandingTasks: z.array(McOrganizationTaskDTO),
    upcomingMilestones: z.array(McOrganizationMilestoneDTO),
    responsibleTeams: z.array(z.object({ team: z.string(), role: z.string() })),
    internalNotes: z.array(z.object({
        id: z.string().uuid(),
        authorName: z.string(),
        body: z.string(),
        createdAt: z.string().datetime(),
    })).optional(),
});
export function buyerOrganizationLink(workspaceId) {
    return `/buyer/mixed-container/organization/${workspaceId}`;
}
export function adminOrganizationLink(workspaceId) {
    return `/admin/mixed-container/organization/${workspaceId}`;
}

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
] as const;

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export const ORGANIZATION_STATUS_LABELS: Record<OrganizationStatus, string> = {
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

export const ORGANIZATION_PROGRESS_STEPS: Array<{ key: OrganizationStatus; label: string }> =
  ORGANIZATION_STATUSES.map((key) => ({ key, label: ORGANIZATION_STATUS_LABELS[key] }));

const STATUS_ORDER: Record<OrganizationStatus, number> = Object.fromEntries(
  ORGANIZATION_STATUSES.map((s, i) => [s, i]),
) as Record<OrganizationStatus, number>;

export function organizationStatusIndex(status: OrganizationStatus): number {
  return STATUS_ORDER[status] ?? 0;
}

export function isOrganizationStepComplete(step: OrganizationStatus, current: OrganizationStatus): boolean {
  return organizationStatusIndex(current) >= organizationStatusIndex(step);
}

export const ORGANIZATION_ACTIVITY_LABELS: Record<string, string> = {
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
] as const;

export type OrganizationModuleKey = (typeof ORGANIZATION_MODULE_KEYS)[number];

export const UpdateOrganizationStatusInput = z.object({
  status: z.enum(ORGANIZATION_STATUSES),
  note: z.string().max(2000).optional(),
});
export type UpdateOrganizationStatusInput = z.infer<typeof UpdateOrganizationStatusInput>;

export const AssignOperationsManagerInput = z.object({
  managerId: z.string().uuid(),
});
export type AssignOperationsManagerInput = z.infer<typeof AssignOperationsManagerInput>;

export const McOrganizationStatusHistoryDTO = z.object({
  id: z.string().uuid(),
  fromStatus: z.string().nullable(),
  toStatus: z.string(),
  actorUserId: z.string().uuid().nullable(),
  actorName: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type McOrganizationStatusHistoryDTO = z.infer<typeof McOrganizationStatusHistoryDTO>;

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
export type McOrganizationModuleStatusDTO = z.infer<typeof McOrganizationModuleStatusDTO>;

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
export type McOrganizationActivityDTO = z.infer<typeof McOrganizationActivityDTO>;

export const McOrganizationTaskDTO = z.object({
  id: z.string(),
  title: z.string(),
  moduleKey: z.enum(ORGANIZATION_MODULE_KEYS).nullable(),
  priority: z.enum(["HIGH", "NORMAL", "LOW"]),
  status: z.enum(["OPEN", "COMPLETED"]),
});
export type McOrganizationTaskDTO = z.infer<typeof McOrganizationTaskDTO>;

export const McOrganizationMilestoneDTO = z.object({
  key: z.string(),
  label: z.string(),
  targetDate: z.string().datetime().nullable(),
  completed: z.boolean(),
});
export type McOrganizationMilestoneDTO = z.infer<typeof McOrganizationMilestoneDTO>;

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
  internalNotes: z.array(
    z.object({
      id: z.string().uuid(),
      authorName: z.string(),
      body: z.string(),
      createdAt: z.string().datetime(),
    }),
  ).optional(),
});
export type McOrganizationWorkspaceDTO = z.infer<typeof McOrganizationWorkspaceDTO>;

export function buyerOrganizationLink(workspaceId: string): string {
  return `/buyer/mixed-container/organization/${workspaceId}`;
}

export function adminOrganizationLink(workspaceId: string): string {
  return `/admin/mixed-container/organization/${workspaceId}`;
}

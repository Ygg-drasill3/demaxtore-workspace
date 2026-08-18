import { z } from "zod";
export declare const ORGANIZATION_STATUSES: readonly ["ORGANIZATION_STARTED", "SUPPLIER_CONFIRMATION", "PROFORMA_INVOICES_PENDING", "PROFORMA_INVOICES_COMPLETED", "PRODUCTION", "READY_FOR_SHIPMENT", "SHIPMENT_BOOKED", "IN_TRANSIT", "DELIVERED", "COMPLETED"];
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];
export declare const ORGANIZATION_STATUS_LABELS: Record<OrganizationStatus, string>;
export declare const ORGANIZATION_PROGRESS_STEPS: Array<{
    key: OrganizationStatus;
    label: string;
}>;
export declare function organizationStatusIndex(status: OrganizationStatus): number;
export declare function isOrganizationStepComplete(step: OrganizationStatus, current: OrganizationStatus): boolean;
export declare const ORGANIZATION_ACTIVITY_LABELS: Record<string, string>;
export declare const ORGANIZATION_MODULE_KEYS: readonly ["PURCHASE_ORDERS", "PROFORMA_INVOICES", "FREIGHTIQ", "DOCUMENTS_HUB", "INSPECTION", "SHIPMENT_TRACKING"];
export type OrganizationModuleKey = (typeof ORGANIZATION_MODULE_KEYS)[number];
export declare const UpdateOrganizationStatusInput: z.ZodObject<{
    status: z.ZodEnum<["ORGANIZATION_STARTED", "SUPPLIER_CONFIRMATION", "PROFORMA_INVOICES_PENDING", "PROFORMA_INVOICES_COMPLETED", "PRODUCTION", "READY_FOR_SHIPMENT", "SHIPMENT_BOOKED", "IN_TRANSIT", "DELIVERED", "COMPLETED"]>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "SHIPMENT_BOOKED" | "DELIVERED" | "READY_FOR_SHIPMENT" | "IN_TRANSIT" | "COMPLETED" | "PRODUCTION" | "ORGANIZATION_STARTED" | "SUPPLIER_CONFIRMATION" | "PROFORMA_INVOICES_PENDING" | "PROFORMA_INVOICES_COMPLETED";
    note?: string | undefined;
}, {
    status: "SHIPMENT_BOOKED" | "DELIVERED" | "READY_FOR_SHIPMENT" | "IN_TRANSIT" | "COMPLETED" | "PRODUCTION" | "ORGANIZATION_STARTED" | "SUPPLIER_CONFIRMATION" | "PROFORMA_INVOICES_PENDING" | "PROFORMA_INVOICES_COMPLETED";
    note?: string | undefined;
}>;
export type UpdateOrganizationStatusInput = z.infer<typeof UpdateOrganizationStatusInput>;
export declare const AssignOperationsManagerInput: z.ZodObject<{
    managerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    managerId: string;
}, {
    managerId: string;
}>;
export type AssignOperationsManagerInput = z.infer<typeof AssignOperationsManagerInput>;
export declare const McOrganizationStatusHistoryDTO: z.ZodObject<{
    id: z.ZodString;
    fromStatus: z.ZodNullable<z.ZodString>;
    toStatus: z.ZodString;
    actorUserId: z.ZodNullable<z.ZodString>;
    actorName: z.ZodNullable<z.ZodString>;
    note: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    note: string | null;
    toStatus: string;
    fromStatus: string | null;
    actorUserId: string | null;
    actorName: string | null;
}, {
    id: string;
    createdAt: string;
    note: string | null;
    toStatus: string;
    fromStatus: string | null;
    actorUserId: string | null;
    actorName: string | null;
}>;
export type McOrganizationStatusHistoryDTO = z.infer<typeof McOrganizationStatusHistoryDTO>;
export declare const McOrganizationModuleStatusDTO: z.ZodObject<{
    key: z.ZodEnum<["PURCHASE_ORDERS", "PROFORMA_INVOICES", "FREIGHTIQ", "DOCUMENTS_HUB", "INSPECTION", "SHIPMENT_TRACKING"]>;
    label: z.ZodString;
    status: z.ZodString;
    lastUpdate: z.ZodNullable<z.ZodString>;
    lastActivity: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    responsibleTeam: z.ZodString;
    workspaceUrl: z.ZodNullable<z.ZodString>;
    workspaceId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: string;
    key: "INSPECTION" | "FREIGHTIQ" | "PURCHASE_ORDERS" | "PROFORMA_INVOICES" | "DOCUMENTS_HUB" | "SHIPMENT_TRACKING";
    label: string;
    workspaceId: string | null;
    lastUpdate: string | null;
    responsibleTeam: string;
    workspaceUrl: string | null;
    lastActivity?: string | null | undefined;
}, {
    status: string;
    key: "INSPECTION" | "FREIGHTIQ" | "PURCHASE_ORDERS" | "PROFORMA_INVOICES" | "DOCUMENTS_HUB" | "SHIPMENT_TRACKING";
    label: string;
    workspaceId: string | null;
    lastUpdate: string | null;
    responsibleTeam: string;
    workspaceUrl: string | null;
    lastActivity?: string | null | undefined;
}>;
export type McOrganizationModuleStatusDTO = z.infer<typeof McOrganizationModuleStatusDTO>;
export declare const McOrganizationActivityDTO: z.ZodObject<{
    id: z.ZodString;
    eventType: z.ZodString;
    label: z.ZodString;
    actorUserId: z.ZodNullable<z.ZodString>;
    actorName: z.ZodNullable<z.ZodString>;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    sourceModule: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    label: string;
    payload: Record<string, unknown>;
    eventType: string;
    actorUserId: string | null;
    actorName: string | null;
    sourceModule: string;
}, {
    id: string;
    createdAt: string;
    label: string;
    payload: Record<string, unknown>;
    eventType: string;
    actorUserId: string | null;
    actorName: string | null;
    sourceModule: string;
}>;
export type McOrganizationActivityDTO = z.infer<typeof McOrganizationActivityDTO>;
export declare const McOrganizationTaskDTO: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    moduleKey: z.ZodNullable<z.ZodEnum<["PURCHASE_ORDERS", "PROFORMA_INVOICES", "FREIGHTIQ", "DOCUMENTS_HUB", "INSPECTION", "SHIPMENT_TRACKING"]>>;
    priority: z.ZodEnum<["HIGH", "NORMAL", "LOW"]>;
    status: z.ZodEnum<["OPEN", "COMPLETED"]>;
}, "strip", z.ZodTypeAny, {
    status: "OPEN" | "COMPLETED";
    id: string;
    title: string;
    priority: "LOW" | "HIGH" | "NORMAL";
    moduleKey: "INSPECTION" | "FREIGHTIQ" | "PURCHASE_ORDERS" | "PROFORMA_INVOICES" | "DOCUMENTS_HUB" | "SHIPMENT_TRACKING" | null;
}, {
    status: "OPEN" | "COMPLETED";
    id: string;
    title: string;
    priority: "LOW" | "HIGH" | "NORMAL";
    moduleKey: "INSPECTION" | "FREIGHTIQ" | "PURCHASE_ORDERS" | "PROFORMA_INVOICES" | "DOCUMENTS_HUB" | "SHIPMENT_TRACKING" | null;
}>;
export type McOrganizationTaskDTO = z.infer<typeof McOrganizationTaskDTO>;
export declare const McOrganizationMilestoneDTO: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    targetDate: z.ZodNullable<z.ZodString>;
    completed: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    key: string;
    label: string;
    completed: boolean;
    targetDate: string | null;
}, {
    key: string;
    label: string;
    completed: boolean;
    targetDate: string | null;
}>;
export type McOrganizationMilestoneDTO = z.infer<typeof McOrganizationMilestoneDTO>;
export declare const McOrganizationWorkspaceDTO: z.ZodObject<{
    workspaceId: z.ZodString;
    organizationRef: z.ZodString;
    procurementRequestRef: z.ZodNullable<z.ZodString>;
    commercialProposalRef: z.ZodNullable<z.ZodString>;
    buyerName: z.ZodString;
    buyerOrgName: z.ZodNullable<z.ZodString>;
    destinationCountry: z.ZodNullable<z.ZodString>;
    destinationPort: z.ZodNullable<z.ZodString>;
    assignedOperationsManagerId: z.ZodNullable<z.ZodString>;
    assignedOperationsManagerName: z.ZodNullable<z.ZodString>;
    organizationStatus: z.ZodEnum<["ORGANIZATION_STARTED", "SUPPLIER_CONFIRMATION", "PROFORMA_INVOICES_PENDING", "PROFORMA_INVOICES_COMPLETED", "PRODUCTION", "READY_FOR_SHIPMENT", "SHIPMENT_BOOKED", "IN_TRANSIT", "DELIVERED", "COMPLETED"]>;
    workspaceState: z.ZodString;
    createdAt: z.ZodString;
    organizationStartedAt: z.ZodNullable<z.ZodString>;
    executionProgressPercent: z.ZodNumber;
    synchronizationStatus: z.ZodOptional<z.ZodString>;
    lastSyncedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    modules: z.ZodArray<z.ZodObject<{
        key: z.ZodEnum<["PURCHASE_ORDERS", "PROFORMA_INVOICES", "FREIGHTIQ", "DOCUMENTS_HUB", "INSPECTION", "SHIPMENT_TRACKING"]>;
        label: z.ZodString;
        status: z.ZodString;
        lastUpdate: z.ZodNullable<z.ZodString>;
        lastActivity: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responsibleTeam: z.ZodString;
        workspaceUrl: z.ZodNullable<z.ZodString>;
        workspaceId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: string;
        key: "INSPECTION" | "FREIGHTIQ" | "PURCHASE_ORDERS" | "PROFORMA_INVOICES" | "DOCUMENTS_HUB" | "SHIPMENT_TRACKING";
        label: string;
        workspaceId: string | null;
        lastUpdate: string | null;
        responsibleTeam: string;
        workspaceUrl: string | null;
        lastActivity?: string | null | undefined;
    }, {
        status: string;
        key: "INSPECTION" | "FREIGHTIQ" | "PURCHASE_ORDERS" | "PROFORMA_INVOICES" | "DOCUMENTS_HUB" | "SHIPMENT_TRACKING";
        label: string;
        workspaceId: string | null;
        lastUpdate: string | null;
        responsibleTeam: string;
        workspaceUrl: string | null;
        lastActivity?: string | null | undefined;
    }>, "many">;
    statusHistory: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        fromStatus: z.ZodNullable<z.ZodString>;
        toStatus: z.ZodString;
        actorUserId: z.ZodNullable<z.ZodString>;
        actorName: z.ZodNullable<z.ZodString>;
        note: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        note: string | null;
        toStatus: string;
        fromStatus: string | null;
        actorUserId: string | null;
        actorName: string | null;
    }, {
        id: string;
        createdAt: string;
        note: string | null;
        toStatus: string;
        fromStatus: string | null;
        actorUserId: string | null;
        actorName: string | null;
    }>, "many">;
    activityTimeline: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        eventType: z.ZodString;
        label: z.ZodString;
        actorUserId: z.ZodNullable<z.ZodString>;
        actorName: z.ZodNullable<z.ZodString>;
        payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        sourceModule: z.ZodString;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        label: string;
        payload: Record<string, unknown>;
        eventType: string;
        actorUserId: string | null;
        actorName: string | null;
        sourceModule: string;
    }, {
        id: string;
        createdAt: string;
        label: string;
        payload: Record<string, unknown>;
        eventType: string;
        actorUserId: string | null;
        actorName: string | null;
        sourceModule: string;
    }>, "many">;
    outstandingTasks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        moduleKey: z.ZodNullable<z.ZodEnum<["PURCHASE_ORDERS", "PROFORMA_INVOICES", "FREIGHTIQ", "DOCUMENTS_HUB", "INSPECTION", "SHIPMENT_TRACKING"]>>;
        priority: z.ZodEnum<["HIGH", "NORMAL", "LOW"]>;
        status: z.ZodEnum<["OPEN", "COMPLETED"]>;
    }, "strip", z.ZodTypeAny, {
        status: "OPEN" | "COMPLETED";
        id: string;
        title: string;
        priority: "LOW" | "HIGH" | "NORMAL";
        moduleKey: "INSPECTION" | "FREIGHTIQ" | "PURCHASE_ORDERS" | "PROFORMA_INVOICES" | "DOCUMENTS_HUB" | "SHIPMENT_TRACKING" | null;
    }, {
        status: "OPEN" | "COMPLETED";
        id: string;
        title: string;
        priority: "LOW" | "HIGH" | "NORMAL";
        moduleKey: "INSPECTION" | "FREIGHTIQ" | "PURCHASE_ORDERS" | "PROFORMA_INVOICES" | "DOCUMENTS_HUB" | "SHIPMENT_TRACKING" | null;
    }>, "many">;
    upcomingMilestones: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        targetDate: z.ZodNullable<z.ZodString>;
        completed: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        key: string;
        label: string;
        completed: boolean;
        targetDate: string | null;
    }, {
        key: string;
        label: string;
        completed: boolean;
        targetDate: string | null;
    }>, "many">;
    responsibleTeams: z.ZodArray<z.ZodObject<{
        team: z.ZodString;
        role: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: string;
        team: string;
    }, {
        role: string;
        team: string;
    }>, "many">;
    internalNotes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        authorName: z.ZodString;
        body: z.ZodString;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        body: string;
        authorName: string;
    }, {
        id: string;
        createdAt: string;
        body: string;
        authorName: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    workspaceId: string;
    buyerName: string;
    buyerOrgName: string | null;
    destinationPort: string | null;
    destinationCountry: string | null;
    organizationRef: string;
    procurementRequestRef: string | null;
    commercialProposalRef: string | null;
    assignedOperationsManagerId: string | null;
    assignedOperationsManagerName: string | null;
    organizationStatus: "SHIPMENT_BOOKED" | "DELIVERED" | "READY_FOR_SHIPMENT" | "IN_TRANSIT" | "COMPLETED" | "PRODUCTION" | "ORGANIZATION_STARTED" | "SUPPLIER_CONFIRMATION" | "PROFORMA_INVOICES_PENDING" | "PROFORMA_INVOICES_COMPLETED";
    workspaceState: string;
    organizationStartedAt: string | null;
    executionProgressPercent: number;
    modules: {
        status: string;
        key: "INSPECTION" | "FREIGHTIQ" | "PURCHASE_ORDERS" | "PROFORMA_INVOICES" | "DOCUMENTS_HUB" | "SHIPMENT_TRACKING";
        label: string;
        workspaceId: string | null;
        lastUpdate: string | null;
        responsibleTeam: string;
        workspaceUrl: string | null;
        lastActivity?: string | null | undefined;
    }[];
    statusHistory: {
        id: string;
        createdAt: string;
        note: string | null;
        toStatus: string;
        fromStatus: string | null;
        actorUserId: string | null;
        actorName: string | null;
    }[];
    activityTimeline: {
        id: string;
        createdAt: string;
        label: string;
        payload: Record<string, unknown>;
        eventType: string;
        actorUserId: string | null;
        actorName: string | null;
        sourceModule: string;
    }[];
    outstandingTasks: {
        status: "OPEN" | "COMPLETED";
        id: string;
        title: string;
        priority: "LOW" | "HIGH" | "NORMAL";
        moduleKey: "INSPECTION" | "FREIGHTIQ" | "PURCHASE_ORDERS" | "PROFORMA_INVOICES" | "DOCUMENTS_HUB" | "SHIPMENT_TRACKING" | null;
    }[];
    upcomingMilestones: {
        key: string;
        label: string;
        completed: boolean;
        targetDate: string | null;
    }[];
    responsibleTeams: {
        role: string;
        team: string;
    }[];
    synchronizationStatus?: string | undefined;
    lastSyncedAt?: string | null | undefined;
    internalNotes?: {
        id: string;
        createdAt: string;
        body: string;
        authorName: string;
    }[] | undefined;
}, {
    createdAt: string;
    workspaceId: string;
    buyerName: string;
    buyerOrgName: string | null;
    destinationPort: string | null;
    destinationCountry: string | null;
    organizationRef: string;
    procurementRequestRef: string | null;
    commercialProposalRef: string | null;
    assignedOperationsManagerId: string | null;
    assignedOperationsManagerName: string | null;
    organizationStatus: "SHIPMENT_BOOKED" | "DELIVERED" | "READY_FOR_SHIPMENT" | "IN_TRANSIT" | "COMPLETED" | "PRODUCTION" | "ORGANIZATION_STARTED" | "SUPPLIER_CONFIRMATION" | "PROFORMA_INVOICES_PENDING" | "PROFORMA_INVOICES_COMPLETED";
    workspaceState: string;
    organizationStartedAt: string | null;
    executionProgressPercent: number;
    modules: {
        status: string;
        key: "INSPECTION" | "FREIGHTIQ" | "PURCHASE_ORDERS" | "PROFORMA_INVOICES" | "DOCUMENTS_HUB" | "SHIPMENT_TRACKING";
        label: string;
        workspaceId: string | null;
        lastUpdate: string | null;
        responsibleTeam: string;
        workspaceUrl: string | null;
        lastActivity?: string | null | undefined;
    }[];
    statusHistory: {
        id: string;
        createdAt: string;
        note: string | null;
        toStatus: string;
        fromStatus: string | null;
        actorUserId: string | null;
        actorName: string | null;
    }[];
    activityTimeline: {
        id: string;
        createdAt: string;
        label: string;
        payload: Record<string, unknown>;
        eventType: string;
        actorUserId: string | null;
        actorName: string | null;
        sourceModule: string;
    }[];
    outstandingTasks: {
        status: "OPEN" | "COMPLETED";
        id: string;
        title: string;
        priority: "LOW" | "HIGH" | "NORMAL";
        moduleKey: "INSPECTION" | "FREIGHTIQ" | "PURCHASE_ORDERS" | "PROFORMA_INVOICES" | "DOCUMENTS_HUB" | "SHIPMENT_TRACKING" | null;
    }[];
    upcomingMilestones: {
        key: string;
        label: string;
        completed: boolean;
        targetDate: string | null;
    }[];
    responsibleTeams: {
        role: string;
        team: string;
    }[];
    synchronizationStatus?: string | undefined;
    lastSyncedAt?: string | null | undefined;
    internalNotes?: {
        id: string;
        createdAt: string;
        body: string;
        authorName: string;
    }[] | undefined;
}>;
export type McOrganizationWorkspaceDTO = z.infer<typeof McOrganizationWorkspaceDTO>;
export declare function buyerOrganizationLink(workspaceId: string): string;
export declare function adminOrganizationLink(workspaceId: string): string;

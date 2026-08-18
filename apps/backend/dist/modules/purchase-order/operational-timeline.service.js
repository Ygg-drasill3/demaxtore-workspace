import { compareOperationalTimelineEvents } from "@dmx/contracts/operational-timeline";
import { canonicalizePoTimelineEvent } from "@dmx/contracts/purchase-order";
import { AppError } from "../../utils/httpErrors.js";
import { canAccessPo } from "./purchase-order.policy.js";
const EVENT_RULES = {
    PURCHASE_ORDER_CREATED: {
        category: "PURCHASE_ORDER",
        title: "Purchase Order Created",
        severity: "info",
        icon: "clipboard",
    },
    PURCHASE_ORDER_ISSUED: {
        category: "PURCHASE_ORDER",
        title: "Purchase Order Issued",
        severity: "success",
        icon: "clipboard",
        related: ({ revisionByNumber }) => {
            const id = revisionByNumber.get(1);
            return id ? { type: "REVISION", id } : null;
        },
    },
    "po.issued": {
        category: "PURCHASE_ORDER",
        title: "Purchase Order Issued",
        severity: "success",
        icon: "clipboard",
        related: ({ revisionByNumber }) => {
            const id = revisionByNumber.get(1);
            return id ? { type: "REVISION", id } : null;
        },
    },
    "po.created": {
        category: "PURCHASE_ORDER",
        title: "Purchase Order Created",
        severity: "info",
        icon: "clipboard",
    },
    "po.submitted": {
        category: "PURCHASE_ORDER",
        title: "Purchase Order Submitted",
        severity: "success",
        icon: "clipboard",
        related: ({ revisionByNumber }) => {
            const id = revisionByNumber.get(1);
            return id ? { type: "REVISION", id } : null;
        },
    },
    "po.approved": {
        category: "APPROVAL",
        title: "Purchase Order Approved",
        severity: "success",
        icon: "success",
    },
    "po.revised": {
        category: "REVISION",
        title: "Purchase Order Revised",
        severity: "success",
        icon: "revision",
        description: (p) => (p.revisionNumber != null ? `Revision ${String(p.revisionNumber)}` : null),
        related: ({ payload, revisionByNumber }) => {
            const n = typeof payload.revisionNumber === "number" ? payload.revisionNumber : null;
            if (n == null)
                return null;
            const id = revisionByNumber.get(n);
            return id ? { type: "REVISION", id } : null;
        },
    },
    "po.updated": {
        category: "PURCHASE_ORDER",
        title: "Purchase Order Updated",
        severity: "info",
        icon: "clipboard",
    },
    "po.completed": {
        category: "PURCHASE_ORDER",
        title: "Purchase Order Completed",
        severity: "success",
        icon: "success",
    },
    "po.acknowledged": {
        category: "APPROVAL",
        title: "Supplier Acknowledged",
        severity: "success",
        icon: "success",
        description: (p) => (p.status ? `Status: ${String(p.status)}` : null),
    },
    "po.amendment.requested": {
        category: "REVISION",
        title: "Amendment Requested",
        severity: "info",
        icon: "revision",
        description: (p) => (p.reason ? String(p.reason) : null),
    },
    "po.amendment.approved": {
        category: "REVISION",
        title: "Revision Approved",
        severity: "success",
        icon: "revision",
        description: (p) => {
            if (p.revisionNumber != null)
                return `Revision ${String(p.revisionNumber)}`;
            if (p.reason)
                return String(p.reason);
            return null;
        },
        related: ({ payload, revisionByNumber }) => {
            const n = Number(payload.revisionNumber);
            if (Number.isFinite(n) && revisionByNumber.has(n)) {
                return { type: "REVISION", id: revisionByNumber.get(n) };
            }
            return null;
        },
    },
    "po.amendment.rejected": {
        category: "REVISION",
        title: "Amendment Rejected",
        severity: "warning",
        icon: "warning",
        description: (p) => (p.reason ? String(p.reason) : null),
    },
    "po.closed": {
        category: "PURCHASE_ORDER",
        title: "Purchase Order Closed",
        severity: "success",
        icon: "success",
    },
    "po.cancelled": {
        category: "PURCHASE_ORDER",
        title: "Purchase Order Cancelled",
        severity: "warning",
        icon: "warning",
        description: (p) => (p.reason ? String(p.reason) : null),
    },
    "po.document.uploaded": {
        category: "DOCUMENT",
        title: "Document Uploaded",
        severity: "info",
        icon: "upload",
        description: (p) => fileDesc(p),
        related: ({ payload }) => docRelated(payload),
    },
    "po.document.replaced": {
        category: "DOCUMENT",
        title: "Document Replaced",
        severity: "info",
        icon: "upload",
        description: (p) => fileDesc(p),
        related: ({ payload }) => docRelated(payload),
    },
    "po.document.deleted": {
        category: "DOCUMENT",
        title: "Document Deleted",
        severity: "warning",
        icon: "document",
        description: (p) => fileDesc(p),
    },
    "order.inspection.requested": {
        category: "INSPECTION",
        title: "Inspection Requested",
        severity: "info",
        icon: "clipboard",
        related: () => ({ type: "INSPECTION", id: "order" }),
    },
    "order.inspection.completed": {
        category: "INSPECTION",
        title: "Inspection Completed",
        severity: "success",
        icon: "success",
        description: (p) => (p.result ? `Result: ${String(p.result)}` : null),
        related: () => ({ type: "INSPECTION", id: "order" }),
    },
    // SPR-30-02 — Inspection Workspace audit / timeline aliases
    "inspection.requested": {
        category: "INSPECTION",
        title: "Inspection Requested",
        severity: "info",
        icon: "clipboard",
        related: ({ payload }) => payload.inspectionId ? { type: "INSPECTION", id: String(payload.inspectionId) } : null,
    },
    "inspection.assigned": {
        category: "INSPECTION",
        title: "Inspector Assigned",
        severity: "info",
        icon: "clipboard",
        description: (p) => (p.inspectorName ? `Inspector: ${String(p.inspectorName)}` : null),
        related: ({ payload }) => payload.inspectionId ? { type: "INSPECTION", id: String(payload.inspectionId) } : null,
    },
    "inspection.scheduled": {
        category: "INSPECTION",
        title: "Inspection Scheduled",
        severity: "info",
        icon: "clipboard",
    },
    "inspection.rescheduled": {
        category: "INSPECTION",
        title: "Inspection Rescheduled",
        severity: "info",
        icon: "clipboard",
    },
    "inspection.started": {
        category: "INSPECTION",
        title: "Inspection Started",
        severity: "info",
        icon: "clipboard",
    },
    "inspection.completed": {
        category: "INSPECTION",
        title: "Inspection Completed",
        severity: "success",
        icon: "success",
    },
    "inspection.approved": {
        category: "INSPECTION",
        title: "Inspection Approved",
        severity: "success",
        icon: "success",
        description: (p) => (p.decision ? `Decision: ${String(p.decision)}` : null),
    },
    "inspection.failed": {
        category: "INSPECTION",
        title: "Inspection Failed",
        severity: "warning",
        icon: "alert",
        description: (p) => (p.decision ? `Decision: ${String(p.decision)}` : null),
    },
    "inspection.cancelled": {
        category: "INSPECTION",
        title: "Inspection Cancelled",
        severity: "warning",
        icon: "clipboard",
    },
    "finding.created": {
        category: "INSPECTION",
        title: "Finding Recorded",
        severity: "warning",
        icon: "clipboard",
        description: (p) => [p.category, p.severity].filter(Boolean).map(String).join(" · ") || null,
    },
    "finding.updated": {
        category: "INSPECTION",
        title: "Finding Updated",
        severity: "info",
        icon: "clipboard",
    },
    "finding.deleted": {
        category: "INSPECTION",
        title: "Finding Deleted",
        severity: "warning",
        icon: "clipboard",
    },
    "decision.recorded": {
        category: "INSPECTION",
        title: "Inspection Decision Recorded",
        severity: "info",
        icon: "clipboard",
        description: (p) => (p.decision ? `Decision: ${String(p.decision)}` : null),
    },
    "NCR.created": {
        category: "INSPECTION",
        title: "NCR Created",
        severity: "warning",
        icon: "alert",
        description: (p) => (p.ncrNumber ? String(p.ncrNumber) : null),
    },
    "NCR.closed": {
        category: "INSPECTION",
        title: "NCR Closed",
        severity: "success",
        icon: "success",
    },
    "NCR.updated": {
        category: "INSPECTION",
        title: "NCR Updated",
        severity: "info",
        icon: "clipboard",
    },
    "task.created": {
        category: "TASK",
        title: "Task Created",
        severity: "info",
        icon: "clipboard",
        description: (p) => (p.title ? String(p.title) : null),
        related: ({ payload }) => payload.taskId ? { type: "ORDER", id: String(payload.taskId) } : null,
    },
    "task.assigned": {
        category: "TASK",
        title: "Task Assigned",
        severity: "info",
        icon: "clipboard",
    },
    "task.started": {
        category: "TASK",
        title: "Task Started",
        severity: "info",
        icon: "clipboard",
    },
    "task.completed": {
        category: "TASK",
        title: "Task Completed",
        severity: "success",
        icon: "success",
    },
    "task.cancelled": {
        category: "TASK",
        title: "Task Cancelled",
        severity: "warning",
        icon: "clipboard",
    },
    "task.commented": {
        category: "TASK",
        title: "Task Comment Added",
        severity: "info",
        icon: "clipboard",
    },
    "task.updated": {
        category: "TASK",
        title: "Task Updated",
        severity: "info",
        icon: "clipboard",
    },
    "task.deleted": {
        category: "TASK",
        title: "Task Deleted",
        severity: "warning",
        icon: "clipboard",
    },
    "issue.created": {
        category: "ISSUE",
        title: "Issue Created",
        severity: "warning",
        icon: "clipboard",
        description: (p) => (p.title ? String(p.title) : null),
        related: ({ payload }) => payload.issueId ? { type: "ORDER", id: String(payload.issueId) } : null,
    },
    "issue.updated": {
        category: "ISSUE",
        title: "Issue Updated",
        severity: "info",
        icon: "clipboard",
    },
    "issue.assigned": {
        category: "ISSUE",
        title: "Issue Linked to Task",
        severity: "info",
        icon: "clipboard",
    },
    "issue.resolved": {
        category: "ISSUE",
        title: "Issue Resolved",
        severity: "success",
        icon: "success",
    },
    "issue.closed": {
        category: "ISSUE",
        title: "Issue Closed",
        severity: "success",
        icon: "success",
    },
    "issue.reopened": {
        category: "ISSUE",
        title: "Issue Reopened",
        severity: "warning",
        icon: "clipboard",
    },
    "issue.deleted": {
        category: "ISSUE",
        title: "Issue Deleted",
        severity: "warning",
        icon: "clipboard",
    },
    "delivery.recorded": {
        category: "SHIPMENT",
        title: "Delivery Recorded",
        severity: "success",
        icon: "ship",
        related: ({ workspaceId }) => ({ type: "ORDER", id: workspaceId }),
    },
    "completion.ready": {
        category: "PURCHASE_ORDER",
        title: "Completion Ready",
        severity: "info",
        icon: "success",
        related: ({ workspaceId }) => ({ type: "ORDER", id: workspaceId }),
    },
    "order.completed": {
        category: "PURCHASE_ORDER",
        title: "Order Operationally Completed",
        severity: "success",
        icon: "success",
        related: ({ workspaceId }) => ({ type: "ORDER", id: workspaceId }),
    },
    "completion.reopened": {
        category: "PURCHASE_ORDER",
        title: "Completion Reopened",
        severity: "warning",
        icon: "clipboard",
        related: ({ workspaceId }) => ({ type: "ORDER", id: workspaceId }),
    },
    "order.shipment.booked": {
        category: "SHIPMENT",
        title: "Shipment Booked",
        severity: "success",
        icon: "ship",
    },
    "order.shipment.departed": {
        category: "SHIPMENT",
        title: "Vessel Departed",
        severity: "info",
        icon: "ship",
    },
    "order.shipment.arrived": {
        category: "SHIPMENT",
        title: "Shipment Arrived",
        severity: "success",
        icon: "truck",
    },
    "order.delivered": {
        category: "SHIPMENT",
        title: "Goods Delivered",
        severity: "success",
        icon: "truck",
    },
    "order.closed": {
        category: "PURCHASE_ORDER",
        title: "Order Closed",
        severity: "success",
        icon: "success",
    },
    "order.document.uploaded": {
        category: "DOCUMENT",
        title: "Order Document Uploaded",
        severity: "info",
        icon: "upload",
        description: (p) => fileDesc(p),
    },
    "order.production.started": {
        category: "OTHER",
        title: "Production Started",
        severity: "info",
        icon: "history",
    },
    "order.production.completed": {
        category: "OTHER",
        title: "Production Completed",
        severity: "success",
        icon: "success",
    },
    "shipment.created": {
        category: "SHIPMENT",
        title: "Shipment Created",
        severity: "info",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "shipment.spawned": {
        category: "SHIPMENT",
        title: "Shipment Created",
        severity: "info",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "shipment.booking.pending": {
        category: "SHIPMENT",
        title: "Booking Requested",
        severity: "info",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "shipment.booking.confirmed": {
        category: "SHIPMENT",
        title: "Shipment Booked",
        severity: "success",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "shipment.booking_confirmed": {
        category: "SHIPMENT",
        title: "Shipment Booked",
        severity: "success",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "booking.created": {
        category: "SHIPMENT",
        title: "Booking Created",
        severity: "info",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "booking.updated": {
        category: "SHIPMENT",
        title: "Booking Updated",
        severity: "info",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "booking.cancelled": {
        category: "SHIPMENT",
        title: "Booking Cancelled",
        severity: "warning",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "milestone.created": {
        category: "SHIPMENT",
        title: "Milestone Created",
        severity: "info",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "milestone.updated": {
        category: "SHIPMENT",
        title: "Milestone Updated",
        severity: "info",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "milestone.completed": {
        category: "SHIPMENT",
        title: "Milestone Completed",
        severity: "success",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "milestone.delayed": {
        category: "SHIPMENT",
        title: "Milestone Delayed",
        severity: "warning",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "eta.changed": {
        category: "SHIPMENT",
        title: "ETA Changed",
        severity: "warning",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "delay.updated": {
        category: "SHIPMENT",
        title: "Delay Updated",
        severity: "warning",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "shipment.container.assigned": {
        category: "SHIPMENT",
        title: "Container Assigned",
        severity: "info",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "container.added": {
        category: "SHIPMENT",
        title: "Container Added",
        severity: "info",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "container.updated": {
        category: "SHIPMENT",
        title: "Container Updated",
        severity: "info",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "container.removed": {
        category: "SHIPMENT",
        title: "Container Removed",
        severity: "warning",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "shipment.loaded_on_vessel": {
        category: "SHIPMENT",
        title: "Container Loaded",
        severity: "info",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "shipment.departed": {
        category: "SHIPMENT",
        title: "Vessel Departed",
        severity: "info",
        icon: "ship",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "shipment.arrived": {
        category: "SHIPMENT",
        title: "Shipment Arrived",
        severity: "success",
        icon: "truck",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "shipment.arrived_destination": {
        category: "SHIPMENT",
        title: "Arrived Destination",
        severity: "success",
        icon: "truck",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "shipment.delivered": {
        category: "SHIPMENT",
        title: "Shipment Delivered",
        severity: "success",
        icon: "truck",
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "shipment.document.uploaded": {
        category: "DOCUMENT",
        title: "Shipment Document Uploaded",
        severity: "info",
        icon: "upload",
        description: (p) => fileDesc(p),
        related: ({ workspaceId, shipmentIds }) => shipmentIds.has(workspaceId) ? { type: "SHIPMENT", id: workspaceId } : null,
    },
    "document.revision_requested": {
        category: "TRADE",
        title: "Document Revision Requested",
        severity: "warning",
        icon: "document",
    },
};
function fileDesc(p) {
    const name = (typeof p.fileName === "string" && p.fileName)
        || (typeof p.originalFileName === "string" && p.originalFileName)
        || (typeof p.title === "string" && p.title)
        || null;
    const cat = typeof p.category === "string" ? p.category : null;
    if (name && cat)
        return `${cat}: ${name}`;
    return name ?? cat;
}
function docRelated(payload) {
    if (typeof payload.documentId === "string" && payload.documentId) {
        const id = payload.documentId.includes(":")
            ? payload.documentId
            : `COMMERCIAL:${payload.documentId}`;
        return { type: "DOCUMENT", id };
    }
    return null;
}
function asPayload(raw) {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        return raw;
    }
    return {};
}
function sanitizeMetadata(payload) {
    const out = {};
    const blocked = /storage|path|key|secret|token|password|mimeType/i;
    for (const [k, v] of Object.entries(payload)) {
        if (blocked.test(k))
            continue;
        if (v == null)
            continue;
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            out[k] = v;
        }
    }
    return out;
}
function defaultRule(eventType) {
    const pretty = eventType
        .replace(/^po\./, "PO ")
        .replace(/^order\./, "Order ")
        .replace(/^shipment\./, "Shipment ")
        .replace(/^booking\./, "Booking ")
        .replace(/^container\./, "Container ")
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    const isShipment = eventType.startsWith("shipment.")
        || eventType.startsWith("booking.")
        || eventType.startsWith("container.")
        || eventType.startsWith("order.shipment.");
    return {
        category: isShipment ? "SHIPMENT" : "OTHER",
        title: pretty || eventType,
        severity: "info",
        icon: isShipment ? "ship" : "history",
    };
}
export class OperationalTimelineService {
    db;
    constructor(db) {
        this.db = db;
    }
    async list(poId, actor, query) {
        if (!(await canAccessPo(this.db, actor, poId)))
            throw new AppError(403, "FORBIDDEN");
        const all = await this.aggregate(poId);
        const filtered = this.applyFilters(all, query);
        const sorted = [...filtered].sort((a, b) => {
            const cmp = compareOperationalTimelineEvents(a, b);
            return query.direction === "asc" ? -cmp : cmp;
        });
        const total = sorted.length;
        const start = (query.page - 1) * query.pageSize;
        const items = sorted.slice(start, start + query.pageSize);
        const availableCategories = [...new Set(all.map((e) => e.category))];
        const availableSources = [...new Set(all.map((e) => e.source))];
        return {
            items,
            page: query.page,
            pageSize: query.pageSize,
            total,
            availableCategories,
            availableSources,
        };
    }
    async aggregate(poId) {
        const po = await this.db.purchaseOrder.findUnique({
            where: { id: poId },
            select: {
                id: true,
                orderId: true,
                createdAt: true,
                issuedAt: true,
                closedAt: true,
                status: true,
                buyerId: true,
                poNumber: true,
            },
        });
        if (!po)
            throw new AppError(404, "PO_NOT_FOUND");
        const shipments = await this.db.shipmentWorkspace.findMany({
            where: { orderWorkspaceId: po.orderId },
            select: { workspaceId: true },
        });
        const shipmentIds = new Set(shipments.map((s) => s.workspaceId));
        const workspaceIds = [po.orderId, ...shipments.map((s) => s.workspaceId)];
        const [revisions, commercialDocs, orderWs, events] = await Promise.all([
            this.db.purchaseOrderRevision.findMany({
                where: { purchaseOrderId: poId },
                select: {
                    id: true,
                    revisionNumber: true,
                    reason: true,
                    createdAt: true,
                    createdById: true,
                },
                orderBy: { revisionNumber: "asc" },
            }),
            this.db.purchaseOrderCommercialDocument.findMany({
                where: { purchaseOrderId: poId },
                select: {
                    id: true,
                    category: true,
                    title: true,
                    fileName: true,
                    referenceNumber: true,
                    uploadedAt: true,
                    uploadedById: true,
                    replacedAt: true,
                    deletedAt: true,
                },
            }),
            this.db.orderWorkspace.findUnique({
                where: { workspaceId: po.orderId },
                select: {
                    inspectionRequestedAt: true,
                    inspectionCompletedAt: true,
                    inspectionResult: true,
                    inspectorName: true,
                },
            }),
            this.db.timelineEvent.findMany({
                where: { workspaceId: { in: workspaceIds } },
                orderBy: { createdAt: "desc" },
                take: 500,
            }),
        ]);
        const revisionByNumber = new Map(revisions.map((r) => [r.revisionNumber, r.id]));
        const raw = [];
        for (const ev of events) {
            const payload = asPayload(ev.payload);
            const canonicalType = canonicalizePoTimelineEvent(ev.eventType);
            const rule = EVENT_RULES[canonicalType] ?? EVENT_RULES[ev.eventType] ?? defaultRule(canonicalType);
            let relatedEntity = rule.related?.({
                payload,
                workspaceId: ev.workspaceId,
                shipmentIds,
                revisionByNumber,
            }) ?? null;
            if (!relatedEntity && shipmentIds.has(ev.workspaceId)) {
                relatedEntity = { type: "SHIPMENT", id: ev.workspaceId };
            }
            raw.push({
                id: `timeline:${ev.id}`,
                purchaseOrderId: poId,
                orderId: po.orderId,
                category: rule.category,
                source: "timeline",
                occurredAt: ev.createdAt.toISOString(),
                actorUserId: ev.actorUserId,
                title: rule.title,
                description: rule.description?.(payload) ?? null,
                metadata: {
                    eventType: canonicalType,
                    legacyEventType: ev.eventType !== canonicalType ? ev.eventType : undefined,
                    ...sanitizeMetadata(payload),
                },
                icon: rule.icon,
                severity: rule.severity,
                relatedEntity,
            });
        }
        const hasIssuedTimeline = raw.some((e) => e.metadata?.eventType === "PURCHASE_ORDER_ISSUED"
            || e.metadata?.eventType === "po.issued"
            || e.metadata?.eventType === "po.submitted");
        const approvedRevNumbers = new Set(raw
            .filter((e) => e.metadata?.eventType === "po.amendment.approved"
            || e.metadata?.eventType === "po.revised")
            .map((e) => Number(e.metadata?.revisionNumber))
            .filter((n) => Number.isFinite(n)));
        for (const rev of revisions) {
            if (rev.revisionNumber === 1 && hasIssuedTimeline) {
                for (const e of raw) {
                    if ((e.metadata?.eventType === "PURCHASE_ORDER_ISSUED"
                        || e.metadata?.eventType === "po.issued"
                        || e.metadata?.eventType === "po.submitted")
                        && !e.relatedEntity) {
                        e.relatedEntity = { type: "REVISION", id: rev.id };
                    }
                }
                continue;
            }
            if (approvedRevNumbers.has(rev.revisionNumber)) {
                for (const e of raw) {
                    if (e.metadata?.eventType === "po.amendment.approved"
                        && Number(e.metadata?.revisionNumber) === rev.revisionNumber
                        && !e.relatedEntity) {
                        e.relatedEntity = { type: "REVISION", id: rev.id };
                    }
                }
                continue;
            }
            raw.push({
                id: `revision:${rev.id}`,
                purchaseOrderId: poId,
                orderId: po.orderId,
                category: "REVISION",
                source: "revision",
                occurredAt: rev.createdAt.toISOString(),
                actorUserId: rev.createdById,
                title: rev.revisionNumber === 1 ? "Revision 1 Issued" : `Revision ${rev.revisionNumber} Issued`,
                description: rev.reason,
                metadata: { revisionNumber: rev.revisionNumber, reason: rev.reason },
                icon: "revision",
                severity: "success",
                relatedEntity: { type: "REVISION", id: rev.id },
            });
        }
        const timelineDocIds = new Set(raw
            .filter((e) => e.relatedEntity?.type === "DOCUMENT")
            .map((e) => e.relatedEntity.id));
        for (const doc of commercialDocs) {
            const composite = `COMMERCIAL:${doc.id}`;
            if (!timelineDocIds.has(composite) && !doc.deletedAt) {
                raw.push({
                    id: `commercial_document:${doc.id}:upload`,
                    purchaseOrderId: poId,
                    orderId: po.orderId,
                    category: "DOCUMENT",
                    source: "commercial_document",
                    occurredAt: doc.uploadedAt.toISOString(),
                    actorUserId: doc.uploadedById,
                    title: `${prettyDocCategory(doc.category)} Uploaded`,
                    description: [doc.title, doc.fileName, doc.referenceNumber].filter(Boolean).join(" · ") || null,
                    metadata: {
                        category: doc.category,
                        fileName: doc.fileName,
                        referenceNumber: doc.referenceNumber,
                    },
                    icon: "upload",
                    severity: "info",
                    relatedEntity: { type: "DOCUMENT", id: composite },
                });
            }
            if (doc.replacedAt) {
                raw.push({
                    id: `commercial_document:${doc.id}:replace`,
                    purchaseOrderId: poId,
                    orderId: po.orderId,
                    category: "DOCUMENT",
                    source: "commercial_document",
                    occurredAt: doc.replacedAt.toISOString(),
                    actorUserId: doc.uploadedById,
                    title: "Document Replaced",
                    description: doc.fileName,
                    metadata: { category: doc.category, fileName: doc.fileName },
                    icon: "upload",
                    severity: "info",
                    relatedEntity: { type: "DOCUMENT", id: composite },
                });
            }
            if (doc.deletedAt) {
                raw.push({
                    id: `commercial_document:${doc.id}:delete`,
                    purchaseOrderId: poId,
                    orderId: po.orderId,
                    category: "DOCUMENT",
                    source: "commercial_document",
                    occurredAt: doc.deletedAt.toISOString(),
                    actorUserId: doc.uploadedById,
                    title: "Document Deleted",
                    description: doc.fileName,
                    metadata: { category: doc.category, fileName: doc.fileName },
                    icon: "document",
                    severity: "warning",
                    relatedEntity: null,
                });
            }
        }
        const hasInspectionTimeline = raw.some((e) => e.category === "INSPECTION");
        if (!hasInspectionTimeline && orderWs) {
            if (orderWs.inspectionRequestedAt) {
                raw.push({
                    id: `inspection:${po.orderId}:requested`,
                    purchaseOrderId: poId,
                    orderId: po.orderId,
                    category: "INSPECTION",
                    source: "inspection",
                    occurredAt: orderWs.inspectionRequestedAt.toISOString(),
                    actorUserId: null,
                    title: "Inspection Requested",
                    description: orderWs.inspectorName ? `Inspector: ${orderWs.inspectorName}` : null,
                    metadata: {},
                    icon: "clipboard",
                    severity: "info",
                    relatedEntity: { type: "INSPECTION", id: po.orderId },
                });
            }
            if (orderWs.inspectionCompletedAt) {
                const passed = String(orderWs.inspectionResult ?? "").toUpperCase().includes("PASS");
                raw.push({
                    id: `inspection:${po.orderId}:completed`,
                    purchaseOrderId: poId,
                    orderId: po.orderId,
                    category: "INSPECTION",
                    source: "inspection",
                    occurredAt: orderWs.inspectionCompletedAt.toISOString(),
                    actorUserId: null,
                    title: passed ? "Inspection Passed" : "Inspection Completed",
                    description: orderWs.inspectionResult
                        ? `Result: ${orderWs.inspectionResult}`
                        : null,
                    metadata: { result: orderWs.inspectionResult },
                    icon: passed ? "success" : "clipboard",
                    severity: passed ? "success" : "info",
                    relatedEntity: { type: "INSPECTION", id: po.orderId },
                });
            }
        }
        if (!raw.some((e) => e.metadata?.eventType === "PURCHASE_ORDER_CREATED")) {
            raw.push({
                id: `purchase_order:${poId}:created`,
                purchaseOrderId: poId,
                orderId: po.orderId,
                category: "PURCHASE_ORDER",
                source: "purchase_order",
                occurredAt: po.createdAt.toISOString(),
                actorUserId: po.buyerId,
                title: "Purchase Order Created",
                description: po.poNumber ? `PO ${po.poNumber}` : null,
                metadata: { poNumber: po.poNumber },
                icon: "clipboard",
                severity: "info",
                relatedEntity: null,
            });
        }
        return this.enrichActors(raw);
    }
    async enrichActors(events) {
        const ids = [...new Set(events.map((e) => e.actorUserId).filter(Boolean))];
        const users = ids.length === 0
            ? []
            : await this.db.user.findMany({
                where: { id: { in: ids } },
                select: { id: true, displayName: true, email: true },
            });
        const byId = new Map(users.map((u) => [u.id, { id: u.id, name: u.displayName || u.email || u.id }]));
        return events.map(({ actorUserId, ...rest }) => ({
            ...rest,
            actor: actorUserId ? (byId.get(actorUserId) ?? { id: actorUserId, name: "Unknown" }) : null,
        }));
    }
    applyFilters(events, query) {
        let out = events;
        if (query.category)
            out = out.filter((e) => e.category === query.category);
        if (query.source)
            out = out.filter((e) => e.source === query.source);
        if (query.actorId)
            out = out.filter((e) => e.actor?.id === query.actorId);
        if (query.from) {
            const from = Date.parse(query.from);
            if (Number.isFinite(from))
                out = out.filter((e) => Date.parse(e.occurredAt) >= from);
        }
        if (query.to) {
            const to = Date.parse(query.to);
            if (Number.isFinite(to))
                out = out.filter((e) => Date.parse(e.occurredAt) <= to);
        }
        if (query.search?.trim()) {
            const q = query.search.trim().toLowerCase();
            out = out.filter((e) => {
                const hay = [
                    e.title,
                    e.description ?? "",
                    e.source,
                    e.category,
                    e.actor?.name ?? "",
                    typeof e.metadata?.fileName === "string" ? e.metadata.fileName : "",
                    typeof e.metadata?.reason === "string" ? e.metadata.reason : "",
                    typeof e.metadata?.referenceNumber === "string" ? e.metadata.referenceNumber : "",
                    typeof e.metadata?.poNumber === "string" ? e.metadata.poNumber : "",
                ]
                    .join(" ")
                    .toLowerCase();
                return hay.includes(q);
            });
        }
        return out;
    }
}
function prettyDocCategory(category) {
    return category
        .split("_")
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" ");
}
//# sourceMappingURL=operational-timeline.service.js.map
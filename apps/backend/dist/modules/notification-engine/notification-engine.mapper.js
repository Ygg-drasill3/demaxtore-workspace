const PRIORITY_ORDER = {
    CRITICAL: 0,
    HIGH: 1,
    NORMAL: 2,
    INFORMATION: 3,
};
export function prioritySortKey(priority) {
    return PRIORITY_ORDER[priority] ?? 9;
}
const SYSTEM_EVENT_MAP = {
    RFQ_PUBLISHED: {
        centerType: "ACTION_REQUIRED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.rfq_published",
    },
    QUOTATION_SUBMITTED: {
        centerType: "QUOTATION_SUBMITTED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "SUCCESS",
        titleKey: "nc.quotation_submitted",
    },
    QUOTATION_REVISED: {
        centerType: "QUOTATION_REVISED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.quotation_revised",
    },
    SUPPLIER_SELECTED: {
        centerType: "SUPPLIER_SELECTED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "SUCCESS",
        titleKey: "nc.supplier_selected",
    },
    COMMODITYBID_CLOSED: {
        centerType: "COMMODITYBID_CLOSED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.commoditybid_closed",
    },
    PURCHASE_ORDER_ISSUED: {
        centerType: "PURCHASE_ORDER_ISSUED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "SUCCESS",
        titleKey: "nc.purchase_order_issued",
    },
    INSPECTION_SCHEDULED: {
        centerType: "INSPECTION_SCHEDULED",
        priority: "NORMAL",
        category: "INSPECTION",
        visualType: "INFO",
        titleKey: "nc.inspection_scheduled",
    },
    INSPECTION_COMPLETED: {
        centerType: "INSPECTION_COMPLETED",
        priority: "NORMAL",
        category: "INSPECTION",
        visualType: "SUCCESS",
        titleKey: "nc.inspection_completed",
    },
    SHIPMENT_BOOKED: {
        centerType: "SHIPMENT_BOOKED",
        priority: "NORMAL",
        category: "SHIPMENT",
        visualType: "INFO",
        titleKey: "nc.shipment_booked",
    },
    ETA_UPDATED: {
        centerType: "ETA_UPDATED",
        priority: "NORMAL",
        category: "SHIPMENT",
        visualType: "INFO",
        titleKey: "nc.eta_updated",
    },
    SHIPMENT_DELAYED: {
        centerType: "SHIPMENT_DELAYED",
        priority: "HIGH",
        category: "SHIPMENT",
        visualType: "WARNING",
        titleKey: "nc.shipment_delayed",
    },
    SHIPMENT_DELIVERED: {
        centerType: "SHIPMENT_DELIVERED",
        priority: "NORMAL",
        category: "SHIPMENT",
        visualType: "SUCCESS",
        titleKey: "nc.shipment_delivered",
    },
    WORKSPACE_CREATED: {
        centerType: "WORKSPACE_ASSIGNED",
        priority: "INFORMATION",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.workspace_assigned",
    },
};
const EVENT_TYPE_MAP = {
    "communication.message.created": {
        centerType: "NEW_SUPPLIER_MESSAGE",
        priority: "NORMAL",
        category: "MESSAGES",
        visualType: "INFO",
        titleKey: "nc.new_supplier_message",
    },
    "communication.internal_note": {
        centerType: "ACTION_REQUIRED",
        priority: "NORMAL",
        category: "MESSAGES",
        visualType: "INFO",
        titleKey: "nc.internal_note",
    },
    "communication.mentioned": {
        centerType: "BUYER_MENTIONED",
        priority: "HIGH",
        category: "MESSAGES",
        visualType: "WARNING",
        titleKey: "nc.mentioned",
    },
    "communication.mentioned.buyer": {
        centerType: "BUYER_MENTIONED",
        priority: "HIGH",
        category: "MESSAGES",
        visualType: "WARNING",
        titleKey: "nc.buyer_mentioned",
    },
    "communication.mentioned.supplier": {
        centerType: "SUPPLIER_MENTIONED",
        priority: "HIGH",
        category: "MESSAGES",
        visualType: "WARNING",
        titleKey: "nc.supplier_mentioned",
    },
    "document.uploaded": {
        centerType: "DOCUMENT_UPLOADED",
        priority: "NORMAL",
        category: "DOCUMENTS",
        visualType: "INFO",
        titleKey: "nc.document_uploaded",
    },
    // RFQ FSM
    "rfq.submitted": {
        centerType: "APPROVAL_REQUIRED",
        priority: "CRITICAL",
        category: "APPROVALS",
        visualType: "WARNING",
        titleKey: "nc.approval_required",
    },
    "rfq.supplier.selected": {
        centerType: "SUPPLIER_SELECTED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "SUCCESS",
        titleKey: "nc.supplier_selected",
    },
    "po.issued": {
        centerType: "PURCHASE_ORDER_ISSUED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "SUCCESS",
        titleKey: "nc.purchase_order_issued",
    },
    "quotation.submitted": {
        centerType: "QUOTATION_SUBMITTED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "SUCCESS",
        titleKey: "nc.quotation_submitted",
    },
    "quotation.revised": {
        centerType: "QUOTATION_REVISED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.quotation_revised",
    },
    // Order FSM
    "order.inspection.requested": {
        centerType: "INSPECTION_SCHEDULED",
        priority: "NORMAL",
        category: "INSPECTION",
        visualType: "INFO",
        titleKey: "nc.inspection_scheduled",
    },
    "order.inspection.completed": {
        centerType: "INSPECTION_COMPLETED",
        priority: "NORMAL",
        category: "INSPECTION",
        visualType: "SUCCESS",
        titleKey: "nc.inspection_completed",
    },
    "order.shipment.booked": {
        centerType: "SHIPMENT_BOOKED",
        priority: "NORMAL",
        category: "SHIPMENT",
        visualType: "INFO",
        titleKey: "nc.shipment_booked",
    },
    "order.shipment.eta_updated": {
        centerType: "ETA_UPDATED",
        priority: "NORMAL",
        category: "SHIPMENT",
        visualType: "INFO",
        titleKey: "nc.eta_updated",
    },
    "order.shipment.delayed": {
        centerType: "SHIPMENT_DELAYED",
        priority: "HIGH",
        category: "SHIPMENT",
        visualType: "WARNING",
        titleKey: "nc.shipment_delayed",
    },
    "order.delivered": {
        centerType: "SHIPMENT_DELIVERED",
        priority: "NORMAL",
        category: "SHIPMENT",
        visualType: "SUCCESS",
        titleKey: "nc.shipment_delivered",
    },
    // Shipment FSM
    "shipment.booking.confirmed": {
        centerType: "SHIPMENT_BOOKED",
        priority: "NORMAL",
        category: "SHIPMENT",
        visualType: "INFO",
        titleKey: "nc.shipment_booked",
    },
    "shipment.exception.reported": {
        centerType: "SHIPMENT_DELAYED",
        priority: "HIGH",
        category: "SHIPMENT",
        visualType: "WARNING",
        titleKey: "nc.shipment_delayed",
    },
    "shipment.delivered": {
        centerType: "SHIPMENT_DELIVERED",
        priority: "NORMAL",
        category: "SHIPMENT",
        visualType: "SUCCESS",
        titleKey: "nc.shipment_delivered",
    },
    // CommodityBid
    "commoditybid.closed": {
        centerType: "COMMODITYBID_CLOSED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.commoditybid_closed",
    },
    "commoditybid.closed.no_award": {
        centerType: "COMMODITYBID_CLOSED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.commoditybid_closed",
    },
    "commoditybid.bid.submitted": {
        centerType: "QUOTATION_SUBMITTED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "SUCCESS",
        titleKey: "nc.quotation_submitted",
    },
    "commoditybid.bid.revised": {
        centerType: "QUOTATION_REVISED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.quotation_revised",
    },
    "mixed_container.procurement_submitted": {
        centerType: "ACTION_REQUIRED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "SUCCESS",
        titleKey: "nc.mc_procurement_submitted",
    },
    "mixed_container.procurement_submitted_admin": {
        centerType: "ACTION_REQUIRED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.mc_procurement_submitted_admin",
    },
    "mixed_container.procurement_in_progress": {
        centerType: "ACTION_REQUIRED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.mc_procurement_in_progress",
    },
    "mixed_container.manager_assigned": {
        centerType: "ACTION_REQUIRED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.mc_manager_assigned",
    },
    "mixed_container.proposal_ready": {
        centerType: "ACTION_REQUIRED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.mc_proposal_ready",
    },
    "mixed_container.proposal_published": {
        centerType: "ACTION_REQUIRED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "WARNING",
        titleKey: "nc.mc_proposal_published",
    },
    "mixed_container.revision_requested": {
        centerType: "ACTION_REQUIRED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.mc_revision_requested",
    },
    "mixed_container.proposal_approved": {
        centerType: "ACTION_REQUIRED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "SUCCESS",
        titleKey: "nc.mc_proposal_approved",
    },
    "mixed_container.proposal_revised": {
        centerType: "ACTION_REQUIRED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "WARNING",
        titleKey: "nc.mc_proposal_revised",
    },
    "mixed_container.revision_requested_admin": {
        centerType: "ACTION_REQUIRED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "WARNING",
        titleKey: "nc.mc_revision_requested_admin",
    },
    "mixed_container.organization_started": {
        centerType: "ACTION_REQUIRED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.mc_organization_started",
    },
    "mixed_container.organization_created": {
        centerType: "ACTION_REQUIRED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "SUCCESS",
        titleKey: "nc.mc_organization_created",
    },
    "mixed_container.organization_production_started": {
        centerType: "ACTION_REQUIRED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.mc_organization_production",
    },
    "mixed_container.organization_shipment_booked": {
        centerType: "ACTION_REQUIRED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.mc_organization_shipment_booked",
    },
    "mixed_container.organization_vessel_departed": {
        centerType: "ACTION_REQUIRED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.mc_organization_vessel_departed",
    },
    "mixed_container.organization_shipment_arrived": {
        centerType: "ACTION_REQUIRED",
        priority: "HIGH",
        category: "WORKSPACE",
        visualType: "SUCCESS",
        titleKey: "nc.mc_organization_shipment_arrived",
    },
    "mixed_container.organization_proforma_uploaded": {
        centerType: "ACTION_REQUIRED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.mc_organization_proforma_uploaded",
    },
    "mixed_container.organization_inspection_scheduled": {
        centerType: "ACTION_REQUIRED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.mc_organization_inspection_scheduled",
    },
    "mixed_container.organization_container_loaded": {
        centerType: "ACTION_REQUIRED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "INFO",
        titleKey: "nc.mc_organization_container_loaded",
    },
    "mixed_container.completed": {
        centerType: "ACTION_REQUIRED",
        priority: "NORMAL",
        category: "WORKSPACE",
        visualType: "SUCCESS",
        titleKey: "nc.mc_completed",
    },
};
const DEFAULT_SHAPE = {
    centerType: "ACTION_REQUIRED",
    priority: "INFORMATION",
    category: "SYSTEM",
    visualType: "INFO",
    titleKey: "notification.generic",
};
export function parseMetadata(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return {};
    return raw;
}
export function resolveOperationalShape(eventType, metadata, prismaType) {
    if (metadata.centerType && metadata.priority && metadata.category) {
        return {
            centerType: metadata.centerType,
            priority: metadata.priority,
            category: metadata.category,
            visualType: prismaType ?? DEFAULT_SHAPE.visualType,
            titleKey: eventType ?? metadata.centerType,
        };
    }
    const systemType = metadata.systemEventType;
    if (systemType && SYSTEM_EVENT_MAP[systemType]) {
        return { ...SYSTEM_EVENT_MAP[systemType], visualType: prismaType ?? SYSTEM_EVENT_MAP[systemType].visualType };
    }
    if (eventType && EVENT_TYPE_MAP[eventType]) {
        return { ...EVENT_TYPE_MAP[eventType], visualType: prismaType ?? EVENT_TYPE_MAP[eventType].visualType };
    }
    // FSM notifications often store full audit event keys
    if (eventType) {
        const tail = eventType.includes(":") ? eventType.split(":").pop() : eventType;
        if (EVENT_TYPE_MAP[tail]) {
            return { ...EVENT_TYPE_MAP[tail], visualType: prismaType ?? EVENT_TYPE_MAP[tail].visualType };
        }
    }
    return {
        ...DEFAULT_SHAPE,
        visualType: prismaType ?? DEFAULT_SHAPE.visualType,
        priority: prismaType === "ERROR" ? "CRITICAL" : prismaType === "WARNING" ? "HIGH" : DEFAULT_SHAPE.priority,
    };
}
function workspaceSegment(workspaceType) {
    const map = {
        RFQ: "rfq",
        COMMODITYBID: "commoditybid",
        ORDER: "order",
        SHIPMENT: "shipment",
        PO: "po",
        FREIGHTIQ: "freightiq",
    };
    return map[workspaceType] ?? "rfq";
}
export function buildWorkspaceLink(workspaceType, workspaceId, focus) {
    if (!workspaceType || !workspaceId)
        return null;
    const base = `/workspace/${workspaceSegment(workspaceType)}/${workspaceId}`;
    if (focus === "messages")
        return `${base}?focus=messages`;
    return base;
}
export function buildActions(input) {
    const actions = [];
    const wsLink = input.link ?? buildWorkspaceLink(input.workspaceType, input.workspaceId);
    const convLink = buildWorkspaceLink(input.workspaceType, input.workspaceId, "messages");
    if (convLink && ["NEW_SUPPLIER_MESSAGE", "BUYER_MENTIONED", "SUPPLIER_MENTIONED"].includes(input.centerType)) {
        actions.push({ type: "OPEN_CONVERSATION", label: "Open conversation", href: convLink });
    }
    if (wsLink) {
        actions.push({ type: "OPEN_WORKSPACE", label: "Open workspace", href: wsLink });
    }
    if (input.documentId && wsLink) {
        actions.push({ type: "OPEN_DOCUMENT", label: "Open document", href: `${wsLink}?focus=documents` });
    }
    if (input.centerType.startsWith("SHIPMENT") || input.centerType === "ETA_UPDATED") {
        if (wsLink)
            actions.push({ type: "OPEN_SHIPMENT", label: "Open shipment", href: wsLink });
    }
    if (input.centerType.startsWith("INSPECTION")) {
        if (wsLink)
            actions.push({ type: "OPEN_INSPECTION", label: "Open inspection", href: wsLink });
    }
    if (input.centerType === "PURCHASE_ORDER_ISSUED" && wsLink) {
        actions.push({ type: "OPEN_PURCHASE_ORDER", label: "Open purchase order", href: wsLink });
    }
    actions.push({ type: "MARK_READ", label: "Mark as read" });
    actions.push({ type: "DISMISS", label: "Dismiss" });
    return actions;
}
export function snoozeUntil(option, now = new Date()) {
    const d = new Date(now);
    switch (option) {
        case "FIFTEEN_MINUTES":
            d.setMinutes(d.getMinutes() + 15);
            return d;
        case "ONE_HOUR":
            d.setHours(d.getHours() + 1);
            return d;
        case "TOMORROW": {
            d.setDate(d.getDate() + 1);
            d.setHours(9, 0, 0, 0);
            return d;
        }
        case "NEXT_WEEK": {
            d.setDate(d.getDate() + 7);
            d.setHours(9, 0, 0, 0);
            return d;
        }
        default:
            d.setHours(d.getHours() + 1);
            return d;
    }
}
export function isSnoozedActive(metadata, now = new Date()) {
    if (!metadata.snoozedUntil)
        return false;
    return new Date(metadata.snoozedUntil) > now;
}
export function readStatus(isRead, metadata) {
    if (metadata.archivedAt)
        return "ARCHIVED";
    return isRead ? "READ" : "UNREAD";
}
export function matchesCategory(category, shape, isRead, metadata) {
    if (category === "ALL")
        return !metadata.archivedAt;
    if (category === "ARCHIVED")
        return Boolean(metadata.archivedAt);
    if (category === "UNREAD")
        return !isRead && !metadata.archivedAt && !isSnoozedActive(metadata);
    if (metadata.archivedAt)
        return false;
    if (isSnoozedActive(metadata))
        return false;
    if (category === "MESSAGES")
        return shape.category === "MESSAGES";
    if (category === "APPROVALS")
        return shape.category === "APPROVALS";
    if (category === "DOCUMENTS")
        return shape.category === "DOCUMENTS";
    if (category === "INSPECTION")
        return shape.category === "INSPECTION";
    if (category === "SHIPMENT")
        return shape.category === "SHIPMENT";
    if (category === "WORKSPACE")
        return shape.category === "WORKSPACE";
    if (category === "SYSTEM")
        return shape.category === "SYSTEM";
    return true;
}
//# sourceMappingURL=notification-engine.mapper.js.map
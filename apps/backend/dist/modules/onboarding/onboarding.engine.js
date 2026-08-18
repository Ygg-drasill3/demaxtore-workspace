/** Build journey signals from existing workspace data — no FSM modifications. */
export async function buildJourneyContext(db, userId, role) {
    if (role === "BUYER")
        return buildBuyerContext(db, userId);
    if (role === "SUPPLIER")
        return buildSupplierContext(db, userId);
    return buildOperatorContext(db, userId, role);
}
async function buildBuyerContext(db, userId) {
    const rfqs = await db.workspace.count({ where: { type: "RFQ", createdById: userId } });
    const rfqIds = (await db.workspace.findMany({
        where: { type: "RFQ", createdById: userId },
        select: { id: true, state: true },
    })).map((r) => r.id);
    const hasQuotation = rfqIds.length > 0 && (await db.quotation.count({ where: { workspaceId: { in: rfqIds } } })) > 0;
    const selected = rfqIds.length > 0 && (await db.rfqDetails.count({
        where: { workspaceId: { in: rfqIds }, selectedSupplierUserId: { not: null } },
    })) > 0;
    const hasPo = rfqIds.length > 0 && (await db.workspace.count({
        where: { id: { in: rfqIds }, state: { in: ["PO_ISSUED", "CLOSED"] } },
    })) > 0;
    const orders = await db.workspace.count({
        where: { type: "ORDER", createdById: userId },
    });
    const shipments = await db.workspace.count({
        where: {
            type: "SHIPMENT",
            participants: { some: { userId } },
        },
    });
    const delivered = (await db.workspace.count({
        where: {
            type: "SHIPMENT",
            state: { in: ["DELIVERED", "COMPLETED"] },
            participants: { some: { userId } },
        },
    })) > 0;
    return {
        role: "BUYER",
        hasRfq: rfqs > 0,
        hasQuotation,
        hasSupplierSelected: selected,
        hasPoIssued: hasPo,
        hasOrder: orders > 0,
        hasShipment: shipments > 0,
        hasShipmentDelivered: delivered,
        hasInvitation: false,
        hasSubmittedOffer: false,
        hasAcceptedOrder: false,
        hasUploadedDocument: false,
        hasOpenWorkload: false,
        hasVerifiedDocument: false,
        hasReviewedShipment: false,
        hasClosedProcess: false,
    };
}
async function buildSupplierContext(db, userId) {
    const invited = (await db.supplierActivityLog.count({ where: { supplierUserId: userId } })) > 0;
    const quoted = (await db.quotation.count({ where: { supplierUserId: userId } })) > 0;
    const orderParts = await db.workspaceParticipant.count({
        where: { userId, workspace: { type: "ORDER" } },
    });
    const accepted = orderParts > 0 && (await db.workspace.count({
        where: {
            type: "ORDER",
            participants: { some: { userId } },
            state: { not: "ORDER_CREATED" },
        },
    })) > 0;
    const docs = (await db.tradeDocument.count({
        where: { uploadedById: userId },
    })) > 0;
    const delivered = (await db.workspace.count({
        where: {
            type: "SHIPMENT",
            state: { in: ["DELIVERED", "COMPLETED"] },
            participants: { some: { userId } },
        },
    })) > 0;
    return {
        role: "SUPPLIER",
        hasRfq: false,
        hasQuotation: false,
        hasSupplierSelected: false,
        hasPoIssued: false,
        hasOrder: orderParts > 0,
        hasShipment: false,
        hasShipmentDelivered: delivered,
        hasInvitation: invited,
        hasSubmittedOffer: quoted,
        hasAcceptedOrder: accepted,
        hasUploadedDocument: docs,
        hasOpenWorkload: false,
        hasVerifiedDocument: false,
        hasReviewedShipment: false,
        hasClosedProcess: false,
    };
}
async function buildOperatorContext(db, userId, role = "ADMIN") {
    const openRfqs = await db.workspace.count({
        where: { type: "RFQ", state: { in: ["RFQ_SUBMITTED", "RFQ_OPEN"] } },
    });
    const approvedDocs = await db.documentReview.count({
        where: { reviewedById: userId, decision: "APPROVED" },
    });
    const reviewedShipments = await db.workspace.count({
        where: {
            type: "SHIPMENT",
            state: { notIn: ["SHIPMENT_CREATED", "SHIPMENT_CANCELLED"] },
        },
    });
    const closed = await db.workspace.count({
        where: {
            type: "ORDER",
            state: "CLOSED",
        },
    });
    return {
        role,
        hasRfq: false,
        hasQuotation: false,
        hasSupplierSelected: false,
        hasPoIssued: false,
        hasOrder: false,
        hasShipment: false,
        hasShipmentDelivered: false,
        hasInvitation: false,
        hasSubmittedOffer: false,
        hasAcceptedOrder: false,
        hasUploadedDocument: false,
        hasOpenWorkload: openRfqs > 0,
        hasVerifiedDocument: approvedDocs > 0,
        hasReviewedShipment: reviewedShipments > 0,
        hasClosedProcess: closed > 0,
    };
}
export async function buildTradeMilestoneSignals(db, userId, role, existingCtx) {
    const ctx = existingCtx ?? await buildJourneyContext(db, userId, role);
    const hasProduction = role === "BUYER"
        ? (await db.workspace.count({
            where: { type: "ORDER", createdById: userId, state: { not: "ORDER_CREATED" } },
        })) > 0
        : (await db.workspace.count({
            where: { type: "ORDER", participants: { some: { userId } }, state: { not: "ORDER_CREATED" } },
        })) > 0;
    const hasArrival = role === "BUYER"
        ? (await db.workspace.count({
            where: {
                type: "SHIPMENT",
                state: { in: ["ARRIVED_DESTINATION_PORT", "DELIVERED", "COMPLETED"] },
                participants: { some: { userId } },
            },
        })) > 0
        : ctx.hasShipmentDelivered;
    const hasDocuments = ctx.hasUploadedDocument || ((role === "ADMIN" || role === "SALES_CONTROL") && ctx.hasVerifiedDocument);
    return {
        hasRfq: ctx.hasRfq || ctx.hasInvitation,
        hasPo: ctx.hasPoIssued,
        hasProduction,
        hasShipment: ctx.hasShipment || ctx.hasReviewedShipment,
        hasArrival,
        hasDocuments,
        isCompleted: ctx.hasShipmentDelivered || ctx.hasClosedProcess,
    };
}
//# sourceMappingURL=onboarding.engine.js.map
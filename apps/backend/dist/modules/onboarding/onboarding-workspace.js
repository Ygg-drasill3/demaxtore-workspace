import { computeRfqNextActions } from "@dmx/contracts/rfq.next-actions";
import { computeOrderNextActions } from "@dmx/contracts/order.next-actions";
import { computeCommodityBidNextActions } from "@dmx/contracts/commoditybid.next-actions";
import { computeShipmentNextActions } from "@dmx/contracts/shipment.next-actions";
import { commodityBidWorkspaceGuidance } from "@dmx/contracts/commoditybid-learning";
import { NotFound } from "../../lib/errors.js";
/** Workspace guidance — delegates to existing next-action engines (no duplicated logic). */
export async function getWorkspaceGuidance(db, workspaceType, workspaceId, userId, userRole) {
    const ws = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, type: true, state: true, externalRef: true },
    });
    if (!ws)
        throw NotFound("Workspace not found");
    const participant = await db.workspaceParticipant.findFirst({
        where: { workspaceId, userId },
        select: { participantRole: true },
    });
    const isOwner = participant?.participantRole === "OWNER";
    const isCounterparty = participant?.participantRole === "COUNTERPARTY";
    const base = {
        workspaceType,
        workspaceId,
        title: "What happens next",
    };
    if (workspaceType === "rfq" || ws.type === "RFQ") {
        const rfqDetails = await db.rfqDetails.findUnique({
            where: { workspaceId },
            select: { selectedSupplierUserId: true },
        });
        const hasQuote = (await db.quotation.count({ where: { workspaceId, supplierUserId: userId } })) > 0;
        const actions = computeRfqNextActions({
            state: ws.state,
            actorRole: userRole,
            isOwner,
            isCounterparty,
            isSelectedSupplier: rfqDetails?.selectedSupplierUserId === userId,
            hasQuotationFromUser: hasQuote,
        });
        const primary = actions[0];
        return {
            ...base,
            nextLabel: primary?.label ?? "Review workspace",
            nextDescription: primary?.description ?? "Monitor RFQ progress and supplier responses.",
            actionLabel: primary?.label ?? null,
            actionHref: `/workspace/rfq/${workspaceId}`,
        };
    }
    if (workspaceType === "order" || ws.type === "ORDER") {
        const actions = computeOrderNextActions({
            state: ws.state,
            actorRole: userRole,
            isOwner,
            isCounterparty,
        });
        const primary = actions[0];
        return {
            ...base,
            nextLabel: primary?.label ?? "Monitor order",
            nextDescription: primary?.description ?? "Track production and inspection milestones.",
            actionLabel: primary?.label ?? null,
            actionHref: `/workspace/order/${workspaceId}`,
        };
    }
    if (workspaceType === "commoditybid" || ws.type === "COMMODITYBID") {
        const stage = commodityBidWorkspaceGuidance(ws.state);
        const actions = computeCommodityBidNextActions({
            state: ws.state,
            actorRole: userRole,
            isOwner,
            isCounterparty,
        });
        const primary = actions[0];
        return {
            ...base,
            title: "Auction progress",
            nextLabel: stage.headline,
            nextDescription: stage.body,
            actionLabel: primary?.label ?? null,
            actionHref: `/workspace/commoditybid/${workspaceId}`,
        };
    }
    if (workspaceType === "shipment" || ws.type === "SHIPMENT") {
        const actions = computeShipmentNextActions({
            state: ws.state,
            actorRole: userRole,
            isOwner,
            isCounterparty,
        });
        const primary = actions[0];
        return {
            ...base,
            nextLabel: primary?.label ?? "Monitor shipment",
            nextDescription: primary?.description ?? "Track vessel departure and arrival.",
            actionLabel: primary?.label ?? null,
            actionHref: `/workspace/shipment/${workspaceId}`,
        };
    }
    // Trade documents — check compliance
    const missing = await db.tradeDocument.count({
        where: { workspaceId, status: "MISSING" },
    });
    return {
        ...base,
        nextLabel: missing > 0 ? "Upload missing documents" : "Documents complete",
        nextDescription: missing > 0
            ? `${missing} required document(s) still missing.`
            : "All required trade documents are on file.",
        actionLabel: missing > 0 ? "View documents" : null,
        actionHref: `/workspace/order/${workspaceId}`,
    };
}
export async function guidanceHandler(req, res, db) {
    const { workspaceType, workspaceId } = req.params;
    const user = req.user;
    const guidance = await getWorkspaceGuidance(db, workspaceType, workspaceId, user.id, user.role);
    res.json(guidance);
}
//# sourceMappingURL=onboarding-workspace.js.map
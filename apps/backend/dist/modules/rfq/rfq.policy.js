import { hasPortfolioVisibility } from "../../lib/staff-roles.js";
export async function canAccessRfq(prisma, user, workspaceId) {
    if (hasPortfolioVisibility(user.role))
        return true;
    const participation = await prisma.workspaceParticipant.findFirst({
        where: { workspaceId, userId: user.id },
        select: { id: true, participantRole: true },
    });
    if (!participation)
        return false;
    // SUPPLIER only sees RFQs once they're published (state ∈ list)
    if (user.role === "SUPPLIER") {
        const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { state: true } });
        if (!ws)
            return false;
        return SUPPLIER_VISIBLE_STATES.has(ws.state);
    }
    return true;
}
const SUPPLIER_VISIBLE_STATES = new Set([
    // Visible after admin assign_suppliers, before publish_rfq (demo + ops flow)
    "SUPPLIERS_ASSIGNED",
    "RFQ_OPEN", "QUOTATIONS_CLOSED", "UNDER_EVALUATION",
    "PARTIALLY_AWARDED", "FULLY_AWARDED",
    "SUPPLIER_SELECTED",
    "PROFORMA_REQUESTED", "PROFORMA_RECEIVED", "PROFORMA_APPROVED",
    "PO_ISSUED", "CLOSED",
    // Terminal states still visible so suppliers see history of their participation:
    "CANCELLED", "EXPIRED", "CLOSED_NO_AWARD",
]);
/** Convenience: assert + throw (use in service-layer when access required). */
export async function assertCanAccessRfq(prisma, user, workspaceId) {
    const ok = await canAccessRfq(prisma, user, workspaceId);
    if (!ok) {
        const err = new Error("FORBIDDEN");
        err.status = 403;
        throw err;
    }
}
//# sourceMappingURL=rfq.policy.js.map
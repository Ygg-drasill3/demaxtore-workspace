const SUPPLIER_VISIBLE_STATES = new Set([
    "SCHEDULED", "INVITING_SUPPLIERS", "READY_TO_START", "LIVE", "CLOSED",
    "WINNER_IDENTIFIED", "AWAITING_BUYER_APPROVAL", "APPROVED", "ORDERS_SPAWNED",
    "REJECTED", "CANCELLED", "EXPIRED", "CLOSED_NO_AWARD",
]);
export async function canAccessCommodityBid(prisma, user, workspaceId) {
    if (user.role === "ADMIN")
        return true;
    const participation = await prisma.workspaceParticipant.findFirst({
        where: { workspaceId, userId: user.id },
        select: { id: true },
    });
    if (!participation)
        return false;
    if (user.role === "SUPPLIER") {
        const ws = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { state: true, type: true },
        });
        if (!ws || ws.type !== "COMMODITYBID")
            return false;
        return SUPPLIER_VISIBLE_STATES.has(ws.state);
    }
    return true;
}
/** Buyer/admin may view anonymous comparison; suppliers never. */
export function canViewAnonymousComparison(user) {
    return user.role === "BUYER" || user.role === "ADMIN";
}
/** Only admin resolves bidder code ↔ supplier identity. */
export function canViewSupplierIdentity(user) {
    return user.role === "ADMIN";
}
//# sourceMappingURL=commoditybid.policy.js.map
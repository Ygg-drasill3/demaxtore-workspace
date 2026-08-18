import { canAccessOrder } from "../order/order.policy.js";
import { canAccessShipment } from "../shipment/shipment.policy.js";
async function partnerAssignedToShipment(prisma, userId, shipmentWorkspaceId, partnerRole) {
    const row = await prisma.partnerAssignment.findFirst({
        where: {
            workspaceId: shipmentWorkspaceId,
            userId,
            partnerRole,
            revokedAt: null,
        },
        select: { id: true },
    });
    return !!row;
}
/** Sprint 39 broker + Sprint 43 trucker POD access to trade docs workspaces. */
export async function canAccessTradeWorkspace(prisma, user, workspaceType, workspaceId) {
    const base = workspaceType === "ORDER"
        ? await canAccessOrder(prisma, user, workspaceId)
        : await canAccessShipment(prisma, user, workspaceId);
    if (base)
        return true;
    const role = String(user.role);
    if (role !== "CUSTOMS_BROKER" && role !== "TRUCKER")
        return false;
    const partnerRole = role === "TRUCKER" ? "TRUCKER" : "CUSTOMS_BROKER";
    if (workspaceType === "SHIPMENT") {
        return partnerAssignedToShipment(prisma, user.id, workspaceId, partnerRole);
    }
    const ships = await prisma.shipmentWorkspace.findMany({
        where: { orderWorkspaceId: workspaceId },
        select: { workspaceId: true },
        take: 40,
    });
    for (const s of ships) {
        if (await partnerAssignedToShipment(prisma, user.id, s.workspaceId, partnerRole)) {
            return true;
        }
    }
    return false;
}
export function assertDocumentActionRole(action, role) {
    const rules = {
        request_document: ["ADMIN", "BUYER", "CUSTOMS_BROKER"],
        // TRUCKER may upload only PROOF_OF_DELIVERY (enforced in upload route / service).
        upload_document: ["ADMIN", "SUPPLIER", "BUYER", "CUSTOMS_BROKER", "TRUCKER"],
        review_document: ["ADMIN", "CUSTOMS_BROKER"],
        approve_document: ["ADMIN", "BUYER"],
        reject_document: ["ADMIN", "BUYER", "CUSTOMS_BROKER"],
        expire_document: ["ADMIN"],
    };
    if (!rules[action].includes(role))
        throw new Error("FORBIDDEN_ROLE");
}
/** Trucker uploads are limited to POD evidence. */
export function assertTruckerUploadDocumentType(role, documentType) {
    if (String(role) === "TRUCKER" && documentType !== "PROOF_OF_DELIVERY") {
        throw new Error("TRUCKER_POD_ONLY");
    }
}
//# sourceMappingURL=documents.policy.js.map
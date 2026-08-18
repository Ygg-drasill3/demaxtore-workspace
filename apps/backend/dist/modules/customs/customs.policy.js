import { AppError } from "../../utils/httpErrors.js";
import { isPartnerRole, resolvePartnerRole } from "@dmx/contracts/partner-workspace";
import { canAccessShipment } from "../shipment/shipment.policy.js";
const BUYER_MANAGERS = new Set(["BUYER", "ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR", "DOCUMENT_CONTROLLER"]);
export function canManageCustomsAsBuyer(user) {
    return BUYER_MANAGERS.has(String(user.role));
}
export function isCustomsDeniedRole(user) {
    const r = String(user.role);
    return r === "SUPPLIER" || r === "ORIGIN_AGENT" || r === "TRUCKER" || r === "FORWARDER";
}
export async function resolveActorOrganisationId(prisma, user) {
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN")
        return null;
    const row = await prisma.user.findUnique({
        where: { id: user.id },
        select: { organisationId: true },
    });
    return row?.organisationId ?? null;
}
/** Buyer/ops: shipment participant or admin. Broker: active CUSTOMS_BROKER assignment only. */
export async function assertCustomsCaseAccess(prisma, user, caseRow) {
    if (isCustomsDeniedRole(user)) {
        throw new AppError(403, "CUSTOMS_FORBIDDEN");
    }
    const role = String(user.role);
    if (role === "CUSTOMS_BROKER" || resolvePartnerRole(user) === "CUSTOMS_BROKER") {
        const assignment = await prisma.partnerAssignment.findFirst({
            where: {
                workspaceId: caseRow.shipmentWorkspaceId,
                userId: user.id,
                partnerRole: "CUSTOMS_BROKER",
                revokedAt: null,
            },
            select: { id: true },
        });
        if (!assignment)
            throw new AppError(403, "PARTNER_NOT_ASSIGNED");
        return "BROKER";
    }
    if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "OPS_MANAGER" || role === "LOGISTICS_OPERATOR") {
        return "OPS";
    }
    if (!canManageCustomsAsBuyer(user)) {
        throw new AppError(403, "CUSTOMS_FORBIDDEN");
    }
    const orgId = await resolveActorOrganisationId(prisma, user);
    if (orgId && orgId !== caseRow.organisationId) {
        throw new AppError(403, "CUSTOMS_FORBIDDEN");
    }
    const ok = await canAccessShipment(prisma, user, caseRow.shipmentWorkspaceId);
    if (!ok)
        throw new AppError(403, "CUSTOMS_FORBIDDEN");
    return "BUYER";
}
export function assertNotPartnerBrowsingCustomsList(user) {
    if (isPartnerRole(String(user.role)) && String(user.role) === "CUSTOMS_BROKER") {
        // Brokers use partner home / assigned case get — not the buyer list.
        throw new AppError(403, "CUSTOMS_FORBIDDEN");
    }
    if (isCustomsDeniedRole(user)) {
        throw new AppError(403, "CUSTOMS_FORBIDDEN");
    }
}
export function assertBuyerCustomsListAccess(user) {
    if (String(user.role) === "CUSTOMS_BROKER" || isCustomsDeniedRole(user)) {
        throw new AppError(403, "CUSTOMS_FORBIDDEN");
    }
    if (!canManageCustomsAsBuyer(user)) {
        throw new AppError(403, "CUSTOMS_FORBIDDEN");
    }
}
//# sourceMappingURL=customs.policy.js.map
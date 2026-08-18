import { computeComplianceFromRows } from "./compliance-engine.js";
export async function getComplianceStatus(db, workspaceType, workspaceId) {
    const requirements = await db.documentRequirement.findMany({
        where: { workspaceType, workspaceId },
    });
    const documents = await db.tradeDocument.findMany({
        where: { workspaceType, workspaceId },
    });
    return computeComplianceFromRows(requirements, documents);
}
export async function assertShipmentCompletionAllowed(db, shipmentId, actor, payload) {
    const compliance = await getComplianceStatus(db, "SHIPMENT", shipmentId);
    if (compliance.requiredCount === 0)
        return;
    if (compliance.status === "READY_FOR_SHIPMENT")
        return;
    if (actor.role === "ADMIN" && payload.complianceOverride === true)
        return;
    const { AppError } = await import("../../utils/httpErrors.js");
    throw new AppError(409, "COMPLIANCE_NOT_READY", {
        status: compliance.status,
        missingTypes: compliance.missingTypes,
    });
}
export function complianceAuditStatus(status) {
    if (status === "READY_FOR_SHIPMENT")
        return "compliance.ready";
    return null;
}
//# sourceMappingURL=compliance.js.map
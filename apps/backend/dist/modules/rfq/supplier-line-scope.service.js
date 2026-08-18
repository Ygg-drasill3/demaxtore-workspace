import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/httpErrors.js";
export function supplierIdsFromAssignPayload(payload) {
    const assignments = payload.assignments;
    if (assignments?.length)
        return assignments.map((a) => a.supplierUserId);
    return payload.supplierUserIds ?? [];
}
export function normalizeSupplierAssignments(payload, allLineIds) {
    const assignments = payload.assignments;
    if (assignments?.length)
        return assignments;
    const supplierUserIds = payload.supplierUserIds ?? [];
    return supplierUserIds.map((supplierUserId) => ({
        supplierUserId,
        rfqLineItemIds: [...allLineIds],
    }));
}
/** null = no scopes configured → supplier may quote all lines (legacy). */
export async function getAllowedQuoteLineIds(workspaceId, supplierUserId) {
    const rows = await prisma.supplierLineScope.findMany({
        where: { workspaceId, supplierUserId },
        select: { rfqLineItemId: true },
    });
    if (!rows.length)
        return null;
    return rows.map((r) => r.rfqLineItemId);
}
export async function replaceSupplierLineScopes(tx, workspaceId, supplierUserId, rfqLineItemIds, allLineIds) {
    await tx.supplierLineScope.deleteMany({ where: { workspaceId, supplierUserId } });
    const unique = [...new Set(rfqLineItemIds)];
    if (!unique.length)
        return;
    // Full access — keep table empty so getAllowedQuoteLineIds returns null.
    if (allLineIds.length > 0 && unique.length >= allLineIds.length)
        return;
    await tx.supplierLineScope.createMany({
        data: unique.map((rfqLineItemId) => ({
            workspaceId,
            supplierUserId,
            rfqLineItemId,
        })),
    });
}
export async function assertSupplierQuoteLinesAllowed(workspaceId, supplierUserId, payload) {
    const allowed = await getAllowedQuoteLineIds(workspaceId, supplierUserId);
    if (!allowed)
        return;
    const allowedSet = new Set(allowed);
    const soleAllowed = allowed.length === 1 ? allowed[0] : null;
    for (const li of payload.lineItems) {
        const rfqLineItemId = li.rfqLineItemId ?? soleAllowed;
        if (!rfqLineItemId) {
            throw new AppError(403, "QUOTE_LINE_NOT_ALLOWED", { line: li.description });
        }
        if (!allowedSet.has(rfqLineItemId)) {
            throw new AppError(403, "QUOTE_LINE_NOT_ALLOWED", { rfqLineItemId });
        }
    }
}
export function assertAssignPayloadLineItems(assignments, allLineIds) {
    const valid = new Set(allLineIds);
    for (const a of assignments) {
        if (!a.rfqLineItemIds.length) {
            throw new AppError(400, "RFQ_ASSIGN_NO_PRODUCTS", { supplierUserId: a.supplierUserId });
        }
        const bad = a.rfqLineItemIds.filter((id) => !valid.has(id));
        if (bad.length)
            throw new AppError(400, "RFQ_INVALID_LINE_ITEM", { bad });
    }
}
//# sourceMappingURL=supplier-line-scope.service.js.map
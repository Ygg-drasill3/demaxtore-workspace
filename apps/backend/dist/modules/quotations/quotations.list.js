import { prisma } from "../../db/prisma.js";
import { canAccessRfq } from "../rfq/rfq.policy.js";
import { AppError } from "../../utils/httpErrors.js";
function unitPriceAvgFromLines(lineItems, stored) {
    if (stored != null)
        return Number(stored);
    if (!lineItems.length)
        return null;
    let qty = 0;
    let value = 0;
    for (const li of lineItems) {
        const q = Number(li.quantity);
        const p = Number(li.unitPrice);
        qty += q;
        value += q * p;
    }
    return qty > 0 ? value / qty : null;
}
function toRow(q, supplier) {
    const unitPriceAvg = unitPriceAvgFromLines(q.lineItems, q.unitPriceAvg ? Number(q.unitPriceAvg) : null);
    const status = q.withdrawnAt ? "WITHDRAWN" : q.status === "REVISED" ? "REVISED" : "SUBMITTED";
    return {
        id: q.id,
        supplierId: q.supplierUserId,
        supplierName: supplier.organisation?.name ?? supplier.displayName ?? "Supplier",
        total: Number(q.total),
        currency: q.currency,
        unitPriceAvg,
        leadTimeDays: q.leadTimeDays,
        moq: q.moq,
        incoterm: q.incoterm,
        paymentTerms: q.paymentTerms,
        sampleAvail: q.sampleAvail,
        validUntil: q.validUntil?.toISOString() ?? null,
        status,
        submittedAt: q.submittedAt.toISOString(),
        lineItems: q.lineItems.map((li) => ({
            id: li.id,
            rfqLineItemId: li.rfqLineItemId ?? null,
            position: li.position,
            description: li.description,
            quantity: Number(li.quantity),
            unitPrice: Number(li.unitPrice),
            total: Number(li.total),
        })),
    };
}
export async function listQuotationsForWorkspace(workspaceId, actor) {
    if (!(await canAccessRfq(prisma, actor, workspaceId))) {
        throw new AppError(403, "FORBIDDEN");
    }
    const rows = await prisma.quotation.findMany({
        where: {
            workspaceId,
            ...(actor.role === "SUPPLIER" ? { supplierUserId: actor.id } : { withdrawnAt: null }),
        },
        orderBy: [{ submittedAt: "asc" }, { supplierUserId: "asc" }],
        include: { lineItems: { orderBy: { position: "asc" } } },
    });
    const supplierIds = [...new Set(rows.map((r) => r.supplierUserId))];
    const suppliers = await prisma.user.findMany({
        where: { id: { in: supplierIds } },
        select: {
            id: true,
            displayName: true,
            organisation: { select: { name: true } },
        },
    });
    const byId = new Map(suppliers.map((s) => [s.id, s]));
    return rows.map((q) => {
        const s = byId.get(q.supplierUserId);
        return toRow(q, s ?? { id: q.supplierUserId, displayName: "Supplier", organisation: null });
    });
}
//# sourceMappingURL=quotations.list.js.map
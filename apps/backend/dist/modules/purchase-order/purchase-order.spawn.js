import { canonicalizePurchaseOrderSource, } from "@dmx/contracts/purchase-order";
/** Creates ISSUED PO + lines + revision 1 when an order workspace is spawned (additive). */
export async function createPurchaseOrderOnOrderSpawn(tx, input) {
    const existing = await tx.purchaseOrder.findUnique({ where: { orderId: input.orderId } });
    if (existing)
        return existing.id;
    const now = new Date();
    const po = await tx.purchaseOrder.create({
        data: {
            orderId: input.orderId,
            poNumber: input.poNumber,
            buyerId: input.buyerId,
            supplierId: input.supplierId,
            currency: input.currency,
            incoterm: input.incoterm ?? null,
            paymentTerms: input.paymentTerms ?? null,
            deliveryTerms: input.deliveryTerms ?? null,
            status: "ISSUED",
            source: canonicalizePurchaseOrderSource(input.source),
            documentUrl: input.documentUrl ?? null,
            documentFileName: input.documentFileName ?? null,
            issuedAt: now,
        },
    });
    const lineRows = [];
    for (const l of input.lines) {
        const qty = l.quantity;
        const price = l.unitPrice;
        const row = await tx.purchaseOrderLine.create({
            data: {
                purchaseOrderId: po.id,
                sku: l.sku ?? null,
                description: l.description,
                quantity: qty,
                unitPrice: price,
                lineTotal: qty * price,
            },
        });
        lineRows.push(row);
    }
    const snapshot = buildSnapshot(po, lineRows);
    await tx.purchaseOrderRevision.create({
        data: {
            purchaseOrderId: po.id,
            revisionNumber: 1,
            createdById: input.actorUserId,
            reason: input.issueReason ?? "Initial PO issuance",
            snapshotJson: snapshot,
        },
    });
    await tx.purchaseOrderAcknowledgement.create({
        data: {
            purchaseOrderId: po.id,
            supplierUserId: input.supplierId,
            status: "PENDING",
        },
    });
    await tx.timelineEvent.create({
        data: {
            workspaceId: input.orderId,
            eventType: "po.issued",
            actorUserId: input.actorUserId,
            payload: { poId: po.id, poNumber: input.poNumber },
        },
    });
    await tx.auditLog.create({
        data: {
            workspaceId: input.orderId,
            actorUserId: input.actorUserId,
            actorEmail: input.actorEmail,
            actorRole: input.actorRole,
            action: "po.issued",
            fromState: "ORDER_CREATED",
            toState: "ORDER_CREATED",
            payload: { poId: po.id, poNumber: input.poNumber },
        },
    });
    return po.id;
}
function buildSnapshot(po, lines) {
    return {
        header: {
            poNumber: po.poNumber,
            currency: po.currency,
            incoterm: po.incoterm,
            paymentTerms: po.paymentTerms,
            deliveryTerms: po.deliveryTerms,
            status: po.status,
        },
        lines: lines.map((l) => ({
            sku: l.sku,
            description: l.description,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            lineTotal: Number(l.lineTotal),
        })),
    };
}
//# sourceMappingURL=purchase-order.spawn.js.map
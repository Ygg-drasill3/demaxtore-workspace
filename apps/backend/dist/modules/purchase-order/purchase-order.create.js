import { PurchaseOrderSourceSchema } from "@dmx/contracts/purchase-order.zod";
import { AppError } from "../../utils/httpErrors.js";
import { generatePoNumber } from "../../utils/po-number.js";
/**
 * Domain-level Purchase Order persistence (Sprint 27).
 * Must run inside a Prisma transaction provided by the caller.
 */
export async function createPurchaseOrderForOrderTx(tx, input) {
    let source;
    {
        const raw = String(input.source ?? "").trim();
        const upper = raw.toUpperCase();
        const aliases = {
            AUTO: "RFQ",
            RFQ: "RFQ",
            MANUAL: "DIRECT",
            DIRECT: "DIRECT",
            REORDER: "REORDER",
            API: "API",
            LEGACY: "LEGACY",
            COMMODITY_BID: "COMMODITY_BID",
            COMMODITYBID: "COMMODITY_BID",
        };
        const candidate = aliases[upper];
        const parsed = PurchaseOrderSourceSchema.safeParse(candidate);
        if (!parsed.success) {
            throw new AppError(400, "INVALID_PURCHASE_ORDER_SOURCE", { source: input.source });
        }
        source = parsed.data;
    }
    if (!input.lines?.length) {
        throw new AppError(400, "INVALID_PURCHASE_ORDER_LINES");
    }
    for (const line of input.lines) {
        if (!line.description?.trim() || !(line.quantity > 0) || !(line.unitPrice >= 0)) {
            throw new AppError(400, "INVALID_PURCHASE_ORDER_LINES");
        }
    }
    const orderWs = await tx.workspace.findUnique({
        where: { id: input.orderId },
        select: { id: true, type: true, state: true },
    });
    if (!orderWs || orderWs.type !== "ORDER") {
        throw new AppError(404, "ORDER_NOT_FOUND");
    }
    const [buyer, supplier] = await Promise.all([
        tx.user.findUnique({ where: { id: input.buyerId }, select: { id: true } }),
        tx.user.findUnique({ where: { id: input.supplierId }, select: { id: true } }),
    ]);
    if (!buyer)
        throw new AppError(404, "BUYER_NOT_FOUND");
    if (!supplier)
        throw new AppError(404, "SUPPLIER_NOT_FOUND");
    if (input.organizationWorkspaceId) {
        const orgWs = await tx.workspace.findUnique({
            where: { id: input.organizationWorkspaceId },
            select: { id: true },
        });
        if (!orgWs)
            throw new AppError(400, "ORGANIZATION_MISMATCH");
    }
    const existing = await tx.purchaseOrder.findUnique({ where: { orderId: input.orderId } });
    if (existing) {
        throw new AppError(409, "PURCHASE_ORDER_ALREADY_EXISTS", {
            purchaseOrderId: existing.id,
            orderId: input.orderId,
        });
    }
    const poNumber = (input.poNumber?.trim() || generatePoNumber()).slice(0, 64);
    const status = input.status === "DRAFT" ? "DRAFT" : "SUBMITTED";
    const now = input.issuedAt ?? (status === "SUBMITTED" ? new Date() : null);
    try {
        const po = await tx.purchaseOrder.create({
            data: {
                orderId: input.orderId,
                organizationWorkspaceId: input.organizationWorkspaceId ?? null,
                poNumber,
                buyerId: input.buyerId,
                supplierId: input.supplierId,
                currency: input.currency.toUpperCase(),
                incoterm: input.incoterm ?? null,
                paymentTerms: input.paymentTerms ?? null,
                deliveryTerms: input.deliveryTerms ?? null,
                status,
                source,
                version: 1,
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
                    description: l.description.trim(),
                    quantity: qty,
                    unitPrice: price,
                    lineTotal: qty * price,
                    rfqLineItemId: l.rfqLineItemId ?? null,
                    quotationLineId: l.quotationLineId ?? null,
                    productId: l.productId ?? null,
                },
            });
            lineRows.push(row);
        }
        const snapshot = {
            header: {
                poNumber: po.poNumber,
                currency: po.currency,
                incoterm: po.incoterm,
                paymentTerms: po.paymentTerms,
                deliveryTerms: po.deliveryTerms,
                status: po.status,
                source,
                ...(input.revisionMetadata ?? {}),
            },
            lines: lineRows.map((l) => ({
                sku: l.sku,
                description: l.description,
                quantity: Number(l.quantity),
                unitPrice: Number(l.unitPrice),
                lineTotal: Number(l.lineTotal),
            })),
        };
        await tx.purchaseOrderRevision.create({
            data: {
                purchaseOrderId: po.id,
                revisionNumber: 1,
                createdById: input.actorUserId,
                reason: input.issueReason ?? "Initial PO issuance",
                snapshotJson: snapshot,
            },
        });
        if (!input.skipPendingAcknowledgement && status !== "DRAFT") {
            await tx.purchaseOrderAcknowledgement.create({
                data: {
                    purchaseOrderId: po.id,
                    supplierUserId: input.supplierId,
                    status: "PENDING",
                },
            });
        }
        await tx.timelineEvent.create({
            data: {
                workspaceId: input.orderId,
                eventType: "po.created",
                actorUserId: input.actorUserId,
                payload: { poId: po.id, poNumber, source, status },
            },
        });
        if (status === "SUBMITTED") {
            await tx.timelineEvent.create({
                data: {
                    workspaceId: input.orderId,
                    eventType: "po.submitted",
                    actorUserId: input.actorUserId,
                    payload: { poId: po.id, poNumber, source },
                },
            });
        }
        if (input.organizationWorkspaceId) {
            const { bridgeModuleEventToOrganization, bindOrganizationToPurchaseOrder } = await import("../mixed-container/mc-organization-sync.service.js");
            await bindOrganizationToPurchaseOrder(tx, po.id, input.organizationWorkspaceId);
            await bridgeModuleEventToOrganization(tx, {
                organizationWorkspaceId: input.organizationWorkspaceId,
                sourceModule: "PURCHASE_ORDERS",
                sourceEventType: status === "SUBMITTED" ? "po.submitted" : "po.created",
                sourceEntityId: po.id,
                actorUserId: input.actorUserId,
                payload: { poId: po.id, poNumber, orderId: input.orderId, source, status },
            });
        }
        await tx.auditLog.create({
            data: {
                workspaceId: input.orderId,
                actorUserId: input.actorUserId,
                actorEmail: input.actorEmail,
                actorRole: input.actorRole,
                action: status === "SUBMITTED" ? "po.submitted" : "po.created",
                fromState: "NONE",
                toState: status,
                payload: {
                    poId: po.id,
                    poNumber,
                    source,
                    oldValue: null,
                    newValue: { status, poNumber, source },
                    changedFields: ["status", "poNumber", "source", "lines"],
                },
            },
        });
        return po.id;
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        const code = err?.code;
        if (code === "P2002") {
            throw new AppError(409, "PURCHASE_ORDER_ALREADY_EXISTS");
        }
        throw new AppError(500, "PURCHASE_ORDER_CREATION_FAILED", {
            message: err instanceof Error ? err.message : "unknown",
        });
    }
}
//# sourceMappingURL=purchase-order.create.js.map
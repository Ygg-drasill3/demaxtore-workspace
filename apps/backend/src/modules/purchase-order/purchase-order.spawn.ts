import type { Prisma } from "@prisma/client";

export interface PoSpawnLine {
  sku?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePoOnOrderSpawnInput {
  orderId: string;
  poNumber: string;
  buyerId: string;
  supplierId: string;
  currency: string;
  incoterm?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  lines: PoSpawnLine[];
  actorUserId: string;
  actorEmail: string;
  actorRole: string;
  issueReason?: string;
  source?: "auto" | "manual";
  documentUrl?: string | null;
  documentFileName?: string | null;
}

/** Creates ISSUED PO + lines + revision 1 when an order workspace is spawned (additive). */
export async function createPurchaseOrderOnOrderSpawn(
  tx: Prisma.TransactionClient,
  input: CreatePoOnOrderSpawnInput,
): Promise<string> {
  const existing = await tx.purchaseOrder.findUnique({ where: { orderId: input.orderId } });
  if (existing) return existing.id;

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
      source: input.source ?? "auto",
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
      snapshotJson: snapshot as Prisma.InputJsonValue,
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
      payload: { poId: po.id, poNumber: input.poNumber } as Prisma.InputJsonValue,
    },
  });

  return po.id;
}

function buildSnapshot(
  po: { id: string; poNumber: string; currency: string; incoterm: string | null; paymentTerms: string | null; deliveryTerms: string | null; status: string },
  lines: Array<{ sku: string | null; description: string; quantity: Prisma.Decimal; unitPrice: Prisma.Decimal; lineTotal: Prisma.Decimal }>,
) {
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

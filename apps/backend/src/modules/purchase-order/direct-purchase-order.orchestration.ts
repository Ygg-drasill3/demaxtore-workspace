/**
 * Sprint 27 — internal Direct Purchase Order orchestration.
 * Sprint 28 — extended for public API (poNumberMode, documents, revision metadata).
 */
import type { PrismaClient } from "@prisma/client";
import {
  CreateDirectPurchaseOrderSchema,
  composeDirectPoLineDescription,
  type CreateDirectPurchaseOrderInput,
} from "@dmx/contracts/purchase-order.zod";
import { AppError } from "../../utils/httpErrors.js";
import { generatePoNumber } from "../../utils/po-number.js";
import { spawnOrderWorkspace } from "../order/order.spawn.js";
import { createPurchaseOrderForOrderTx } from "./purchase-order.create.js";
import { PurchaseOrderService } from "./purchase-order.service.js";
import type { AuthUser } from "./purchase-order.policy.js";
import { createProductMasterService } from "../product-master/product-master.service.js";

export interface DirectPurchaseOrderResult {
  orderWorkspaceId: string;
  orderExternalRef: string;
  purchaseOrderId: string;
  poNumber: string;
  source: "DIRECT";
  origin: "DIRECT_PO";
}

function resolvePoNumber(input: CreateDirectPurchaseOrderInput): string {
  if (input.poNumberMode === "CUSTOM" && input.poNumber?.trim()) {
    return input.poNumber.trim().slice(0, 100);
  }
  return generatePoNumber();
}

function directPoLineSku(line: CreateDirectPurchaseOrderInput["lines"][number]): string {
  return line.productCode?.trim() || line.sku?.trim() || line.unit;
}

export async function createDirectPurchaseOrderWorkspace(
  db: PrismaClient,
  rawInput: CreateDirectPurchaseOrderInput,
  actor: AuthUser,
): Promise<DirectPurchaseOrderResult> {
  const input = CreateDirectPurchaseOrderSchema.parse(rawInput);

  if (
    actor.role !== "ADMIN" &&
    actor.role !== "SUPER_ADMIN" &&
    actor.id !== input.buyerId
  ) {
    throw new AppError(403, "WORKSPACE_ACCESS_DENIED");
  }

  const [buyer, supplier] = await Promise.all([
    db.user.findUnique({ where: { id: input.buyerId }, select: { id: true, role: true } }),
    db.user.findUnique({ where: { id: input.supplierId }, select: { id: true, role: true } }),
  ]);
  if (!buyer) throw new AppError(404, "BUYER_NOT_FOUND");
  if (buyer.role !== "BUYER" && actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
    throw new AppError(403, "BUYER_CONTEXT_REQUIRED");
  }
  if (!supplier || supplier.role !== "SUPPLIER") {
    throw new AppError(404, "SUPPLIER_NOT_FOUND");
  }

  if (input.organizationWorkspaceId) {
    const org = await db.workspace.findUnique({
      where: { id: input.organizationWorkspaceId },
      select: { id: true, type: true },
    });
    if (!org) throw new AppError(400, "ORGANIZATION_MISMATCH");
  }

  const poNumber = resolvePoNumber(input);
  const totalValue = input.lines.reduce(
    (sum, l) => sum + l.quantity * (l.unitPrice ?? 0),
    0,
  );

  const revisionMetadata: Record<string, unknown> = {};
  if (input.expectedDeliveryDate) revisionMetadata.expectedDeliveryDate = input.expectedDeliveryDate;
  if (input.destinationCountryCode) revisionMetadata.destinationCountryCode = input.destinationCountryCode;
  if (input.buyerReference) revisionMetadata.buyerReference = input.buyerReference;
  if (input.notes) revisionMetadata.notes = input.notes;

  // Sprint 36B — resolve Product Master refs before PO create (tenant-safe)
  const buyerUser = await db.user.findUnique({
    where: { id: input.buyerId },
    select: { organisationId: true },
  });
  const productSvc = createProductMasterService(db);
  const resolvedProductIds: Array<string | null> = [];
  for (const line of input.lines) {
    let productId = line.productId ?? null;
    if (line.quickCreateProduct) {
      if (!buyerUser?.organisationId) throw new AppError(400, "ORGANISATION_REQUIRED");
      productId = await productSvc.quickCreateOrGet(
        actor,
        buyerUser.organisationId,
        {
          sku: line.quickCreateProduct.sku,
          name: line.quickCreateProduct.name ?? line.productName,
          unitOfMeasure: line.quickCreateProduct.unitOfMeasure ?? line.unit,
          countryOfOrigin: line.quickCreateProduct.countryOfOrigin ?? null,
          supplierSku: line.quickCreateProduct.supplierSku ?? null,
          description: line.quickCreateProduct.description ?? line.description ?? null,
        },
        input.supplierId,
      );
    } else if (productId) {
      await productSvc.assertProductForBuyerOrg(productId, buyerUser?.organisationId ?? null);
    }
    resolvedProductIds.push(productId);
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const spawned = await spawnOrderWorkspace(tx, {
        parentWorkspaceId: input.organizationWorkspaceId ?? null,
        parentType: "DIRECT_PO",
        parentExternalRef: `DIR-${poNumber}`,
        buyerUserId: input.buyerId,
        supplierUserId: input.supplierId,
        contractRef: poNumber,
        currency: input.currency,
        totalValue,
        incoterms: input.incoterm ?? "FOB",
        originPort: input.originPort ?? "CNSHA",
        destinationPort: input.destinationPort ?? "NLRTM",
        actorUserId: actor.id,
        auditEvent: "ORDER_WORKSPACE_CREATED",
        origin: "DIRECT_PO",
        orderRefSuffix: poNumber.slice(-8),
        timelinePayload: {
          source: "DIRECT",
          poNumber,
          ...(Object.keys(revisionMetadata).length ? { commercial: revisionMetadata } : {}),
        },
      });

      const poId = await createPurchaseOrderForOrderTx(tx, {
        orderId: spawned.orderWorkspaceId,
        organizationWorkspaceId: input.organizationWorkspaceId ?? null,
        buyerId: input.buyerId,
        supplierId: input.supplierId,
        currency: input.currency,
        incoterm: input.incoterm ?? null,
        paymentTerms: input.paymentTerms ?? null,
        deliveryTerms: input.deliveryTerms ?? null,
        source: "DIRECT",
        poNumber,
        status: "SUBMITTED",
        documentUrl: input.documentUrl ?? null,
        documentFileName: input.documentFileName ?? null,
        lines: input.lines.map((l, i) => ({
          sku: directPoLineSku(l),
          description: composeDirectPoLineDescription(l),
          quantity: l.quantity,
          unitPrice: l.unitPrice ?? 0,
          productId: resolvedProductIds[i] ?? null,
        })),
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        issueReason: "Direct Purchase Order entry",
        revisionMetadata: {
          ...(Object.keys(revisionMetadata).length ? revisionMetadata : {}),
          destinationPort: input.destinationPort ?? null,
          directLines: input.lines.map((l, i) => ({
            productName: l.productName,
            productCode: l.productCode ?? null,
            description: l.description ?? null,
            specification: l.specification ?? null,
            packaging: l.packaging ?? null,
            unit: l.unit,
            quantity: l.quantity,
            unitPrice: l.unitPrice ?? null,
            productId: resolvedProductIds[i] ?? null,
          })),
        },
      });

      return {
        orderWorkspaceId: spawned.orderWorkspaceId,
        orderExternalRef: spawned.externalRef,
        purchaseOrderId: poId,
        poNumber,
        source: "DIRECT" as const,
        origin: "DIRECT_PO" as const,
      };
    });

    return result;
  } catch (err) {
    if (err instanceof AppError) throw err;
    const code = (err as { code?: string })?.code;
    if (code === "P2002") throw new AppError(409, "PURCHASE_ORDER_NUMBER_ALREADY_EXISTS");
    throw new AppError(500, "PURCHASE_ORDER_CREATION_FAILED");
  }
}

/** Convenience for tests — returns full PO summary after direct create. */
export async function createDirectPurchaseOrderWorkspaceWithSummary(
  db: PrismaClient,
  rawInput: CreateDirectPurchaseOrderInput,
  actor: AuthUser,
) {
  const created = await createDirectPurchaseOrderWorkspace(db, rawInput, actor);
  const service = new PurchaseOrderService(db);
  const summary = await service.getSummary(created.purchaseOrderId);
  return { ...created, summary };
}

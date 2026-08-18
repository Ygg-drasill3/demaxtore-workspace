import type { Prisma } from "@prisma/client";
import {
  canonicalizeOrderWorkspaceOrigin,
  type OrderWorkspaceOrigin,
} from "@dmx/contracts/purchase-order";
import { addBusinessDays } from "./order.util.js";

/** A Direct PO has no parent workspace, so the spawn type doubles as the origin. */
export type SpawnParentType =
  | "RFQ"
  | "COMMODITYBID"
  | "MIXED_CONTAINER"
  | "BULK_CONTAINER"
  | "DIRECT_PO";

/**
 * Lineage origin for a spawned order. Delegates to the shared canonicaliser so the
 * spawn path and the PO-source path cannot drift apart; container parents are not
 * dual-entry origins and canonicalise to LEGACY.
 */
export function originFromParentType(parentType: string): OrderWorkspaceOrigin {
  return canonicalizeOrderWorkspaceOrigin(parentType);
}

export interface SpawnOrderInput {
  /** Null for a Direct PO, which is its own trade root. */
  parentWorkspaceId: string | null;
  parentType: SpawnParentType;
  parentExternalRef: string;
  buyerUserId: string;
  supplierUserId: string;
  contractRef: string;
  currency: string;
  totalValue: number | string;
  incoterms: string;
  originPort?: string;
  destinationPort?: string;
  actorUserId: string;
  auditEvent:
    | "order.created_from_rfq"
    | "order.created_from_commoditybid"
    | "order.created_from_mixed_container"
    | "order.created_from_bulk_container"
    | "ORDER_WORKSPACE_CREATED";
  /** Overrides the origin derived from parentType. */
  origin?: OrderWorkspaceOrigin;
  timelinePayload?: Record<string, unknown>;
  /** Unique suffix for idempotent ref when multiple orders share a parent (e.g. per allocation). */
  orderRefSuffix?: string;
}

export async function spawnOrderWorkspace(
  tx: Prisma.TransactionClient,
  input: SpawnOrderInput,
): Promise<{ orderWorkspaceId: string; externalRef: string }> {
  const extRef = input.orderRefSuffix
    ? `ORD-${input.parentExternalRef}-${input.orderRefSuffix}`
    : `ORD-${input.parentExternalRef}-${input.supplierUserId.slice(0, 8)}`;
  const existing = await tx.workspace.findUnique({ where: { externalRef: extRef } });
  if (existing) return { orderWorkspaceId: existing.id, externalRef: extRef };

  const confirmSla = addBusinessDays(new Date(), 3);
  const orderWs = await tx.workspace.create({
    data: {
      externalRef: extRef,
      type: "ORDER",
      state: "ORDER_CREATED",
      currency: input.currency,
      spawnedFromId: input.parentWorkspaceId,
      createdById: input.buyerUserId,
      participants: {
        create: [
          { userId: input.buyerUserId, participantRole: "OWNER" },
          { userId: input.supplierUserId, participantRole: "COUNTERPARTY" },
        ],
      },
    },
  });

  await tx.orderWorkspace.create({
    data: {
      workspaceId: orderWs.id,
      contractRef: input.contractRef,
      currency: input.currency,
      totalValue: input.totalValue,
      incoterms: input.incoterms,
      originPort: input.originPort ?? "CNSHA",
      destinationPort: input.destinationPort ?? "NLRTM",
      supplierUserId: input.supplierUserId,
      buyerUserId: input.buyerUserId,
      parentWorkspaceId: input.parentWorkspaceId,
      parentWorkspaceType: input.parentType,
      // Without this the column falls back to its RFQ default, which mislabels every
      // CommodityBid / container / Direct PO order in lineage and PO attribution.
      origin: input.origin ?? originFromParentType(input.parentType),
      confirmSlaDeadlineAt: confirmSla,
    },
  });

  await tx.timelineEvent.create({
    data: {
      workspaceId: orderWs.id,
      eventType: input.auditEvent,
      actorUserId: input.actorUserId,
      payload: {
        parentWorkspaceId: input.parentWorkspaceId,
        parentExternalRef: input.parentExternalRef,
        ...input.timelinePayload,
      },
    },
  });

  return { orderWorkspaceId: orderWs.id, externalRef: extRef };
}

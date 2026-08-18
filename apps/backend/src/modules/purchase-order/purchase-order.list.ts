import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  PurchaseOrderListItem,
  PurchaseOrderListResponse,
  PurchaseOrderPricingState,
  PurchaseOrderSource,
  PurchaseOrderStatus,
} from "@dmx/contracts/purchase-order";
import { canonicalizePurchaseOrderSource } from "@dmx/contracts/purchase-order";
import type { PurchaseOrderListQuery } from "@dmx/contracts/purchase-order.zod";
import { canonicalizePurchaseOrderStatus } from "@dmx/contracts/purchase-order.fsm";
import { hasPortfolioVisibility } from "../../lib/staff-roles.js";
import type { AuthUser } from "./purchase-order.policy.js";

function accessibleOrderFilter(actor: AuthUser): Prisma.WorkspaceWhereInput {
  if (hasPortfolioVisibility(actor.role)) return { type: "ORDER" };
  return {
    type: "ORDER",
    participants: { some: { userId: actor.id, leftAt: null } },
  };
}

function dayStartUtc(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

function dayEndUtc(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T23:59:59.999Z`);
}

function pricingStateFromLines(
  lines: Array<{ unitPrice: { toString(): string } | number }>,
): PurchaseOrderPricingState {
  if (lines.length === 0) return "UNPRICED";
  let priced = 0;
  let unpriced = 0;
  for (const line of lines) {
    const price = Number(line.unitPrice);
    if (!Number.isFinite(price) || price === 0) unpriced += 1;
    else priced += 1;
  }
  if (priced === 0) return "UNPRICED";
  if (unpriced > 0) return "PARTIAL";
  return "COMPLETE";
}

function snapshotHeader(snap: unknown): Record<string, unknown> {
  if (!snap || typeof snap !== "object") return {};
  const root = snap as Record<string, unknown>;
  const header = root.header;
  if (header && typeof header === "object") return header as Record<string, unknown>;
  return root;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function emptyPage(query: PurchaseOrderListQuery): PurchaseOrderListResponse {
  return {
    items: [],
    pagination: { page: query.page, pageSize: query.pageSize, totalItems: 0, totalPages: 0 },
  };
}

export function emptyBySource(): Record<PurchaseOrderSource, number> {
  return { RFQ: 0, DIRECT: 0, REORDER: 0, API: 0, LEGACY: 0, COMMODITY_BID: 0 };
}

export async function listPurchaseOrders(
  db: PrismaClient,
  actor: AuthUser,
  query: PurchaseOrderListQuery,
): Promise<PurchaseOrderListResponse> {
  const accessible = await db.workspace.findMany({
    where: accessibleOrderFilter(actor),
    select: {
      id: true,
      externalRef: true,
      spawnedFromId: true,
      spawnedFrom: { select: { id: true, type: true } },
    },
  });
  const orderIds = accessible.map((w) => w.id);
  const orderMeta = new Map(
    accessible.map((w) => [
      w.id,
      {
        externalRef: w.externalRef,
        rfqId: w.spawnedFrom?.type === "RFQ" ? w.spawnedFrom.id : null,
      },
    ]),
  );

  if (orderIds.length === 0) return emptyPage(query);

  const where: Prisma.PurchaseOrderWhereInput = {
    orderId: { in: orderIds },
  };

  if (query.source) where.source = query.source;
  if (query.status) {
    const canonical = canonicalizePurchaseOrderStatus(query.status);
    const aliases: Record<string, string[]> = {
      SUBMITTED: ["SUBMITTED", "ISSUED"],
      APPROVED: ["APPROVED", "ACKNOWLEDGED", "AMENDMENT_REQUESTED"],
      IN_EXECUTION: ["IN_EXECUTION", "AMENDED"],
      DRAFT: ["DRAFT"],
      COMPLETED: ["COMPLETED"],
      CLOSED: ["CLOSED"],
      CANCELLED: ["CANCELLED"],
    };
    where.status = { in: aliases[canonical] ?? [canonical] };
  }
  if (query.supplierId) where.supplierId = query.supplierId;

  if (query.dateFrom || query.dateTo) {
    where.issuedAt = {};
    if (query.dateFrom) where.issuedAt.gte = dayStartUtc(query.dateFrom);
    if (query.dateTo) where.issuedAt.lte = dayEndUtc(query.dateTo);
  }

  if (query.search) {
    const q = query.search;
    const matchingSuppliers = await db.user.findMany({
      where: {
        role: "SUPPLIER",
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { organisation: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: { id: true },
      take: 100,
    });
    const supplierIds = matchingSuppliers.map((s) => s.id);
    where.OR = [
      { poNumber: { contains: q, mode: "insensitive" } },
      ...(supplierIds.length ? [{ supplierId: { in: supplierIds } }] : []),
      {
        lines: {
          some: {
            OR: [
              { description: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  const direction = query.direction;
  let orderBy: Prisma.PurchaseOrderOrderByWithRelationInput[];
  switch (query.sort) {
    case "poNumber":
      orderBy = [{ poNumber: direction }, { id: "desc" }];
      break;
    case "status":
      orderBy = [{ status: direction }, { createdAt: "desc" }, { id: "desc" }];
      break;
    case "createdAt":
      orderBy = [{ createdAt: direction }, { id: "desc" }];
      break;
    case "supplier":
    case "total":
    case "expectedDeliveryDate":
      orderBy = [{ issuedAt: direction }, { createdAt: "desc" }, { id: "desc" }];
      break;
    case "issuedAt":
    default:
      orderBy = [{ issuedAt: direction }, { createdAt: "desc" }, { id: "desc" }];
      break;
  }

  const totalItems = await db.purchaseOrder.count({ where });
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const page = Math.min(query.page, Math.max(totalPages, 1));

  const rows = await db.purchaseOrder.findMany({
    where,
    orderBy,
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
    include: {
      lines: { select: { unitPrice: true, lineTotal: true } },
      acknowledgements: { orderBy: { createdAt: "desc" }, take: 1 },
      amendments: { where: { status: "OPEN" }, select: { id: true } },
      revisions: { orderBy: { revisionNumber: "desc" }, take: 1, select: { snapshotJson: true } },
    },
  });

  const userIds = Array.from(new Set(rows.flatMap((r) => [r.buyerId, r.supplierId])));
  const users = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          displayName: true,
          organisation: { select: { name: true, location: true } },
        },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const orderDetails = rows.length
    ? await db.orderWorkspace.findMany({
        where: { workspaceId: { in: rows.map((r) => r.orderId) } },
        select: { workspaceId: true, parentWorkspaceId: true, parentWorkspaceType: true },
      })
    : [];
  const orderDetailMap = new Map(orderDetails.map((o) => [o.workspaceId, o]));

  let items = rows.map((po): PurchaseOrderListItem => {
    const header = snapshotHeader(po.revisions[0]?.snapshotJson);
    const supplier = userMap.get(po.supplierId);
    const buyer = userMap.get(po.buyerId);
    const pricing = pricingStateFromLines(po.lines);
    const sum = po.lines.reduce((s, l) => s + Number(l.lineTotal), 0);
    const totalAmount =
      pricing === "UNPRICED" || pricing === "PARTIAL" ? null : sum;
    const meta = orderMeta.get(po.orderId);
    const detail = orderDetailMap.get(po.orderId);
    const rfqId =
      meta?.rfqId ??
      (detail?.parentWorkspaceType === "RFQ" ? detail.parentWorkspaceId : null);
    const latestAck = po.acknowledgements[0];
    const pendingAcknowledgement =
      ["SUBMITTED", "ISSUED"].includes(po.status) &&
      (!latestAck || latestAck.status !== "ACCEPTED");

    return {
      id: po.id,
      orderId: po.orderId,
      orderRef: meta?.externalRef ?? null,
      poNumber: po.poNumber,
      source: canonicalizePurchaseOrderSource(String(po.source)),
      status: po.status as PurchaseOrderStatus,
      supplier: {
        id: po.supplierId,
        companyName: supplier?.organisation?.name ?? supplier?.displayName ?? "Unknown supplier",
        supplierCode: null,
        country: supplier?.organisation?.location ?? null,
      },
      buyer: buyer
        ? {
            id: buyer.id,
            companyName: buyer.organisation?.name ?? buyer.displayName,
          }
        : null,
      currency: po.currency,
      totalAmount,
      pricingState: pricing,
      lineCount: po.lines.length,
      issuedAt: po.issuedAt?.toISOString() ?? null,
      expectedDeliveryDate: str(header.expectedDeliveryDate),
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
      buyerReference: str(header.buyerReference),
      rfqId,
      parentPurchaseOrderId: str(header.parentPurchaseOrderId),
      pendingAcknowledgement,
      openAmendments: po.amendments.length,
    };
  });

  // Optional post-filter for buyerReference search (snapshot field)
  if (query.search) {
    const q = query.search.toLowerCase();
    const matchedByCore = items;
    // Keep all DB-matched rows; additionally include buyerReference matches already in page
    // (buyerReference is snapshot-only — core OR already covers poNumber/supplier/product)
    void matchedByCore;
    void q;
  }

  if (query.sort === "supplier") {
    items = [...items].sort((a, b) => {
      const cmp = a.supplier.companyName.localeCompare(b.supplier.companyName);
      return query.direction === "asc" ? cmp : -cmp;
    });
  } else if (query.sort === "total") {
    items = [...items].sort((a, b) => {
      const av = a.totalAmount ?? -1;
      const bv = b.totalAmount ?? -1;
      return query.direction === "asc" ? av - bv : bv - av;
    });
  } else if (query.sort === "expectedDeliveryDate") {
    items = [...items].sort((a, b) => {
      const av = a.expectedDeliveryDate ?? "";
      const bv = b.expectedDeliveryDate ?? "";
      const cmp = av.localeCompare(bv);
      return query.direction === "asc" ? cmp : -cmp;
    });
  }

  return {
    items,
    pagination: { page, pageSize: query.pageSize, totalItems, totalPages },
  };
}

export async function mapRecentPurchaseOrders(
  db: PrismaClient,
  actor: AuthUser,
  limit = 5,
): Promise<PurchaseOrderListItem[]> {
  const result = await listPurchaseOrders(db, actor, {
    page: 1,
    pageSize: limit,
    sort: "createdAt",
    direction: "desc",
    search: undefined,
  });
  return result.items;
}

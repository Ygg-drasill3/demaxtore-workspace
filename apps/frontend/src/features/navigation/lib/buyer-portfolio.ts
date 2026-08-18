import { orderApi } from "@/features/order/lib/order.api";
import { purchaseOrderApi } from "@/features/purchase-order/lib/purchase-order.api";
import { tradeDocumentsApi } from "@/features/trade-documents/lib/trade-documents.api";
import { workspaceCommunicationApi } from "@/features/workspace-communication/lib/workspace-communication.api";
import { rfqApi } from "@/features/rfq/lib/rfq.api";
import type { PurchaseOrderSummary } from "@dmx/contracts/purchase-order";
import type { TradeDocumentsSummary } from "@dmx/contracts/trade-documents";
import type { WorkspaceConversation } from "@dmx/contracts/workspace-communication";
import { portfolioApi } from "./portfolio.api";

const BATCH = 20;

export interface PoListRow {
  poId: string;
  poNumber: string;
  status: string;
  orderId: string;
  orderRef: string;
  supplierName: string;
  pendingAck: boolean;
  openAmendments: number;
  updatedAt: string;
}

export interface ShipmentListRow {
  id: string;
  externalRef: string;
  state: string;
  orderId: string;
  orderRef: string;
  createdAt: string;
}

export interface TradeDocListRow {
  workspaceType: "ORDER" | "SHIPMENT";
  workspaceId: string;
  workspaceRef: string;
  complianceStatus: string;
  requiredCount: number;
  approvedCount: number;
  pendingReview: number;
}

export interface MessageListRow {
  workspaceType: "RFQ" | "ORDER" | "COMMODITYBID";
  workspaceId: string;
  workspaceRef: string;
  unreadCount: number;
  lastMessage: string;
  lastAt: string;
  workspaceUrl: string;
}

export async function fetchBuyerPoList(): Promise<PoListRow[]> {
  const { items } = await orderApi.list({ bucket: "all", limit: BATCH });
  const withPo = items.filter((o: { poReference: string | null }) => o.poReference);
  const rows = await Promise.all(
    withPo.map(async (o: {
      id: string; externalRef: string; supplierName: string; poReference: string | null;
    }) => {
      try {
        const summary = await purchaseOrderApi.byOrder(o.id) as PurchaseOrderSummary;
        const po = summary.purchaseOrder;
        return {
          poId: po.id,
          poNumber: po.poNumber,
          status: po.status,
          orderId: o.id,
          orderRef: o.externalRef,
          supplierName: o.supplierName,
          pendingAck: summary.pendingAcknowledgement,
          openAmendments: summary.openAmendments,
          updatedAt: po.updatedAt,
        } satisfies PoListRow;
      } catch {
        return null;
      }
    }),
  );
  return rows.filter((r): r is PoListRow => r !== null);
}

export async function fetchBuyerShipmentList(): Promise<ShipmentListRow[]> {
  const { items } = await orderApi.list({ bucket: "all", limit: BATCH });
  const withShipments = items.filter((o: { shipmentCount: number }) => o.shipmentCount > 0);
  const nested = await Promise.all(
    withShipments.map(async (o: { id: string; externalRef: string }) => {
      const shipments = await orderApi.spawnedShipments(o.id) as Array<{
        id: string; externalRef: string; state: string; createdAt: string;
      }>;
      return shipments.map((s) => ({
        id: s.id,
        externalRef: s.externalRef,
        state: s.state,
        orderId: o.id,
        orderRef: o.externalRef,
        createdAt: s.createdAt,
      }));
    }),
  );
  return nested.flat();
}

export async function fetchBuyerTradeDocList(): Promise<TradeDocListRow[]> {
  const { items } = await orderApi.list({ bucket: "active", limit: BATCH });
  const rows: TradeDocListRow[] = [];

  for (const o of items as Array<{ id: string; externalRef: string; shipmentCount: number }>) {
    try {
      const summary = await tradeDocumentsApi.summary("ORDER", o.id) as TradeDocumentsSummary;
      rows.push({
        workspaceType: "ORDER",
        workspaceId: o.id,
        workspaceRef: o.externalRef,
        complianceStatus: summary.compliance.status,
        requiredCount: summary.compliance.requiredCount,
        approvedCount: summary.compliance.approvedCount,
        pendingReview: summary.documents.filter((d) =>
          ["UPLOADED", "UNDER_REVIEW"].includes(d.status),
        ).length,
      });
    } catch { /* skip inaccessible */ }

    if (o.shipmentCount > 0) {
      const shipments = await orderApi.spawnedShipments(o.id) as Array<{ id: string; externalRef: string }>;
      for (const s of shipments.slice(0, 3)) {
        try {
          const summary = await tradeDocumentsApi.summary("SHIPMENT", s.id) as TradeDocumentsSummary;
          rows.push({
            workspaceType: "SHIPMENT",
            workspaceId: s.id,
            workspaceRef: s.externalRef,
            complianceStatus: summary.compliance.status,
            requiredCount: summary.compliance.requiredCount,
            approvedCount: summary.compliance.approvedCount,
            pendingReview: summary.documents.filter((d) =>
              ["UPLOADED", "UNDER_REVIEW"].includes(d.status),
            ).length,
          });
        } catch { /* skip */ }
      }
    }
  }
  return rows;
}

export async function fetchBuyerMessageList(): Promise<MessageListRow[]> {
  const [orders, rfqs] = await Promise.all([
    orderApi.list({ bucket: "active", limit: 10 }),
    rfqApi.list({ limit: 10 }),
  ]);

  const targets: Array<{ type: "RFQ" | "ORDER"; id: string; ref: string; url: string }> = [
    ...(rfqs.items as Array<{ id: string; externalRef: string }>).map((r) => ({
      type: "RFQ" as const,
      id: r.id,
      ref: r.externalRef,
      url: `/workspace/rfq/${r.id}`,
    })),
    ...(orders.items as Array<{ id: string; externalRef: string }>).map((o) => ({
      type: "ORDER" as const,
      id: o.id,
      ref: o.externalRef,
      url: `/workspace/order/${o.id}`,
    })),
  ];

  const rows: MessageListRow[] = [];
  for (const t of targets) {
    try {
      const conv = await workspaceCommunicationApi.get(t.type, t.id) as WorkspaceConversation;
      const last = conv.messages[conv.messages.length - 1];
      rows.push({
        workspaceType: t.type,
        workspaceId: t.id,
        workspaceRef: t.ref,
        unreadCount: conv.unreadCount,
        lastMessage: last?.body?.slice(0, 120) ?? "No messages yet",
        lastAt: last?.createdAt ?? "",
        workspaceUrl: t.url,
      });
    } catch { /* skip inaccessible */ }
  }

  return rows.sort((a, b) => b.unreadCount - a.unreadCount || b.lastAt.localeCompare(a.lastAt));
}

export async function fetchBuyerPoListPaged(params: { limit?: number; offset?: number } = {}) {
  const result = await portfolioApi.purchaseOrders(params);
  return { items: result.items as PoListRow[], total: result.total };
}

export async function fetchBuyerShipmentListPaged(params: { limit?: number; offset?: number } = {}) {
  const result = await portfolioApi.shipments(params);
  return { items: result.items as ShipmentListRow[], total: result.total };
}

export async function fetchBuyerTradeDocListPaged(params: { limit?: number; offset?: number } = {}) {
  const result = await portfolioApi.tradeDocuments(params);
  return { items: result.items as TradeDocListRow[], total: result.total };
}

export async function fetchBuyerMessageListPaged(params: { limit?: number; offset?: number } = {}) {
  const result = await portfolioApi.messages(params);
  return { items: result.items as MessageListRow[], total: result.total };
}

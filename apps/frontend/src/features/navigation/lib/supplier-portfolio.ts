import { portfolioApi } from "./portfolio.api";
import type { PoListRow, ShipmentListRow, TradeDocListRow, MessageListRow } from "./buyer-portfolio.types";

export interface SupplierPoRow {
  poId: string;
  poNumber: string;
  status: string;
  orderId: string;
  orderRef: string;
  buyerName: string;
  pendingAck: boolean;
  updatedAt: string;
}

export interface SupplierShipmentRow extends ShipmentListRow {}

export interface SupplierDocRow extends TradeDocListRow {
  missingCount: number;
  rejectedCount: number;
}

export type SupplierMessageRow = MessageListRow;

const PAGE = { limit: 25, offset: 0 };

export async function fetchSupplierPoList(params = PAGE): Promise<SupplierPoRow[]> {
  const { items } = await portfolioApi.purchaseOrders(params);
  return (items as PoListRow[]).map((r) => ({
    poId: r.poId,
    poNumber: r.poNumber,
    status: r.status,
    orderId: r.orderId,
    orderRef: r.orderRef,
    buyerName: r.buyerName ?? "",
    pendingAck: r.pendingAck,
    updatedAt: r.updatedAt,
  }));
}

export async function fetchSupplierPoListPaged(params = PAGE) {
  const data = await portfolioApi.purchaseOrders(params);
  return {
    total: data.total,
    items: (data.items as PoListRow[]).map((r) => ({
      poId: r.poId,
      poNumber: r.poNumber,
      status: r.status,
      orderId: r.orderId,
      orderRef: r.orderRef,
      buyerName: r.buyerName ?? "",
      pendingAck: r.pendingAck,
      updatedAt: r.updatedAt,
    })),
  };
}

export async function fetchSupplierShipmentList(params = PAGE) {
  const { items } = await portfolioApi.shipments(params);
  return items as SupplierShipmentRow[];
}

export async function fetchSupplierShipmentListPaged(params = PAGE) {
  return portfolioApi.shipments(params) as Promise<{ items: SupplierShipmentRow[]; total: number }>;
}

export async function fetchSupplierTradeDocList(params = PAGE) {
  const { items } = await portfolioApi.tradeDocuments(params);
  return items as SupplierDocRow[];
}

export async function fetchSupplierTradeDocListPaged(params = PAGE) {
  return portfolioApi.tradeDocuments(params) as Promise<{ items: SupplierDocRow[]; total: number }>;
}

export async function fetchSupplierMessageList(params = PAGE) {
  const { items } = await portfolioApi.messages(params);
  return items as SupplierMessageRow[];
}

export async function fetchSupplierMessageListPaged(params = PAGE) {
  return portfolioApi.messages(params) as Promise<{ items: SupplierMessageRow[]; total: number }>;
}

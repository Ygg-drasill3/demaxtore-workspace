import { portfolioApi } from "./portfolio.api";
import type { PoListRow, ShipmentListRow, TradeDocListRow, MessageListRow } from "./buyer-portfolio.types";

export type { PoListRow, ShipmentListRow, TradeDocListRow, MessageListRow } from "./buyer-portfolio.types";

const PAGE = { limit: 25, offset: 0 };

export async function fetchBuyerPoList(params = PAGE): Promise<PoListRow[]> {
  const { items } = await portfolioApi.purchaseOrders(params);
  return items as PoListRow[];
}

export async function fetchBuyerPoListPaged(params = PAGE) {
  return portfolioApi.purchaseOrders(params) as Promise<{ items: PoListRow[]; total: number }>;
}

export async function fetchBuyerShipmentList(params = PAGE): Promise<ShipmentListRow[]> {
  const { items } = await portfolioApi.shipments(params);
  return items as ShipmentListRow[];
}

export async function fetchBuyerShipmentListPaged(params = PAGE) {
  return portfolioApi.shipments(params) as Promise<{ items: ShipmentListRow[]; total: number }>;
}

export async function fetchBuyerTradeDocList(params = PAGE): Promise<TradeDocListRow[]> {
  const { items } = await portfolioApi.tradeDocuments(params);
  return items as TradeDocListRow[];
}

export async function fetchBuyerTradeDocListPaged(params = PAGE) {
  return portfolioApi.tradeDocuments(params) as Promise<{ items: TradeDocListRow[]; total: number }>;
}

export async function fetchBuyerMessageList(params = PAGE): Promise<MessageListRow[]> {
  const { items } = await portfolioApi.messages(params);
  return items as MessageListRow[];
}

export async function fetchBuyerMessageListPaged(params = PAGE) {
  return portfolioApi.messages(params) as Promise<{ items: MessageListRow[]; total: number }>;
}

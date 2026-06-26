/** Sprint 11A — Admin procurement strategy reporting */

export interface ProcurementStrategyReport {
  directRfqCount: number;
  commodityBidCount: number;
  pendingStrategyCount: number;
  directRfqPoIssued: number;
  commodityBidOrdersSpawned: number;
  directRfqConversionRate: number | null;
  auctionConversionRate: number | null;
  revenueDirectRfqUsd: number;
  revenueCommodityBidUsd: number;
}

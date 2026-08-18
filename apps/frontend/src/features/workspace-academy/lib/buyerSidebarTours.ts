// Maps every Buyer sidebar hub + key inner pages → Academy guide ids.
// Used by Help Center “Explore all areas” and journey stage coverage.
import type { AcademyGuideId } from "@dmx/contracts/workspace-academy";

export interface BuyerTourMapEntry {
  /** Navigate here before starting the tour (hub / list path). */
  path: string;
  guideId: AcademyGuideId;
  /** i18n key for Help Center row label. */
  labelKey: string;
  /** Nav group id from BUYER_NAV_GROUPS, or "inner" for nested screens. */
  group: "home" | "sourcing" | "execution" | "collaboration" | "documents" | "knowledge" | "inner";
}

/** Sidebar hubs — one row per Workspace Inbox … Account item. */
export const BUYER_SIDEBAR_HUB_TOURS: readonly BuyerTourMapEntry[] = [
  { path: "/buyer/inbox", guideId: "buyer-inbox-v1", labelKey: "wa.tourMap.inbox", group: "home" },
  { path: "/buyer/dashboard", guideId: "buyer-dashboard-v1", labelKey: "wa.tourMap.dashboard", group: "home" },
  { path: "/buyer/rfq", guideId: "buyer-rfq-list-v1", labelKey: "wa.tourMap.rfqs", group: "sourcing" },
  { path: "/buyer/commoditybid", guideId: "buyer-commoditybid-list-v1", labelKey: "wa.tourMap.commodityBids", group: "sourcing" },
  { path: "/buyer/mixed-container", guideId: "buyer-mixed-container-v1", labelKey: "wa.tourMap.mixedContainer", group: "sourcing" },
  { path: "/buyer/bulk-container", guideId: "buyer-bulk-container-v1", labelKey: "wa.tourMap.bulkContainer", group: "sourcing" },
  { path: "/buyer/purchase-orders", guideId: "buyer-po-list-v1", labelKey: "wa.tourMap.purchaseOrders", group: "execution" },
  { path: "/buyer/orders", guideId: "buyer-orders-list-v1", labelKey: "wa.tourMap.orders", group: "execution" },
  { path: "/buyer/freightiq", guideId: "buyer-freightiq-hub-v1", labelKey: "wa.tourMap.freightiq", group: "execution" },
  { path: "/buyer/shipments", guideId: "buyer-shipments-list-v1", labelKey: "wa.tourMap.shipments", group: "execution" },
  { path: "/buyer/control-tower", guideId: "buyer-control-tower-v1", labelKey: "wa.tourMap.controlTower", group: "execution" },
  { path: "/alerts", guideId: "buyer-alerts-v1", labelKey: "wa.tourMap.alerts", group: "execution" },
  { path: "/messages", guideId: "buyer-messages-v1", labelKey: "wa.tourMap.messages", group: "collaboration" },
  { path: "/notifications", guideId: "buyer-notifications-v1", labelKey: "wa.tourMap.notifications", group: "collaboration" },
  { path: "/documents", guideId: "buyer-documents-v1", labelKey: "wa.tourMap.documents", group: "documents" },
  { path: "/buyer/trade-documents", guideId: "buyer-compliance-v1", labelKey: "wa.tourMap.compliance", group: "documents" },
  { path: "/learning", guideId: "buyer-learning-v1", labelKey: "wa.tourMap.learning", group: "knowledge" },
  { path: "/account", guideId: "buyer-account-v1", labelKey: "wa.tourMap.account", group: "knowledge" },
] as const;

/** Important inner / create screens that also auto-tour on first visit. */
export const BUYER_INNER_PAGE_TOURS: readonly BuyerTourMapEntry[] = [
  { path: "/buyer/rfq/new", guideId: "buyer-rfq-create-v1", labelKey: "wa.tourMap.rfqCreate", group: "inner" },
  { path: "/buyer/commoditybid/new", guideId: "buyer-commoditybid-create-v1", labelKey: "wa.tourMap.cbCreate", group: "inner" },
  { path: "/buyer/commoditybid/panel", guideId: "buyer-commoditybid-panel-v1", labelKey: "wa.tourMap.cbPanel", group: "inner" },
  { path: "/buyer/mixed-container/catalog", guideId: "buyer-mc-catalog-v1", labelKey: "wa.tourMap.mcCatalog", group: "inner" },
  { path: "/buyer/mixed-container/requests", guideId: "buyer-mc-requests-v1", labelKey: "wa.tourMap.mcRequests", group: "inner" },
  { path: "/buyer/bulk-container/catalog", guideId: "buyer-bc-catalog-v1", labelKey: "wa.tourMap.bcCatalog", group: "inner" },
  { path: "/buyer/bulk-container/requests", guideId: "buyer-bc-requests-v1", labelKey: "wa.tourMap.bcRequests", group: "inner" },
  { path: "/shipments/portfolio", guideId: "buyer-shipment-portfolio-v1", labelKey: "wa.tourMap.shipmentPortfolio", group: "inner" },
  { path: "/account/integrations/whatsapp-business", guideId: "buyer-account-whatsapp-v1", labelKey: "wa.tourMap.whatsapp", group: "inner" },
] as const;

export const BUYER_ALL_MAPPED_TOURS: readonly BuyerTourMapEntry[] = [
  ...BUYER_SIDEBAR_HUB_TOURS,
  ...BUYER_INNER_PAGE_TOURS,
];

export const TOUR_MAP_GROUP_ORDER = [
  "home",
  "sourcing",
  "execution",
  "collaboration",
  "documents",
  "knowledge",
  "inner",
] as const;

export type TourMapGroup = (typeof TOUR_MAP_GROUP_ORDER)[number];

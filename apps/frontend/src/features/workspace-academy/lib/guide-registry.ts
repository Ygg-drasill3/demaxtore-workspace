// apps/frontend/src/features/workspace-academy/lib/guide-registry.ts
//
// Central registry for every contextual guide. Nothing initializes driver.js
// outside the launcher; pages only carry stable data-guide attributes.
//
// Rules encoded here:
//   • max 7 automatic steps per guide
//   • roles gate visibility (backend re-checks ids on persistence)
//   • routeMatcher supports :param segments (slug or uuid both match)
//   • automatic: true → first eligible visit launches without Help Center
//   • priority + requireVisibleSelectors resolve shared-route feature unlocks
import type { Role } from "@dmx/contracts/auth";
import { ACADEMY_GUIDE_IDS } from "@dmx/contracts/workspace-academy";
import type { GuideDefinition } from "../types/academy.types";

export const OPERATIONS_ROLES: readonly Role[] = [
  "ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR", "FINANCE_OPERATOR", "DOCUMENT_CONTROLLER",
];

const g = (selector: string, key: string, optional = false) => ({
  selector: `[data-guide="${selector}"]`,
  titleKey: `wa.step.${key}.t`,
  descKey: `wa.step.${key}.d`,
  optional,
});

export const GUIDE_REGISTRY: readonly GuideDefinition[] = [
  // ═══ BUYER ═══
  {
    id: "buyer-dashboard-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.buyerDashboard.t", descKey: "wa.guide.buyerDashboard.d",
    routeMatcher: "/buyer/dashboard", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "dashboard",
    steps: [
      g("dashboard-kpis", "dashKpis"),
      g("dashboard-pending-actions", "dashPending", true),
      g("dashboard-live-map", "dashMap", true),
      g("dashboard-recent-workspaces", "dashRecent", true),
      g("dashboard-alerts", "dashAlerts", true),
    ],
  },
  {
    id: "buyer-inbox-v1", version: 4, roles: ["BUYER"],
    titleKey: "wa.guide.buyerInbox.t", descKey: "wa.guide.buyerInbox.d",
    routeMatcher: "/buyer/inbox", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "inbox",
    steps: [
      g("buyer-inbox", "inboxList"),
      g("inbox-summary", "inboxSummary"),
      g("inbox-filters", "inboxFilters"),
      g("inbox-priorities", "inboxPriorities"),
      g("inbox-activity", "inboxActivity"),
      g("inbox-workspaces", "inboxWorkspaces"),
      g("inbox-item-link", "inboxLink", true),
    ],
  },
  {
    id: "buyer-rfq-list-v1", version: 4, roles: ["BUYER"],
    titleKey: "wa.guide.rfqList.t", descKey: "wa.guide.rfqList.d",
    routeMatcher: "/buyer/rfq", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "rfq-list",
    steps: [
      g("rfq-list", "rfqList"),
      g("rfq-create", "rfqCreate", true),
      g("rfq-status", "rfqListStatus", true),
      g("rfq-list-filters", "rfqListFilters", true),
      g("rfq-list-open", "rfqListOpen", true),
    ],
  },
  {
    id: "buyer-rfq-create-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.rfqCreate.t", descKey: "wa.guide.rfqCreate.d",
    routeMatcher: "/buyer/rfq/new", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "rfq-create",
    steps: [
      g("rfq-product-selection", "rfqProducts", true),
      g("rfq-commercial-terms", "rfqTerms", true),
      g("rfq-submit", "rfqSubmit", true),
    ],
  },
  {
    id: "buyer-procurement-strategy-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.strategy.t", descKey: "wa.guide.strategy.d",
    routeMatcher: "/workspace/rfq/:id/procurement-strategy",
    automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "procurement-strategy",
    steps: [
      g("procurement-strategy", "strategyIntro"),
      g("strategy-direct-rfq", "strategyDirect", true),
      g("strategy-commoditybid", "strategyAuction", true),
    ],
  },
  {
    id: "buyer-rfq-workspace-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.rfqWorkspace.t", descKey: "wa.guide.rfqWorkspace.d",
    routeMatcher: "/workspace/rfq/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 40, journeyStage: "rfq-workspace",
    steps: [
      g("rfq-story-bar", "rfqStory"),
      g("rfq-line-items", "rfqLines", true),
      g("supplier-activity", "rfqSupplierActivity", true),
      g("rfq-deadline", "rfqDeadline", true),
      g("workspace-messages", "wsMessages", true),
    ],
  },
  {
    id: "buyer-quotation-comparison-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.quotations.t", descKey: "wa.guide.quotations.d",
    routeMatcher: "/workspace/rfq/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 80, journeyStage: "quotation-comparison",
    requireVisibleSelectors: ['[data-guide="quotation-comparison"]'],
    prerequisiteGuideIds: ["buyer-rfq-workspace-v1"],
    steps: [
      g("quotation-comparison", "quoteCompare"),
      g("quotation-terms", "quoteTerms", true),
      g("quotation-validity", "quoteValidity", true),
    ],
  },
  {
    id: "buyer-split-award-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.splitAward.t", descKey: "wa.guide.splitAward.d",
    routeMatcher: "/workspace/rfq/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 75, journeyStage: "split-award",
    requireVisibleSelectors: ['[data-guide="split-award"]'],
    prerequisiteGuideIds: ["buyer-quotation-comparison-v1"],
    steps: [
      g("split-award", "splitAwardPanel"),
      g("rfq-line-items", "splitAwardLines", true),
    ],
  },
  {
    id: "buyer-proforma-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.proforma.t", descKey: "wa.guide.proforma.d",
    routeMatcher: "/workspace/rfq/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 85, journeyStage: "proforma",
    requireVisibleSelectors: ['[data-guide="proforma-panel"]'],
    prerequisiteGuideIds: ["buyer-rfq-workspace-v1"],
    steps: [
      g("proforma-panel", "proformaPanel"),
      g("proforma-review", "proformaReview", true),
    ],
  },
  {
    id: "buyer-po-workspace-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.po.t", descKey: "wa.guide.po.d",
    routeMatcher: "/workspace/po/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "purchase-order",
    steps: [
      g("po-status", "poStatus"),
      g("po-acknowledgement", "poAck", true),
      g("workspace-messages", "wsMessages", true),
    ],
  },
  {
    id: "buyer-order-workspace-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.order.t", descKey: "wa.guide.order.d",
    routeMatcher: "/workspace/order/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 40, journeyStage: "order-workspace",
    steps: [
      g("order-summary", "orderSummary"),
      g("production-timeline", "orderProduction", true),
      g("inspection-panel", "orderInspection", true),
      g("freightiq-panel", "orderFreight", true),
      g("workspace-messages", "wsMessages", true),
    ],
  },
  {
    id: "buyer-freightiq-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.freightiq.t", descKey: "wa.guide.freightiq.d",
    routeMatcher: "/workspace/order/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 80, journeyStage: "freightiq",
    requireVisibleSelectors: ['[data-guide="freight-comparison"]', '[data-guide="freightiq-panel"]'],
    prerequisiteGuideIds: ["buyer-order-workspace-v1"],
    steps: [
      g("freightiq-panel", "fiqPanel"),
      g("freight-comparison", "fiqCompare", true),
      g("book-shipment", "fiqBook", true),
    ],
  },
  {
    id: "buyer-shipment-workspace-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.shipment.t", descKey: "wa.guide.shipment.d",
    routeMatcher: "/workspace/shipment/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "shipment-workspace",
    steps: [
      g("shipment-map", "shipMap", true),
      g("shipment-timeline", "shipTimeline", true),
      g("shipment-eta", "shipEta", true),
      g("shipment-events", "shipEvents", true),
      g("workspace-messages", "wsMessages", true),
    ],
  },
  {
    id: "buyer-documents-v1", version: 4, roles: ["BUYER"],
    titleKey: "wa.guide.documents.t", descKey: "wa.guide.documents.d",
    routeMatcher: "/documents", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "documents",
    steps: [
      g("document-center", "docCenter"),
      g("document-kpis", "docKpis"),
      g("document-filters", "docFilters"),
      g("document-status", "docStatus"),
      g("document-view-mode", "docViewMode"),
      g("document-list", "docList"),
    ],
  },
  {
    id: "buyer-messages-v1", version: 4, roles: ["BUYER"],
    titleKey: "wa.guide.messages.t", descKey: "wa.guide.messages.d",
    routeMatcher: "/messages", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "messages",
    steps: [
      g("messages-list", "msgList"),
      g("messages-filters", "msgFilters"),
      g("messages-thread", "msgThread", true),
      g("messages-composer", "msgComposer", true),
      g("messages-context", "msgContext", true),
    ],
  },
  {
    id: "buyer-alerts-v1", version: 4, roles: ["BUYER"],
    titleKey: "wa.guide.alerts.t", descKey: "wa.guide.alerts.d",
    routeMatcher: "/alerts", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "alerts",
    steps: [
      g("alerts-header", "alertsIntro"),
      g("alerts-kpis", "alertsKpis"),
      g("alerts-action-center", "alertsAction"),
      g("alerts-filters", "alertsFilters"),
      g("alerts-severity", "alertsSeverity"),
      g("alerts-table", "alertsTable"),
      g("alert-workspace-link", "alertsLink", true),
    ],
  },
  {
    id: "buyer-trade-workspace-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.trade.t", descKey: "wa.guide.trade.d",
    routeMatcher: "/workspace/trade/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "trade",
    steps: [
      g("trade-workspace", "tradeOverview"),
      g("workspace-timeline", "tradeTimeline", true),
    ],
  },
  {
    id: "buyer-control-tower-v1", version: 4, roles: ["BUYER"],
    titleKey: "wa.guide.controlTower.t", descKey: "wa.guide.controlTower.d",
    routeMatcher: "/buyer/control-tower", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "control-tower",
    steps: [
      g("buyer-control-tower", "ctIntro"),
      g("control-tower-kpis", "ctKpis"),
      g("control-tower-pipeline", "ctPipeline"),
      g("control-tower-attention", "ctAttention"),
      g("control-tower-activity", "ctActivity"),
      g("control-tower-risks", "ctRisks"),
    ],
  },
  {
    id: "buyer-commoditybid-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.commoditybid.t", descKey: "wa.guide.commoditybid.d",
    routeMatcher: "/workspace/commoditybid/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "commoditybid",
    steps: [
      g("commoditybid-workspace", "cbOverview", true),
      g("workspace-messages", "wsMessages", true),
    ],
  },
  {
    id: "buyer-commoditybid-list-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.cbList.t", descKey: "wa.guide.cbList.d",
    routeMatcher: "/buyer/commoditybid", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "commoditybid-list",
    steps: [
      g("commoditybid-list", "cbListIntro"),
      g("commoditybid-create-cta", "cbListCreate", true),
      g("commoditybid-filters", "cbListFilters", true),
    ],
  },
  {
    id: "buyer-mixed-container-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.mixedContainer.t", descKey: "wa.guide.mixedContainer.d",
    routeMatcher: "/buyer/mixed-container", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "mixed-container",
    steps: [
      g("mixed-container-home", "mcIntro"),
      g("mixed-container-build", "mcBuild", true),
      g("mixed-container-widgets", "mcWidgets", true),
    ],
  },
  {
    id: "buyer-bulk-container-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.bulkContainer.t", descKey: "wa.guide.bulkContainer.d",
    routeMatcher: "/buyer/bulk-container", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "bulk-container",
    steps: [
      g("bulk-container-home", "bcIntro"),
      g("bulk-container-build", "bcBuild", true),
      g("bulk-container-recent", "bcRecent", true),
    ],
  },
  {
    id: "buyer-po-list-v1", version: 4, roles: ["BUYER"],
    titleKey: "wa.guide.poList.t", descKey: "wa.guide.poList.d",
    routeMatcher: "/buyer/purchase-orders", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "po-list",
    steps: [
      g("po-list", "poListIntro"),
      g("po-list-header", "poListHeader"),
      g("po-list-table", "poListTable", true),
      g("po-list-empty", "poListEmpty", true),
    ],
  },
  {
    id: "buyer-orders-list-v1", version: 4, roles: ["BUYER"],
    titleKey: "wa.guide.ordersList.t", descKey: "wa.guide.ordersList.d",
    routeMatcher: "/buyer/orders", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "orders-list",
    steps: [
      g("orders-list", "ordersListIntro"),
      g("orders-list-filters", "ordersListFilters"),
      g("orders-list-table", "ordersListTable"),
      g("orders-list-open", "ordersListOpen", true),
    ],
  },
  {
    id: "buyer-freightiq-hub-v1", version: 4, roles: ["BUYER"],
    titleKey: "wa.guide.freightiqHub.t", descKey: "wa.guide.freightiqHub.d",
    routeMatcher: "/buyer/freightiq", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "freightiq-hub",
    steps: [
      g("freightiq-hub", "fiqHubIntro"),
      g("freightiq-hub-panel", "fiqHubPanel", true),
      g("freightiq-hub-compare", "fiqHubCompare", true),
    ],
  },
  {
    id: "buyer-shipments-list-v1", version: 4, roles: ["BUYER"],
    titleKey: "wa.guide.shipmentsList.t", descKey: "wa.guide.shipmentsList.d",
    routeMatcher: "/buyer/shipments", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "shipments-list",
    steps: [
      g("shipments-list", "shipListIntro"),
      g("shipments-list-header", "shipListHeader"),
      g("shipments-list-table", "shipListTable", true),
      g("shipments-list-open", "shipListOpen", true),
    ],
  },
  {
    id: "buyer-notifications-v1", version: 5, roles: ["BUYER"],
    titleKey: "wa.guide.notifications.t", descKey: "wa.guide.notifications.d",
    routeMatcher: "/notifications", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "notifications",
    steps: [
      g("notifications-center", "notifIntro"),
      g("notifications-unread", "notifUnread", true),
      g("notifications-filters", "notifFilters"),
      g("notifications-list", "notifList"),
    ],
  },
  {
    id: "buyer-compliance-v1", version: 4, roles: ["BUYER"],
    titleKey: "wa.guide.compliance.t", descKey: "wa.guide.compliance.d",
    routeMatcher: "/buyer/trade-documents", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "compliance",
    steps: [
      g("compliance-list", "complianceIntro"),
      g("compliance-table", "complianceTable", true),
      g("compliance-status", "complianceStatus", true),
    ],
  },
  {
    id: "buyer-learning-v1", version: 4, roles: ["BUYER"],
    titleKey: "wa.guide.learning.t", descKey: "wa.guide.learning.d",
    routeMatcher: "/learning", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "learning",
    steps: [
      g("learning-center", "learningIntro"),
      g("learning-cards", "learningCards", true),
      g("learning-progress", "learningProgress", true),
    ],
  },
  {
    id: "buyer-account-v1", version: 4, roles: ["BUYER"],
    titleKey: "wa.guide.account.t", descKey: "wa.guide.account.d",
    routeMatcher: "/account", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, journeyStage: "account",
    steps: [
      g("account-settings", "accountIntro"),
      g("account-profile", "accountProfile", true),
      g("account-phone", "accountPhone", true),
      g("account-security", "accountSecurity", true),
    ],
  },

  // ── Nested buyer pages (catalog → builder → offer → coordination) ──
  {
    id: "buyer-commoditybid-panel-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.cbPanel.t", descKey: "wa.guide.cbPanel.d",
    routeMatcher: "/buyer/commoditybid/panel", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [
      g("commoditybid-panel", "cbPanelIntro"),
      g("commoditybid-panel-form", "cbPanelForm", true),
    ],
  },
  {
    id: "buyer-commoditybid-create-v1", version: 11, roles: ["BUYER"],
    titleKey: "wa.guide.cbCreate.t", descKey: "wa.guide.cbCreate.d",
    routeMatcher: "/buyer/commoditybid/new", automatic: true, maxAutomaticDisplays: 1,
    priority: 70,
    requireVisibleSelectors: ['[data-guide="commoditybid-create-form"]'],
    // Steps are metadata for Help Center — real field tour runs inside the CB iframe.
    steps: [
      g("commoditybid-create-form", "cbCreateIntro"),
      g("commoditybid-create-form", "cbCreateDetails", true),
      g("commoditybid-create-form", "cbCreateForm", true),
    ],
  },
  {
    id: "buyer-mc-catalog-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.mcCatalog.t", descKey: "wa.guide.mcCatalog.d",
    routeMatcher: "/buyer/mixed-container/catalog", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [
      g("mc-catalog", "mcCatalogIntro"),
      g("mc-catalog-categories", "mcCatalogCategories", true),
      g("mc-catalog-sidebar", "mcCatalogSidebar", true),
    ],
  },
  {
    id: "buyer-mc-catalog-search-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.mcCatalogSearch.t", descKey: "wa.guide.mcCatalogSearch.d",
    routeMatcher: "/buyer/mixed-container/catalog/search", automatic: true, maxAutomaticDisplays: 1,
    priority: 60, steps: [g("mc-catalog-search", "mcCatalogSearchIntro")],
  },
  {
    id: "buyer-mc-catalog-products-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.mcCatalogProducts.t", descKey: "wa.guide.mcCatalogProducts.d",
    routeMatcher: "/buyer/mixed-container/catalog/:slug", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [
      g("mc-catalog-products", "mcCatalogProductsIntro"),
      g("mc-catalog-sidebar", "mcCatalogSidebar", true),
    ],
  },
  {
    id: "buyer-mc-catalog-product-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.mcCatalogProduct.t", descKey: "wa.guide.mcCatalogProduct.d",
    routeMatcher: "/buyer/mixed-container/catalog/:slug/:productRef", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("mc-product-detail", "mcProductDetailIntro")],
  },
  {
    id: "buyer-mc-requests-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.mcRequests.t", descKey: "wa.guide.mcRequests.d",
    routeMatcher: "/buyer/mixed-container/requests", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("mc-requests", "mcRequestsIntro")],
  },
  {
    id: "buyer-mc-builder-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.mcBuilder.t", descKey: "wa.guide.mcBuilder.d",
    routeMatcher: "/buyer/mixed-container/requests/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [
      g("mc-builder", "mcBuilderIntro"),
      g("mc-builder-summary", "mcBuilderSummary", true),
      g("mc-builder-submit", "mcBuilderSubmit", true),
    ],
  },
  {
    id: "buyer-mc-offer-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.mcOffer.t", descKey: "wa.guide.mcOffer.d",
    routeMatcher: "/buyer/mixed-container/offers/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("mc-offer", "mcOfferIntro")],
  },
  {
    id: "buyer-mc-organization-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.mcOrg.t", descKey: "wa.guide.mcOrg.d",
    routeMatcher: "/buyer/mixed-container/organization/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("mc-organization", "mcOrgIntro")],
  },
  {
    id: "buyer-mc-coordination-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.mcCoord.t", descKey: "wa.guide.mcCoord.d",
    routeMatcher: "/buyer/mixed-container/coordination/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("mc-coordination", "mcCoordIntro")],
  },
  {
    id: "buyer-bc-catalog-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.bcCatalog.t", descKey: "wa.guide.bcCatalog.d",
    routeMatcher: "/buyer/bulk-container/catalog", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("bc-catalog", "bcCatalogIntro")],
  },
  {
    id: "buyer-bc-catalog-products-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.bcCatalogProducts.t", descKey: "wa.guide.bcCatalogProducts.d",
    routeMatcher: "/buyer/bulk-container/catalog/:category", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("bc-catalog-products", "bcCatalogProductsIntro")],
  },
  {
    id: "buyer-bc-requests-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.bcRequests.t", descKey: "wa.guide.bcRequests.d",
    routeMatcher: "/buyer/bulk-container/requests", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("bc-requests", "bcRequestsIntro")],
  },
  {
    id: "buyer-bc-builder-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.bcBuilder.t", descKey: "wa.guide.bcBuilder.d",
    routeMatcher: "/buyer/bulk-container/requests/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [
      g("bc-builder", "bcBuilderIntro"),
      g("bc-builder-summary", "bcBuilderSummary", true),
      g("bc-builder-submit", "bcBuilderSubmit", true),
    ],
  },
  {
    id: "buyer-bc-offer-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.bcOffer.t", descKey: "wa.guide.bcOffer.d",
    routeMatcher: "/buyer/bulk-container/offers/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("bc-offer", "bcOfferIntro")],
  },
  {
    id: "buyer-bc-coordination-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.bcCoord.t", descKey: "wa.guide.bcCoord.d",
    routeMatcher: "/buyer/bulk-container/coordination/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("bc-coordination", "bcCoordIntro")],
  },
  {
    id: "buyer-bc-execution-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.bcExec.t", descKey: "wa.guide.bcExec.d",
    routeMatcher: "/buyer/bulk-container/execution/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("bc-execution", "bcExecIntro")],
  },
  {
    id: "buyer-shipment-portfolio-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.shipPortfolio.t", descKey: "wa.guide.shipPortfolio.d",
    routeMatcher: "/shipments/portfolio", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("shipment-portfolio", "shipPortfolioIntro")],
  },
  {
    id: "buyer-document-detail-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.docDetail.t", descKey: "wa.guide.docDetail.d",
    routeMatcher: "/documents/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("document-detail", "docDetailIntro")],
  },
  {
    id: "buyer-alert-detail-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.alertDetail.t", descKey: "wa.guide.alertDetail.d",
    routeMatcher: "/alerts/:id", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("alert-detail", "alertDetailIntro")],
  },
  {
    id: "buyer-account-whatsapp-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.whatsapp.t", descKey: "wa.guide.whatsapp.d",
    routeMatcher: "/account/integrations/whatsapp-business", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("account-whatsapp", "whatsappIntro")],
  },
  {
    id: "buyer-trade-documents-panel-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.tradeDocsPanel.t", descKey: "wa.guide.tradeDocsPanel.d",
    routeMatcher: "/workspace/trade/:id/documents", automatic: true, maxAutomaticDisplays: 1,
    priority: 50, steps: [g("trade-documents-panel", "tradeDocsPanelIntro")],
  },
  {
    id: "buyer-messages-thread-v1", version: 3, roles: ["BUYER"],
    titleKey: "wa.guide.messagesThread.t", descKey: "wa.guide.messagesThread.d",
    routeMatcher: "/messages/:conversationId", automatic: true, maxAutomaticDisplays: 1,
    priority: 55, steps: [
      g("messages-list", "msgThreadIntro"),
      g("messages-filters", "msgFilters", true),
    ],
  },

  // ═══ SUPPLIER ═══
  {
    id: "supplier-rfq-list-v1", version: 1, roles: ["SUPPLIER"],
    titleKey: "wa.guide.supRfq.t", descKey: "wa.guide.supRfq.d",
    routeMatcher: "/supplier/rfq", automatic: true, maxAutomaticDisplays: 1,
    steps: [
      g("rfq-list", "supRfqList"),
      g("rfq-status", "supRfqStatus", true),
    ],
  },
  {
    id: "supplier-quotation-v1", version: 1, roles: ["SUPPLIER"],
    titleKey: "wa.guide.supQuote.t", descKey: "wa.guide.supQuote.d",
    routeMatcher: "/workspace/rfq/:id", automatic: true, maxAutomaticDisplays: 1,
    steps: [
      g("quotation-form", "supQuoteForm", true),
      g("rfq-deadline", "supQuoteDeadline", true),
      g("workspace-messages", "wsMessages", true),
    ],
  },
  {
    id: "supplier-po-v1", version: 1, roles: ["SUPPLIER"],
    titleKey: "wa.guide.supPo.t", descKey: "wa.guide.supPo.d",
    routeMatcher: "/workspace/po/:id", automatic: true, maxAutomaticDisplays: 1,
    steps: [
      g("po-status", "supPoStatus"),
      g("po-acknowledgement", "supPoAck", true),
    ],
  },
  {
    id: "supplier-order-v1", version: 1, roles: ["SUPPLIER"],
    titleKey: "wa.guide.supOrder.t", descKey: "wa.guide.supOrder.d",
    routeMatcher: "/workspace/order/:id", automatic: true, maxAutomaticDisplays: 1,
    steps: [
      g("order-summary", "supOrderSummary"),
      g("production-timeline", "supProduction", true),
      g("production-evidence", "supEvidence", true),
    ],
  },
  {
    id: "supplier-messages-v1", version: 1, roles: ["SUPPLIER"],
    titleKey: "wa.guide.supMessages.t", descKey: "wa.guide.supMessages.d",
    routeMatcher: "/messages", automatic: true, maxAutomaticDisplays: 1,
    steps: [g("messages-list", "msgList")],
  },

  // ═══ OPERATIONS / ADMIN ═══
  {
    id: "ops-rfq-triage-v1", version: 1, roles: OPERATIONS_ROLES,
    titleKey: "wa.guide.opsRfq.t", descKey: "wa.guide.opsRfq.d",
    routeMatcher: "/admin/rfq", automatic: true, maxAutomaticDisplays: 1,
    steps: [
      g("rfq-list", "opsRfqList"),
      g("rfq-status", "opsRfqTriage", true),
    ],
  },
  {
    id: "ops-order-v1", version: 1, roles: OPERATIONS_ROLES,
    titleKey: "wa.guide.opsOrder.t", descKey: "wa.guide.opsOrder.d",
    routeMatcher: "/workspace/order/:id", automatic: false, maxAutomaticDisplays: 1,
    steps: [
      g("order-summary", "opsOrderSummary"),
      g("inspection-panel", "opsInspection", true),
      g("freightiq-panel", "opsFreight", true),
    ],
  },
  {
    id: "ops-shipment-v1", version: 1, roles: OPERATIONS_ROLES,
    titleKey: "wa.guide.opsShipment.t", descKey: "wa.guide.opsShipment.d",
    routeMatcher: "/workspace/shipment/:id", automatic: false, maxAutomaticDisplays: 1,
    steps: [
      g("shipment-timeline", "opsShipTimeline", true),
      g("shipment-events", "opsShipEvents", true),
    ],
  },
  {
    id: "ops-control-tower-v1", version: 1, roles: OPERATIONS_ROLES,
    titleKey: "wa.guide.opsCt.t", descKey: "wa.guide.opsCt.d",
    routeMatcher: "/operations", automatic: true, maxAutomaticDisplays: 1,
    steps: [
      g("operations-control-tower", "opsCtPipeline"),
      g("operations-sla", "opsCtSla", true),
    ],
  },

  // ═══ FORWARDER ═══
  {
    id: "forwarder-dashboard-v1", version: 1, roles: ["FORWARDER"],
    titleKey: "wa.guide.fwdDash.t", descKey: "wa.guide.fwdDash.d",
    routeMatcher: "/forwarder/dashboard", automatic: true, maxAutomaticDisplays: 1,
    steps: [
      g("forwarder-requests", "fwdRequests", true),
      g("forwarder-shipments", "fwdShipments", true),
    ],
  },
  {
    id: "forwarder-shipment-v1", version: 1, roles: ["FORWARDER"],
    titleKey: "wa.guide.fwdShipment.t", descKey: "wa.guide.fwdShipment.d",
    routeMatcher: "/forwarder/shipments/:id", automatic: true, maxAutomaticDisplays: 1,
    steps: [
      g("shipment-timeline", "fwdShipTimeline", true),
      g("shipment-events", "fwdShipEvents", true),
    ],
  },

  // ═══ SALES CONTROL ═══
  {
    id: "sales-dashboard-v1", version: 1, roles: ["SALES_CONTROL"],
    titleKey: "wa.guide.salesDash.t", descKey: "wa.guide.salesDash.d",
    routeMatcher: "/sales/dashboard", automatic: true, maxAutomaticDisplays: 1,
    steps: [
      g("sales-portfolio", "salesPortfolio", true),
      g("sales-pending", "salesPending", true),
    ],
  },
  {
    id: "sales-control-tower-v1", version: 1, roles: ["SALES_CONTROL"],
    titleKey: "wa.guide.salesCt.t", descKey: "wa.guide.salesCt.d",
    routeMatcher: "/sales/control-tower", automatic: true, maxAutomaticDisplays: 1,
    steps: [g("buyer-control-tower", "salesCtPipeline", true)],
  },
] as const;

// ── Registry helpers ─────────────────────────────────────────────────────────
export function guidesForRole(role: Role): GuideDefinition[] {
  return GUIDE_REGISTRY.filter((g) => g.roles.includes(role));
}

export function guideById(id: string): GuideDefinition | undefined {
  return GUIDE_REGISTRY.find((g) => g.id === id);
}

/** Convert "/workspace/rfq/:id" into a regex matching slugs or uuids. */
export function routeMatches(pattern: string, pathname: string): boolean {
  const rx = new RegExp(
    "^" + pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\?:[A-Za-z]+/g, "[^/]+") + "/?$",
  );
  return rx.test(pathname);
}

/** Dev-time sanity: every registry id must exist in the shared contract list. */
export function validateRegistry(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const guide of GUIDE_REGISTRY) {
    if (!(ACADEMY_GUIDE_IDS as readonly string[]).includes(guide.id)) {
      errors.push(`Guide id not in contracts: ${guide.id}`);
    }
    if (seen.has(guide.id)) errors.push(`Duplicate guide id: ${guide.id}`);
    seen.add(guide.id);
    if (guide.steps.length === 0) errors.push(`Guide has no steps: ${guide.id}`);
    if (guide.automatic && guide.steps.length > 7) {
      errors.push(`Automatic guide exceeds 7 steps: ${guide.id}`);
    }
    for (const s of guide.steps) {
      if (s.selector && !s.selector.startsWith('[data-guide="')) {
        errors.push(`Unstable selector in ${guide.id}: ${s.selector}`);
      }
    }
  }
  return errors;
}

// apps/backend/src/routes.ts
// Single `/api` composition.
import { Router } from "express";
import authRoutes          from "./modules/auth/auth.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import healthRoutes, { readinessHandler } from "./modules/health/health.routes.js";
import versionRoutes from "./modules/health/version.routes.js";
import "./modules/rfq/rfq.service.read.js"; // attach prototype augmentations
import "./modules/rfq/rfq.service.procurement.js";
import "./modules/commoditybid/commoditybid.service.read.js";
import { rfqRouter, adminRfqRouter } from "./modules/rfq/rfq.routes.js";
import { commoditybidRouter, adminCommodityBidRouter } from "./modules/commoditybid/commoditybid.routes.js";
import { orderRouter } from "./modules/order/order.routes.js";
import orderDocumentsRoutes from "./modules/order/order.documents.routes.js";
import { shipmentRouter } from "./modules/shipment/shipment.routes.js";
import shipmentDocumentsRoutes from "./modules/shipment/shipment.documents.routes.js";
import attachmentsRoutes  from "./modules/attachments/attachments.routes.js";
import quotationsRoutes   from "./modules/quotations/quotations.routes.js";
import supplierActivityRoutes from "./modules/supplier-activity/supplier-activity.routes.js";
import telemetryRoutes    from "./modules/telemetry/telemetry.routes.js";
import { controlTowerRouter } from "./modules/control-tower/control-tower.routes.js";
import { freightiqRouter } from "./modules/freightiq/freightiq.routes.js";
import { tradeDocumentsRouter } from "./modules/trade-documents/documents.routes.js";
import { purchaseOrderRouter } from "./modules/purchase-order/purchase-order.routes.js";
import { conversationHubRouter } from "./modules/conversation-hub/conversation-hub.routes.js";
import passwordlessAccessRoutes from "./modules/passwordless-access/passwordless-access.routes.js";
import emailBridgeRoutes from "./modules/email-notification-bridge/email-bridge.routes.js";
import { workspaceInboxRouter } from "./modules/workspace-inbox/workspace-inbox.routes.js";
import { workspaceCommunicationRouter } from "./modules/workspace-communication/communication.routes.js";
import { scaleRouter } from "./modules/scale-readiness/scale.routes.js";
import { growthRouter } from "./modules/growth-engine/growth.routes.js";
import { marketRouter } from "./modules/market-intelligence/market.routes.js";
import { systemRouter } from "./modules/jobs/system.routes.js";
import { onboardingRouter } from "./modules/onboarding/onboarding.routes.js";
import { mixedContainerRouter } from "./modules/mixed-container/mixed-container.routes.js";
import { mixedContainerAdminRouter } from "./modules/mixed-container/mixed-container-admin.routes.js";
import { mixedContainerAllocationAdminRouter } from "./modules/mixed-container/mixed-container-allocation-admin.routes.js";
import { catalogRouter, adminCatalogRouter } from "./modules/mixed-container-catalog/catalog.routes.js";
import { bulkContainerRouter } from "./modules/bulk-container/bulk-container.routes.js";
import { bulkContainerAdminRouter } from "./modules/bulk-container/bulk-container-admin.routes.js";
import { bulkContainerAllocationAdminRouter } from "./modules/bulk-container/bulk-container-allocation-admin.routes.js";
import { bulkCatalogRouter, adminBulkCatalogRouter } from "./modules/bulk-container-catalog/catalog.routes.js";
import { packingTypeRouter, adminPackingTypeRouter } from "./modules/packing-type/packing-type.routes.js";
import integrationsRoutes from "./modules/integrations/integrations.routes.js";
import { portfolioRouter } from "./modules/portfolio/portfolio.routes.js";
import tradeRoutes from "./modules/trade/trade.routes.js";
import documentCenterRoutes from "./modules/document-center/document-center.routes.js";
import exceptionHubRoutes from "./modules/exception-hub/exception-hub.routes.js";
import { paymentRouter } from "./modules/payments/payment.routes.js";
import { orchestrationRouter } from "./modules/orchestration/orchestration.routes.js";
import { forwarderRouter } from "./modules/forwarder/forwarder.routes.js";
import { publicCatalogRfqRouter } from "./modules/integrations/catalog-rfq-ingest.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { conversationsRouter } from "./modules/chat/conversations.routes.js";
import { freightEstimateRouter } from "./modules/freight-estimate/freight-estimate.routes.js";
import { freightBookingRouter } from "./modules/freight-booking/freight-booking.routes.js";
import tradeTimelineRoutes from "./modules/trade-timeline/trade-timeline.routes.js";
import salesControlRouter from "./modules/sales-control/sales-control.routes.js";
import { asyncHandler } from "./middleware/asyncHandler.js";
import { idempotency } from "./middleware/idempotency.js";
import { telemetryBurstLimiter, adminAnalyticsLimiter } from "./middleware/rate-limit.js";

const api = Router();

api.use(idempotency);

api.use("/public", publicCatalogRfqRouter);
api.use("/healthz",       healthRoutes);
api.use("/version",       versionRoutes);
api.get("/ready", asyncHandler(readinessHandler));
api.use("/auth",          authRoutes);
api.use("/passwordless-access", passwordlessAccessRoutes);
api.use("/email-bridge", emailBridgeRoutes);
api.use("/notifications", notificationsRoutes);
api.use("/rfq/:id/attachments", attachmentsRoutes);  // Phase G1
api.use("/rfq/:id/quotations",  quotationsRoutes);   // Sprint 2.7
api.use("/rfq/:id/supplier-activity", supplierActivityRoutes);
api.use("/rfq",           rfqRouter);
api.use("/admin/rfq",     adminRfqRouter);
api.use("/commoditybid",  commoditybidRouter);
api.use("/admin/commoditybid", adminCommodityBidRouter);
api.use("/orders/:id/documents", orderDocumentsRoutes);
api.use("/orders", orderRouter);
api.use("/shipments/:id/documents", shipmentDocumentsRoutes);
api.use("/shipments", shipmentRouter);
api.use("/telemetry",     telemetryBurstLimiter, telemetryRoutes);
api.use("/control-tower", adminAnalyticsLimiter, controlTowerRouter);
api.use("/freightiq", freightiqRouter);
api.use("/scale", scaleRouter);
api.use("/growth", adminAnalyticsLimiter, growthRouter);
api.use("/market", adminAnalyticsLimiter, marketRouter);
api.use("/system", systemRouter);
api.use("/onboarding", onboardingRouter);
api.use("/mixed-containers", mixedContainerRouter);
api.use("/admin/mixed-containers", mixedContainerAdminRouter);
api.use("/admin/mixed-containers/allocations", mixedContainerAllocationAdminRouter);
api.use("/mixed-container/catalog", catalogRouter);
api.use("/admin/mixed-container/catalog", adminCatalogRouter);
api.use("/bulk-containers", bulkContainerRouter);
api.use("/admin/bulk-container/allocations", bulkContainerAllocationAdminRouter);
api.use("/admin/bulk-container", bulkContainerAdminRouter);
api.use("/bulk-container/catalog", bulkCatalogRouter);
api.use("/admin/bulk-container/catalog", adminBulkCatalogRouter);
api.use("/packing-types", packingTypeRouter);
api.use("/admin/packing-types", adminPackingTypeRouter);
api.use("/integrations", integrationsRoutes);
api.use("/portfolio", portfolioRouter);
api.use("/trades", tradeRoutes);
api.use("/documents", documentCenterRoutes);
api.use("/exceptions", exceptionHubRoutes);
api.use("/payments", paymentRouter);
api.use("/orchestration", orchestrationRouter);
api.use("/forwarder", forwarderRouter);
api.use("/trade-documents", tradeDocumentsRouter);
api.use("/purchase-orders", purchaseOrderRouter);
api.use("/chat", chatRouter);
api.use("/conversations", conversationsRouter);
api.use("/freight-estimates", freightEstimateRouter);
api.use("/freight-bookings", freightBookingRouter);
api.use("/trade-timeline", tradeTimelineRoutes);
api.use("/sales", salesControlRouter);
api.use("/workspace-inbox", workspaceInboxRouter);
api.use(
  "/workspaces/:workspaceType/:workspaceId/conversation",
  conversationHubRouter,
);
api.use(
  "/workspace-communication/:workspaceType/:workspaceId",
  workspaceCommunicationRouter,
);

export default api;

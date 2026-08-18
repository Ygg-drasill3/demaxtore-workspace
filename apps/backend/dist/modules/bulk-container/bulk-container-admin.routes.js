import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { bulkContainerAdminController } from "./bulk-container-admin.controller.js";
import { bulkContainerExecutionController } from "./bulk-container-execution.controller.js";
export const bulkContainerAdminRouter = Router();
bulkContainerAdminRouter.get("/kpis", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAdminController.kpis));
bulkContainerAdminRouter.get("/inbox", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAdminController.inbox));
bulkContainerAdminRouter.post("/actions/expire-offers", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAdminController.expireOffers));
bulkContainerAdminRouter.get("/procurement/:id", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAdminController.get));
bulkContainerAdminRouter.post("/procurement/:id/actions/start-procurement", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAdminController.startProcurement));
bulkContainerAdminRouter.post("/procurement/:id/actions/resume-procurement", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAdminController.resumeProcurement));
bulkContainerAdminRouter.post("/procurement/:id/quotes", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAdminController.upsertQuote));
bulkContainerAdminRouter.post("/procurement/:id/offers", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAdminController.createOffer));
bulkContainerAdminRouter.post("/procurement/:id/offers/:offerId/send", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAdminController.sendOffer));
bulkContainerAdminRouter.post("/:id/actions/spawn-execution-orders", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerExecutionController.spawn));
//# sourceMappingURL=bulk-container-admin.routes.js.map
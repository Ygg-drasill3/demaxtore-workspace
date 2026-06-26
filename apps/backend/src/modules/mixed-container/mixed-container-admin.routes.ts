import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { mixedContainerAdminController } from "./mixed-container-admin.controller.js";
import { mixedContainerExecutionController } from "./mixed-container-execution.controller.js";

export const mixedContainerAdminRouter = Router();

mixedContainerAdminRouter.get("/kpis", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.kpis));
mixedContainerAdminRouter.get("/inbox", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.inbox));
mixedContainerAdminRouter.get("/:id", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.get));
mixedContainerAdminRouter.post("/:id/actions/start-procurement", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.startProcurement));
mixedContainerAdminRouter.post("/:id/actions/assign-manager", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.assignManager));
mixedContainerAdminRouter.post("/:id/procurement-quotes", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.upsertQuote));
mixedContainerAdminRouter.post("/:id/offers", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.createOffer));
mixedContainerAdminRouter.post("/:id/offers/:offerId/send", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.sendOffer));
mixedContainerAdminRouter.post("/:id/actions/resume-procurement", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.resumeProcurement));
mixedContainerAdminRouter.post("/actions/expire-offers", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.expireOffers));
mixedContainerAdminRouter.post("/:id/actions/spawn-execution-orders", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerExecutionController.spawn));

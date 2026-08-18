import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { mixedContainerAdminController } from "./mixed-container-admin.controller.js";
import { mixedContainerExecutionController } from "./mixed-container-execution.controller.js";
import { mixedContainerOrganizationAdminController } from "./mixed-container-organization-admin.controller.js";

export const mixedContainerAdminRouter = Router();

mixedContainerAdminRouter.get("/kpis", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.kpis));
mixedContainerAdminRouter.get("/inbox", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.inbox));
mixedContainerAdminRouter.get("/procurement-managers", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.procurementManagers));
mixedContainerAdminRouter.get("/organization/:id", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerOrganizationAdminController.get));
mixedContainerAdminRouter.post("/organization/:id/actions/update-status", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerOrganizationAdminController.updateStatus));
mixedContainerAdminRouter.post("/organization/:id/actions/assign-manager", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerOrganizationAdminController.assignManager));
mixedContainerAdminRouter.post("/organization/:id/internal-notes", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerOrganizationAdminController.addInternalNote));
mixedContainerAdminRouter.get("/:id/procurement-request", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.procurementRequest));
mixedContainerAdminRouter.post("/:id/internal-notes", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.addInternalNote));
mixedContainerAdminRouter.get("/:id", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.get));
mixedContainerAdminRouter.post("/:id/actions/start-procurement", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.startProcurement));
mixedContainerAdminRouter.post("/:id/actions/assign-manager", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.assignManager));
mixedContainerAdminRouter.post("/:id/procurement-quotes", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.upsertQuote));
mixedContainerAdminRouter.post("/:id/offers", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.createOffer));
mixedContainerAdminRouter.post("/:id/offers/:offerId/send", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.sendOffer));
mixedContainerAdminRouter.post("/:id/actions/resume-procurement", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.resumeProcurement));
mixedContainerAdminRouter.post("/actions/expire-offers", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAdminController.expireOffers));
mixedContainerAdminRouter.post("/:id/actions/spawn-execution-orders", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerExecutionController.spawn));

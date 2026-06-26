import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { mixedContainerController } from "./mixed-container.controller.js";

export const mixedContainerRouter = Router();

mixedContainerRouter.get("/", requireAuth, requireRole("BUYER", "ADMIN"), asyncHandler(mixedContainerController.list));
mixedContainerRouter.post("/", requireAuth, requireRole("BUYER"), asyncHandler(mixedContainerController.create));
mixedContainerRouter.get("/offers/:offerId", requireAuth, requireRole("BUYER", "ADMIN"), asyncHandler(mixedContainerController.getOffer));
mixedContainerRouter.post("/offers/:offerId/actions/approve", requireAuth, requireRole("BUYER"), asyncHandler(mixedContainerController.approveOffer));
mixedContainerRouter.post("/offers/:offerId/actions/request-revision", requireAuth, requireRole("BUYER"), asyncHandler(mixedContainerController.requestRevision));
mixedContainerRouter.get("/:id", requireAuth, asyncHandler(mixedContainerController.get));
mixedContainerRouter.patch("/:id", requireAuth, requireRole("BUYER"), asyncHandler(mixedContainerController.update));
mixedContainerRouter.post("/:id/lines", requireAuth, requireRole("BUYER"), asyncHandler(mixedContainerController.addLine));
mixedContainerRouter.patch("/:id/lines/:lineId", requireAuth, requireRole("BUYER"), asyncHandler(mixedContainerController.updateLine));
mixedContainerRouter.delete("/:id/lines/:lineId", requireAuth, requireRole("BUYER"), asyncHandler(mixedContainerController.removeLine));
mixedContainerRouter.post("/:id/actions/request-pricing", requireAuth, requireRole("BUYER"), asyncHandler(mixedContainerController.requestPricing));
mixedContainerRouter.get("/:id/coordination", requireAuth, requireRole("BUYER", "ADMIN"), asyncHandler(mixedContainerController.coordination));
mixedContainerRouter.get("/:id/execution", requireAuth, requireRole("BUYER", "ADMIN"), asyncHandler(mixedContainerController.execution));
mixedContainerRouter.post("/:id/proformas/:proformaId/review", requireAuth, requireRole("BUYER"), asyncHandler(mixedContainerController.reviewProforma));
mixedContainerRouter.patch("/:id/payments/:paymentId", requireAuth, requireRole("BUYER"), asyncHandler(mixedContainerController.updatePayment));
mixedContainerRouter.get("/:id/timeline", requireAuth, asyncHandler(mixedContainerController.timeline));

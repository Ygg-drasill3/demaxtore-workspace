import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { bulkContainerController } from "./bulk-container.controller.js";
import { bulkContainerExecutionController } from "./bulk-container-execution.controller.js";

export const bulkContainerRouter = Router();

bulkContainerRouter.get("/:id/coordination", requireAuth, requireRole("BUYER", "ADMIN"), asyncHandler(bulkContainerController.getCoordination));
bulkContainerRouter.get("/:id/execution", requireAuth, requireRole("BUYER", "ADMIN"), asyncHandler(bulkContainerExecutionController.getExecution));
bulkContainerRouter.get("/offers/:offerId", requireAuth, requireRole("BUYER", "ADMIN"), asyncHandler(bulkContainerController.getOffer));
bulkContainerRouter.post("/offers/:offerId/actions/approve", requireAuth, requireRole("BUYER"), asyncHandler(bulkContainerController.approveOffer));
bulkContainerRouter.post("/offers/:offerId/actions/request-revision", requireAuth, requireRole("BUYER"), asyncHandler(bulkContainerController.requestRevision));
bulkContainerRouter.get("/", requireAuth, requireRole("BUYER", "ADMIN"), asyncHandler(bulkContainerController.list));
bulkContainerRouter.post("/actions/ensure-active", requireAuth, requireRole("BUYER"), asyncHandler(bulkContainerController.ensureActiveBuilding));
bulkContainerRouter.post("/", requireAuth, requireRole("BUYER"), asyncHandler(bulkContainerController.create));
bulkContainerRouter.get("/:id", requireAuth, asyncHandler(bulkContainerController.get));
bulkContainerRouter.patch("/:id", requireAuth, requireRole("BUYER"), asyncHandler(bulkContainerController.update));
bulkContainerRouter.post("/:id/lines", requireAuth, requireRole("BUYER"), asyncHandler(bulkContainerController.addLine));
bulkContainerRouter.patch("/:id/lines/:lineId", requireAuth, requireRole("BUYER"), asyncHandler(bulkContainerController.updateLine));
bulkContainerRouter.delete("/:id/lines/:lineId", requireAuth, requireRole("BUYER"), asyncHandler(bulkContainerController.removeLine));
bulkContainerRouter.post("/:id/actions/submit", requireAuth, requireRole("BUYER"), asyncHandler(bulkContainerController.submitRequest));
bulkContainerRouter.get("/:id/timeline", requireAuth, asyncHandler(bulkContainerController.timeline));

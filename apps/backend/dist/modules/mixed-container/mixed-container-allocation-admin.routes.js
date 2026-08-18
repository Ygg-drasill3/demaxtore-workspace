import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { mixedContainerAllocationAdminController } from "./mixed-container-allocation-admin.controller.js";
export const mixedContainerAllocationAdminRouter = Router();
mixedContainerAllocationAdminRouter.get("/kpis", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAllocationAdminController.kpis));
mixedContainerAllocationAdminRouter.get("/inbox", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAllocationAdminController.inbox));
mixedContainerAllocationAdminRouter.get("/:id", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAllocationAdminController.get));
mixedContainerAllocationAdminRouter.post("/:id/actions/start-allocation", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAllocationAdminController.startAllocation));
mixedContainerAllocationAdminRouter.post("/:id/allocations", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAllocationAdminController.createAllocation));
mixedContainerAllocationAdminRouter.post("/:id/actions/complete-allocations", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAllocationAdminController.completeAllocations));
mixedContainerAllocationAdminRouter.post("/:id/allocations/:allocationId/proformas", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAllocationAdminController.uploadProforma));
mixedContainerAllocationAdminRouter.post("/:id/payments", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAllocationAdminController.createPayment));
mixedContainerAllocationAdminRouter.patch("/:id/payments/:paymentId", requireAuth, requireRole("ADMIN"), asyncHandler(mixedContainerAllocationAdminController.updatePayment));
//# sourceMappingURL=mixed-container-allocation-admin.routes.js.map
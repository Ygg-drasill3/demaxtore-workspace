import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { bulkContainerAllocationAdminController } from "./bulk-container-allocation-admin.controller.js";
export const bulkContainerAllocationAdminRouter = Router();
bulkContainerAllocationAdminRouter.get("/kpis", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAllocationAdminController.kpis));
bulkContainerAllocationAdminRouter.get("/inbox", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAllocationAdminController.inbox));
bulkContainerAllocationAdminRouter.get("/:id", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAllocationAdminController.get));
bulkContainerAllocationAdminRouter.post("/:id/actions/start-allocation", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAllocationAdminController.startAllocation));
bulkContainerAllocationAdminRouter.post("/:id/allocations", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAllocationAdminController.createAllocation));
bulkContainerAllocationAdminRouter.post("/:id/actions/complete-allocations", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAllocationAdminController.completeAllocations));
bulkContainerAllocationAdminRouter.post("/:id/allocations/:allocationId/proformas", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAllocationAdminController.uploadProforma));
bulkContainerAllocationAdminRouter.patch("/:id/payments/:paymentId", requireAuth, requireRole("ADMIN"), asyncHandler(bulkContainerAllocationAdminController.updatePayment));
//# sourceMappingURL=bulk-container-allocation-admin.routes.js.map
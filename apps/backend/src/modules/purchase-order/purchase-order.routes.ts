import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { purchaseOrderController } from "./purchase-order.controller.js";

export const purchaseOrderRouter = Router();

purchaseOrderRouter.get(
  "/dashboard",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(purchaseOrderController.dashboard),
);

purchaseOrderRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(purchaseOrderController.get),
);

purchaseOrderRouter.post(
  "/:id/actions/:action",
  requireAuth,
  asyncHandler(purchaseOrderController.action),
);

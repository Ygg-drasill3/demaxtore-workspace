import { Router } from "express";
import {
  LandedCostCalculateSchema,
  TransactionCostCreateSchema,
} from "@dmx/contracts/landed-cost";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { landedCostController } from "./landed-cost.controller.js";

export const landedCostRouter = Router();

const managers = [
  "BUYER",
  "ADMIN",
  "SUPER_ADMIN",
  "OPS_MANAGER",
  "LOGISTICS_OPERATOR",
  "FINANCE_OPERATOR",
  "DOCUMENT_CONTROLLER",
] as const;

landedCostRouter.get(
  "/",
  requireAuth,
  requireRole(...managers),
  asyncHandler(landedCostController.list),
);

landedCostRouter.post(
  "/calculate",
  requireAuth,
  requireRole(...managers),
  validateBody(LandedCostCalculateSchema),
  asyncHandler(landedCostController.calculate),
);

landedCostRouter.post(
  "/transaction-costs",
  requireAuth,
  requireRole(...managers, "CUSTOMS_BROKER"),
  validateBody(TransactionCostCreateSchema),
  asyncHandler(landedCostController.addCost),
);

landedCostRouter.get(
  "/by-shipment/:shipmentWorkspaceId",
  requireAuth,
  requireRole(...managers),
  asyncHandler(landedCostController.byShipment),
);

landedCostRouter.get(
  "/by-shipment/:shipmentWorkspaceId/versions",
  requireAuth,
  requireRole(...managers),
  asyncHandler(landedCostController.versions),
);

landedCostRouter.get(
  "/:id",
  requireAuth,
  requireRole(...managers),
  asyncHandler(landedCostController.get),
);

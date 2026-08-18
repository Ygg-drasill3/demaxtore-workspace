import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { freightEstimateController } from "./freight-estimate.controller.js";
export const freightEstimateRouter = Router();
freightEstimateRouter.get("/kpi/estimated-cif-ready", requireAuth, requireRole("BUYER", "ADMIN"), asyncHandler(freightEstimateController.kpi));
freightEstimateRouter.get("/panel", requireAuth, asyncHandler(freightEstimateController.panel));
freightEstimateRouter.get("/", requireAuth, asyncHandler(freightEstimateController.list));
freightEstimateRouter.get("/:id", requireAuth, asyncHandler(freightEstimateController.get));
freightEstimateRouter.post("/", requireAuth, requireRole("BUYER", "ADMIN"), asyncHandler(freightEstimateController.create));
freightEstimateRouter.post("/:id/refresh", requireAuth, requireRole("BUYER", "ADMIN"), asyncHandler(freightEstimateController.refresh));
//# sourceMappingURL=freight-estimate.routes.js.map
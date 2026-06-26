import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { tradeTimelineController } from "./trade-timeline.controller.js";

const tradeTimelineRouter = Router();

tradeTimelineRouter.get(
  "/kpi/summary",
  requireAuth,
  requireRole("ADMIN", "BUYER", "SALES_CONTROL"),
  asyncHandler(tradeTimelineController.kpi),
);

tradeTimelineRouter.get(
  "/:tradeId",
  requireAuth,
  asyncHandler(tradeTimelineController.getTimeline),
);

export default tradeTimelineRouter;

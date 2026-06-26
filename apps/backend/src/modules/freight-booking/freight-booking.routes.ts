import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { freightBookingController } from "./freight-booking.controller.js";

export const freightBookingRouter = Router();

freightBookingRouter.get(
  "/kpi/summary",
  requireAuth,
  requireRole("ADMIN", "BUYER"),
  asyncHandler(freightBookingController.kpi),
);

freightBookingRouter.get(
  "/panel",
  requireAuth,
  asyncHandler(freightBookingController.panel),
);

freightBookingRouter.get(
  "/",
  requireAuth,
  asyncHandler(freightBookingController.list),
);

freightBookingRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(freightBookingController.get),
);

freightBookingRouter.post(
  "/",
  requireAuth,
  asyncHandler(freightBookingController.create),
);

freightBookingRouter.post(
  "/:id/select",
  requireAuth,
  requireRole("ADMIN", "BUYER"),
  asyncHandler(freightBookingController.select),
);

freightBookingRouter.post(
  "/:id/confirm",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(freightBookingController.confirm),
);

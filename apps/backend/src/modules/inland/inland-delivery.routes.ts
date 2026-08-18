import { Router } from "express";
import {
  InlandCancelSchema,
  InlandConfirmSchema,
  InlandCostSchema,
  RequestInlandDeliverySchema,
  SchedulePickupSchema,
} from "@dmx/contracts/inland-delivery";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { inlandDeliveryController } from "./inland-delivery.controller.js";

export const inlandDeliveryRouter = Router();

const managers = [
  "BUYER",
  "ADMIN",
  "SUPER_ADMIN",
  "OPS_MANAGER",
  "LOGISTICS_OPERATOR",
  "DOCUMENT_CONTROLLER",
] as const;

const managersAndTrucker = [...managers, "TRUCKER"] as const;

inlandDeliveryRouter.get(
  "/",
  requireAuth,
  requireRole(...managers),
  asyncHandler(inlandDeliveryController.list),
);

inlandDeliveryRouter.post(
  "/request",
  requireAuth,
  requireRole(...managers),
  validateBody(RequestInlandDeliverySchema),
  asyncHandler(inlandDeliveryController.request),
);

inlandDeliveryRouter.get(
  "/by-shipment/:shipmentWorkspaceId",
  requireAuth,
  requireRole(...managersAndTrucker),
  asyncHandler(inlandDeliveryController.byShipment),
);

inlandDeliveryRouter.get(
  "/:id",
  requireAuth,
  requireRole(...managersAndTrucker),
  asyncHandler(inlandDeliveryController.get),
);

inlandDeliveryRouter.get(
  "/:id/events",
  requireAuth,
  requireRole(...managersAndTrucker),
  asyncHandler(inlandDeliveryController.events),
);

inlandDeliveryRouter.post(
  "/:id/sync-trucker",
  requireAuth,
  requireRole(...managers),
  asyncHandler(inlandDeliveryController.syncTrucker),
);

inlandDeliveryRouter.post(
  "/:id/schedule-pickup",
  requireAuth,
  requireRole(...managersAndTrucker),
  validateBody(SchedulePickupSchema),
  asyncHandler(inlandDeliveryController.schedulePickup),
);

inlandDeliveryRouter.post(
  "/:id/ready-for-pickup",
  requireAuth,
  requireRole(...managers),
  asyncHandler(inlandDeliveryController.readyForPickup),
);

inlandDeliveryRouter.post(
  "/:id/confirm-pickup",
  requireAuth,
  requireRole(...managersAndTrucker),
  validateBody(InlandConfirmSchema),
  asyncHandler(inlandDeliveryController.confirmPickup),
);

inlandDeliveryRouter.post(
  "/:id/gate-out",
  requireAuth,
  requireRole(...managersAndTrucker),
  validateBody(InlandConfirmSchema),
  asyncHandler(inlandDeliveryController.gateOut),
);

inlandDeliveryRouter.post(
  "/:id/in-transit",
  requireAuth,
  requireRole(...managersAndTrucker),
  validateBody(InlandConfirmSchema),
  asyncHandler(inlandDeliveryController.inTransit),
);

inlandDeliveryRouter.post(
  "/:id/mark-delivered",
  requireAuth,
  requireRole(...managersAndTrucker),
  validateBody(InlandConfirmSchema),
  asyncHandler(inlandDeliveryController.markDelivered),
);

inlandDeliveryRouter.post(
  "/:id/link-pod",
  requireAuth,
  requireRole(...managersAndTrucker),
  asyncHandler(inlandDeliveryController.linkPod),
);

inlandDeliveryRouter.post(
  "/:id/cost",
  requireAuth,
  requireRole(...managers),
  validateBody(InlandCostSchema),
  asyncHandler(inlandDeliveryController.recordCost),
);

inlandDeliveryRouter.post(
  "/:id/cancel",
  requireAuth,
  requireRole(...managers),
  validateBody(InlandCancelSchema),
  asyncHandler(inlandDeliveryController.cancel),
);

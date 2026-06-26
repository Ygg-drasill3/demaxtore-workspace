import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { shipmentController } from "./shipment.controller.js";

export const shipmentRouter = Router();

shipmentRouter.get("/portfolio", requireAuth, asyncHandler(shipmentController.portfolio));
shipmentRouter.get("/:id/exceptions", requireAuth, shipmentController.shipmentExceptions);
shipmentRouter.get("/:id/documents", requireAuth, shipmentController.shipmentDocuments);
shipmentRouter.get("/tracking/config", requireAuth, asyncHandler(shipmentController.trackingConfig));

shipmentRouter.get("/:id", requireAuth, asyncHandler(shipmentController.get));
shipmentRouter.get("/:id/timeline", requireAuth, asyncHandler(shipmentController.timeline));
shipmentRouter.get("/:id/exceptions", requireAuth, asyncHandler(shipmentController.exceptions));
shipmentRouter.get("/:id/next-actions", requireAuth, asyncHandler(shipmentController.nextActions));
shipmentRouter.get("/:id/tracking", requireAuth, asyncHandler(shipmentController.tracking));
shipmentRouter.get("/:id/tracking/events", requireAuth, asyncHandler(shipmentController.trackingEvents));
shipmentRouter.post("/:id/link-tracking", requireAuth, asyncHandler(shipmentController.linkTracking));
shipmentRouter.post("/:id/sync-tracking", requireAuth, asyncHandler(shipmentController.syncTracking));

shipmentRouter.post("/:id/actions/confirm-booking", requireAuth, asyncHandler(shipmentController.action("confirm_booking")));
shipmentRouter.post("/:id/actions/assign-container", requireAuth, asyncHandler(shipmentController.action("assign_container")));
shipmentRouter.post("/:id/actions/pickup-cargo", requireAuth, asyncHandler(shipmentController.action("pickup_cargo")));
shipmentRouter.post("/:id/actions/arrive-origin-port", requireAuth, asyncHandler(shipmentController.action("arrive_origin_port")));
shipmentRouter.post("/:id/actions/load-vessel", requireAuth, asyncHandler(shipmentController.action("load_vessel")));
shipmentRouter.post("/:id/actions/depart-vessel", requireAuth, asyncHandler(shipmentController.action("depart_vessel")));
shipmentRouter.post("/:id/actions/arrive-destination", requireAuth, asyncHandler(shipmentController.action("arrive_destination")));
shipmentRouter.post("/:id/actions/start-customs", requireAuth, asyncHandler(shipmentController.action("start_customs")));
shipmentRouter.post("/:id/actions/complete-customs", requireAuth, asyncHandler(shipmentController.action("complete_customs")));
shipmentRouter.post("/:id/actions/ready-delivery", requireAuth, asyncHandler(shipmentController.action("ready_delivery")));
shipmentRouter.post("/:id/actions/confirm-partial-delivery", requireAuth, asyncHandler(shipmentController.action("confirm_partial_delivery")));
shipmentRouter.post("/:id/actions/confirm-delivery", requireAuth, asyncHandler(shipmentController.action("confirm_delivery")));
shipmentRouter.post("/:id/actions/reject-shipment", requireAuth, asyncHandler(shipmentController.action("reject_shipment")));
shipmentRouter.post("/:id/actions/complete-shipment", requireAuth, asyncHandler(shipmentController.action("complete_shipment")));
shipmentRouter.post("/:id/actions/report-exception", requireAuth, asyncHandler(shipmentController.action("report_exception")));
shipmentRouter.post("/:id/actions/resolve-exception", requireAuth, asyncHandler(shipmentController.action("resolve_exception")));
shipmentRouter.post("/:id/actions/cancel-shipment", requireAuth, asyncHandler(shipmentController.action("cancel_shipment")));
shipmentRouter.post("/:id/actions/upload-document", requireAuth, asyncHandler(shipmentController.action("upload_document")));

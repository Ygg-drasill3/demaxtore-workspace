import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { orderController } from "./order.controller.js";
import { purchaseOrderController } from "../purchase-order/purchase-order.controller.js";

export const orderRouter = Router();

orderRouter.get("/", requireAuth, asyncHandler(orderController.list));
orderRouter.get("/:id", requireAuth, asyncHandler(orderController.get));
orderRouter.get("/:id/purchase-order", requireAuth, asyncHandler(purchaseOrderController.byOrder));
orderRouter.get("/:id/timeline", requireAuth, asyncHandler(orderController.timeline));
orderRouter.get("/:id/documents", requireAuth, asyncHandler(orderController.documents));
orderRouter.get("/:id/status-updates", requireAuth, asyncHandler(orderController.statusUpdates));
orderRouter.get("/:id/next-actions", requireAuth, asyncHandler(orderController.nextActions));
orderRouter.get("/:id/spawned-shipments", requireAuth, asyncHandler(orderController.spawnedShipments));

orderRouter.post("/:id/actions/supplier-confirm-order", requireAuth, asyncHandler(orderController.action("supplier_confirm_order")));
orderRouter.post("/:id/actions/start-production", requireAuth, asyncHandler(orderController.action("start_production")));
orderRouter.post("/:id/actions/report-production-progress", requireAuth, asyncHandler(orderController.action("report_production_progress")));
orderRouter.post("/:id/actions/mark-production-completed", requireAuth, asyncHandler(orderController.action("mark_production_completed")));
orderRouter.post("/:id/actions/request-inspection", requireAuth, asyncHandler(orderController.action("request_inspection")));
orderRouter.post("/:id/actions/skip-inspection", requireAuth, asyncHandler(orderController.action("skip_inspection")));
orderRouter.post("/:id/actions/record-inspection-result", requireAuth, asyncHandler(orderController.action("record_inspection_result")));
orderRouter.post("/:id/actions/proceed-to-freight", requireAuth, asyncHandler(orderController.action("proceed_to_freight")));
orderRouter.post("/:id/actions/book-shipment", requireAuth, asyncHandler(orderController.action("book_shipment")));
orderRouter.post("/:id/actions/mark-departed", requireAuth, asyncHandler(orderController.action("mark_departed")));
orderRouter.post("/:id/actions/update-eta", requireAuth, asyncHandler(orderController.action("update_eta")));
orderRouter.post("/:id/actions/mark-arrived", requireAuth, asyncHandler(orderController.action("mark_arrived")));
orderRouter.post("/:id/actions/mark-partially-delivered", requireAuth, asyncHandler(orderController.action("mark_partially_delivered")));
orderRouter.post("/:id/actions/mark-delivered", requireAuth, asyncHandler(orderController.action("mark_delivered")));
orderRouter.post("/:id/actions/reject-order", requireAuth, asyncHandler(orderController.action("reject_order")));
orderRouter.post("/:id/actions/close-order", requireAuth, asyncHandler(orderController.action("close_order")));
orderRouter.post("/:id/actions/open-dispute", requireAuth, asyncHandler(orderController.action("open_dispute")));
orderRouter.post("/:id/actions/resolve-dispute-close", requireAuth, asyncHandler(orderController.action("resolve_dispute_close")));
orderRouter.post("/:id/actions/resolve-dispute-cancel", requireAuth, asyncHandler(orderController.action("resolve_dispute_cancel")));
orderRouter.post("/:id/actions/cancel-order", requireAuth, asyncHandler(orderController.action("cancel_order")));
orderRouter.post("/:id/actions/upload-document", requireAuth, asyncHandler(orderController.action("upload_document")));

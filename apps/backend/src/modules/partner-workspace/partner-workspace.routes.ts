import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { partnerWorkspaceController } from "./partner-workspace.controller.js";

export const partnerWorkspaceRouter = Router();

partnerWorkspaceRouter.use(requireAuth);

partnerWorkspaceRouter.get("/home", asyncHandler(partnerWorkspaceController.home));
partnerWorkspaceRouter.get(
  "/transactions",
  asyncHandler(partnerWorkspaceController.listTransactions),
);
partnerWorkspaceRouter.get(
  "/transactions/:workspaceId",
  asyncHandler(partnerWorkspaceController.getTransaction),
);
partnerWorkspaceRouter.post(
  "/tasks/:taskId/complete",
  asyncHandler(partnerWorkspaceController.completeTask),
);
partnerWorkspaceRouter.post(
  "/orders/:orderId/confirm-cargo-ready",
  asyncHandler(partnerWorkspaceController.confirmCargoReady),
);
partnerWorkspaceRouter.post(
  "/shipments/:shipmentId/confirm-gate-in",
  asyncHandler(partnerWorkspaceController.confirmGateIn),
);
partnerWorkspaceRouter.get(
  "/assignable",
  asyncHandler(partnerWorkspaceController.listAssignable),
);
partnerWorkspaceRouter.get(
  "/assignments",
  asyncHandler(partnerWorkspaceController.listAssignments),
);
partnerWorkspaceRouter.post("/assignments", asyncHandler(partnerWorkspaceController.assign));
partnerWorkspaceRouter.post(
  "/assignments/:assignmentId/revoke",
  asyncHandler(partnerWorkspaceController.revoke),
);

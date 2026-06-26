// =============================================================================
// DeMaxtore — RFQ Express routes
// Destination: apps/backend/src/modules/rfq/rfq.routes.ts
// =============================================================================
import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { rfqController } from "./rfq.controller";

export const rfqRouter = Router();

// ---- Reads ----
rfqRouter.get("/",                          requireAuth, asyncHandler(rfqController.list));
rfqRouter.get("/:id",                       requireAuth, asyncHandler(rfqController.get));
rfqRouter.get("/:id/timeline",              requireAuth, asyncHandler(rfqController.timeline));
rfqRouter.get("/:id/clarifications",        requireAuth, asyncHandler(rfqController.listClarifications));
rfqRouter.get("/:id/attachments",           requireAuth, asyncHandler(rfqController.listAttachments));
// GET /:id/quotations → quotations.routes.ts (mounted at /rfq/:id/quotations)
rfqRouter.get("/:id/next-actions",          requireAuth, asyncHandler(rfqController.nextActions));
rfqRouter.get("/:id/spawned-orders",        requireAuth, asyncHandler(rfqController.spawnedOrders));

// ---- Buyer drafts ----
rfqRouter.post  ("/",                       requireAuth, requireRole("BUYER"), asyncHandler(rfqController.createDraft));
rfqRouter.patch ("/:id/draft",              requireAuth, requireRole("BUYER"), asyncHandler(rfqController.editDraft));
rfqRouter.post  ("/:id/trash",              requireAuth, requireRole("ADMIN"), asyncHandler(rfqController.trash));
rfqRouter.post  ("/:id/restore",            requireAuth, requireRole("ADMIN"), asyncHandler(rfqController.restore));

// Sprint 11A — procurement strategy (buyer must choose after RFQ creation)
rfqRouter.post("/:id/procurement-strategy", requireAuth, requireRole("BUYER"), asyncHandler(rfqController.selectProcurementStrategy));
rfqRouter.post("/:id/spawn-commoditybid",    requireAuth, requireRole("BUYER"), asyncHandler(rfqController.spawnCommodityBidFromRfq));

// ---- FSM actions (POST /:id/actions/:action) ----
// Each action invokes applyTransition() — controller maps action name to FSM call.
rfqRouter.post("/:id/actions/submit",            requireAuth, requireRole("BUYER"),         asyncHandler(rfqController.action("submit_rfq")));
rfqRouter.post("/:id/actions/withdraw",          requireAuth, requireRole("BUYER"),         asyncHandler(rfqController.action("withdraw_rfq")));
rfqRouter.post("/:id/actions/cancel",            requireAuth, requireRole("BUYER","ADMIN"), asyncHandler(rfqController.action("cancel_rfq")));
rfqRouter.post("/:id/actions/revise-rejected",   requireAuth, requireRole("BUYER"),         asyncHandler(rfqController.action("revise_rejected_rfq")));

rfqRouter.post("/:id/actions/assign-suppliers",  requireAuth, requireRole("ADMIN"),         asyncHandler(rfqController.action("assign_suppliers")));
rfqRouter.post("/:id/actions/add-suppliers",     requireAuth, requireRole("ADMIN"),         asyncHandler(rfqController.action("add_more_suppliers")));
rfqRouter.post("/:id/actions/remove-supplier",   requireAuth, requireRole("ADMIN"),         asyncHandler(rfqController.action("remove_supplier")));
rfqRouter.post("/:id/actions/reject",            requireAuth, requireRole("ADMIN"),         asyncHandler(rfqController.action("reject_rfq")));
rfqRouter.post("/:id/actions/publish",           requireAuth, requireRole("ADMIN"),         asyncHandler(rfqController.action("publish_rfq")));
rfqRouter.post("/:id/actions/reopen-quotations", requireAuth, requireRole("ADMIN"),         asyncHandler(rfqController.action("reopen_quotations")));

rfqRouter.post("/:id/actions/extend-deadline",   requireAuth, requireRole("BUYER","ADMIN"), asyncHandler(rfqController.action("extend_deadline")));
rfqRouter.post("/:id/actions/close-quotations",  requireAuth, requireRole("BUYER"),         asyncHandler(rfqController.action("close_quotations_early")));
rfqRouter.post("/:id/actions/start-evaluation",  requireAuth, requireRole("BUYER"),         asyncHandler(rfqController.action("start_evaluation")));
rfqRouter.post("/:id/actions/select-supplier",   requireAuth, requireRole("BUYER"),         asyncHandler(rfqController.action("select_supplier")));
rfqRouter.post("/:id/actions/revert-selection",  requireAuth, requireRole("BUYER"),         asyncHandler(rfqController.action("revert_selection")));
rfqRouter.post("/:id/actions/close-without-award", requireAuth, requireRole("BUYER"),       asyncHandler(rfqController.action("close_without_award")));

rfqRouter.post("/:id/actions/request-proforma",  requireAuth, requireRole("BUYER"),         asyncHandler(rfqController.action("request_proforma")));
rfqRouter.post("/:id/actions/submit-proforma",   requireAuth, requireRole("SUPPLIER"),      asyncHandler(rfqController.action("submit_proforma")));
rfqRouter.post("/:id/actions/decline-proforma",  requireAuth, requireRole("SUPPLIER"),      asyncHandler(rfqController.action("decline_proforma")));
rfqRouter.post("/:id/actions/approve-proforma",  requireAuth, requireRole("BUYER"),         asyncHandler(rfqController.action("approve_proforma")));
rfqRouter.post("/:id/actions/reject-proforma",   requireAuth, requireRole("BUYER"),         asyncHandler(rfqController.action("reject_proforma")));
rfqRouter.post("/:id/actions/issue-po",          requireAuth, requireRole("BUYER"),         asyncHandler(rfqController.action("issue_po")));
rfqRouter.post("/:id/actions/add-observer",      requireAuth, requireRole("ADMIN"),         asyncHandler(rfqController.action("add_observer")));
rfqRouter.post("/:id/actions/remove-observer",   requireAuth, requireRole("ADMIN"),         asyncHandler(rfqController.action("remove_observer")));

// ---- Clarifications (self-loop transition) ----
rfqRouter.post("/:id/clarifications",            requireAuth, asyncHandler(rfqController.postClarification));
rfqRouter.post("/:id/clarifications/:messageId/read", requireAuth, asyncHandler(rfqController.markClarificationRead));

// ---- Admin operational ----
export const adminRfqRouter = Router();
adminRfqRouter.get("/queue",     requireAuth, requireRole("ADMIN"), asyncHandler(rfqController.adminQueue));
adminRfqRouter.get("/suppliers", requireAuth, requireRole("ADMIN"), asyncHandler(rfqController.lookupSuppliers));
adminRfqRouter.post("/run-scheduler-tick", requireAuth, requireRole("ADMIN"), asyncHandler(rfqController.runSchedulerTick));

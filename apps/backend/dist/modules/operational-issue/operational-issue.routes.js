import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { operationalIssueController } from "./operational-issue.controller.js";
export const operationalIssueRouter = Router();
operationalIssueRouter.get("/", requireAuth, asyncHandler(operationalIssueController.list));
operationalIssueRouter.get("/summary", requireAuth, asyncHandler(operationalIssueController.summary));
operationalIssueRouter.post("/", requireAuth, asyncHandler(operationalIssueController.create));
operationalIssueRouter.get("/:id", requireAuth, asyncHandler(operationalIssueController.get));
operationalIssueRouter.patch("/:id", requireAuth, asyncHandler(operationalIssueController.patch));
operationalIssueRouter.post("/:id/resolve", requireAuth, asyncHandler(operationalIssueController.resolve));
operationalIssueRouter.post("/:id/reopen", requireAuth, asyncHandler(operationalIssueController.reopen));
operationalIssueRouter.delete("/:id", requireAuth, asyncHandler(operationalIssueController.softDelete));
//# sourceMappingURL=operational-issue.routes.js.map
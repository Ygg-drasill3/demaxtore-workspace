import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { operationalTaskController } from "./operational-task.controller.js";
export const operationalTaskRouter = Router();
operationalTaskRouter.get("/", requireAuth, asyncHandler(operationalTaskController.list));
operationalTaskRouter.get("/summary", requireAuth, asyncHandler(operationalTaskController.summary));
operationalTaskRouter.post("/", requireAuth, asyncHandler(operationalTaskController.create));
operationalTaskRouter.get("/:id", requireAuth, asyncHandler(operationalTaskController.get));
operationalTaskRouter.patch("/:id", requireAuth, asyncHandler(operationalTaskController.patch));
operationalTaskRouter.post("/:id/assign", requireAuth, asyncHandler(operationalTaskController.assign));
operationalTaskRouter.post("/:id/start", requireAuth, asyncHandler(operationalTaskController.start));
operationalTaskRouter.post("/:id/complete", requireAuth, asyncHandler(operationalTaskController.complete));
operationalTaskRouter.post("/:id/cancel", requireAuth, asyncHandler(operationalTaskController.cancel));
operationalTaskRouter.delete("/:id", requireAuth, asyncHandler(operationalTaskController.softDelete));
operationalTaskRouter.get("/:id/comments", requireAuth, asyncHandler(operationalTaskController.listComments));
operationalTaskRouter.post("/:id/comments", requireAuth, asyncHandler(operationalTaskController.addComment));
operationalTaskRouter.delete("/:id/comments/:commentId", requireAuth, asyncHandler(operationalTaskController.deleteComment));
//# sourceMappingURL=operational-task.routes.js.map
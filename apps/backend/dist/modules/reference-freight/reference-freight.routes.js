import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { REFERENCE_FREIGHT_ALLOWED_ROLES } from "./reference-freight.policy.js";
import { referenceFreightController } from "./reference-freight.controller.js";
export const referenceFreightAdminRouter = Router();
const ops = requireRole(...REFERENCE_FREIGHT_ALLOWED_ROLES);
referenceFreightAdminRouter.get("/", requireAuth, ops, asyncHandler(referenceFreightController.list));
referenceFreightAdminRouter.post("/", requireAuth, ops, asyncHandler(referenceFreightController.create));
referenceFreightAdminRouter.post("/copy-month", requireAuth, ops, asyncHandler(referenceFreightController.copyMonth));
referenceFreightAdminRouter.post("/import", requireAuth, ops, asyncHandler(referenceFreightController.importCsv));
referenceFreightAdminRouter.get("/:id", requireAuth, ops, asyncHandler(referenceFreightController.getById));
referenceFreightAdminRouter.patch("/:id", requireAuth, ops, asyncHandler(referenceFreightController.update));
referenceFreightAdminRouter.post("/:id/deactivate", requireAuth, ops, asyncHandler(referenceFreightController.deactivate));
referenceFreightAdminRouter.get("/:id/audits", requireAuth, ops, asyncHandler(referenceFreightController.audits));
//# sourceMappingURL=reference-freight.routes.js.map
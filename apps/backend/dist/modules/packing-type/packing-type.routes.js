import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { packingTypeController } from "./packing-type.controller.js";
export const packingTypeRouter = Router();
packingTypeRouter.get("/", requireAuth, asyncHandler(packingTypeController.list));
export const adminPackingTypeRouter = Router();
adminPackingTypeRouter.get("/", requireAuth, requireRole("ADMIN"), asyncHandler(packingTypeController.adminList));
adminPackingTypeRouter.post("/", requireAuth, requireRole("ADMIN"), asyncHandler(packingTypeController.create));
adminPackingTypeRouter.patch("/:id", requireAuth, requireRole("ADMIN"), asyncHandler(packingTypeController.update));
adminPackingTypeRouter.get("/product-links", requireAuth, requireRole("ADMIN"), asyncHandler(packingTypeController.listProductLinks));
adminPackingTypeRouter.post("/assign", requireAuth, requireRole("ADMIN"), asyncHandler(packingTypeController.assignProduct));
adminPackingTypeRouter.patch("/product-links/:linkId", requireAuth, requireRole("ADMIN"), asyncHandler(packingTypeController.updateProductLink));
//# sourceMappingURL=packing-type.routes.js.map
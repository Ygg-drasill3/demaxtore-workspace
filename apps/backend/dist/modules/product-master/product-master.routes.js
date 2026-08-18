import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { CreateProductSchema, ProductListQuerySchema, UpdateProductSchema, UpsertProductSupplierReferenceSchema, } from "@dmx/contracts/product-master";
import { productMasterController } from "./product-master.controller.js";
export const productMasterRouter = Router();
const managers = ["BUYER", "ADMIN", "SUPER_ADMIN", "OPS_MANAGER"];
productMasterRouter.get("/", requireAuth, requireRole(...managers), validateQuery(ProductListQuerySchema), asyncHandler(productMasterController.list));
productMasterRouter.post("/", requireAuth, requireRole(...managers), validateBody(CreateProductSchema), asyncHandler(productMasterController.create));
productMasterRouter.get("/:id", requireAuth, requireRole(...managers), asyncHandler(productMasterController.get));
productMasterRouter.patch("/:id", requireAuth, requireRole(...managers), validateBody(UpdateProductSchema), asyncHandler(productMasterController.update));
productMasterRouter.post("/:id/supplier-references", requireAuth, requireRole(...managers), validateBody(UpsertProductSupplierReferenceSchema), asyncHandler(productMasterController.upsertSupplierRef));
productMasterRouter.get("/:id/purchase-orders", requireAuth, requireRole(...managers), asyncHandler(productMasterController.relatedPos));
productMasterRouter.get("/:id/shipments", requireAuth, requireRole(...managers), asyncHandler(productMasterController.relatedShipments));
//# sourceMappingURL=product-master.routes.js.map
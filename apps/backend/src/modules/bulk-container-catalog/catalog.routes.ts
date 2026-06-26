import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { bulkCatalogController } from "./catalog.controller.js";

export const bulkCatalogRouter = Router();

bulkCatalogRouter.get("/categories", requireAuth, asyncHandler(bulkCatalogController.listCategories));
bulkCatalogRouter.get("/products", requireAuth, asyncHandler(bulkCatalogController.listProducts));
bulkCatalogRouter.get("/products/:id", requireAuth, asyncHandler(bulkCatalogController.getProduct));

export const adminBulkCatalogRouter = Router();

adminBulkCatalogRouter.get("/categories", requireAuth, requireRole("ADMIN"), asyncHandler(bulkCatalogController.adminListCategories));
adminBulkCatalogRouter.post("/categories", requireAuth, requireRole("ADMIN"), asyncHandler(bulkCatalogController.adminUpsertCategory));
adminBulkCatalogRouter.patch("/categories/:id", requireAuth, requireRole("ADMIN"), asyncHandler(bulkCatalogController.adminUpsertCategory));
adminBulkCatalogRouter.get("/products", requireAuth, requireRole("ADMIN"), asyncHandler(bulkCatalogController.adminListProducts));
adminBulkCatalogRouter.post("/products", requireAuth, requireRole("ADMIN"), asyncHandler(bulkCatalogController.adminUpsertProduct));
adminBulkCatalogRouter.patch("/products/:id", requireAuth, requireRole("ADMIN"), asyncHandler(bulkCatalogController.adminUpsertProduct));
adminBulkCatalogRouter.get("/spec-templates", requireAuth, requireRole("ADMIN"), asyncHandler(bulkCatalogController.adminListSpecTemplates));
adminBulkCatalogRouter.post("/spec-templates", requireAuth, requireRole("ADMIN"), asyncHandler(bulkCatalogController.adminUpsertSpecTemplate));
adminBulkCatalogRouter.patch("/spec-templates/:id", requireAuth, requireRole("ADMIN"), asyncHandler(bulkCatalogController.adminUpsertSpecTemplate));

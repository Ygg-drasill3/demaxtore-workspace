import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { catalogController } from "./catalog.controller.js";

export const catalogRouter = Router();

catalogRouter.get("/categories", requireAuth, asyncHandler(catalogController.listCategories));
catalogRouter.get("/products", requireAuth, requireRole("BUYER", "ADMIN"), asyncHandler(catalogController.listProducts));
catalogRouter.get("/products/:id", requireAuth, requireRole("BUYER", "ADMIN"), asyncHandler(catalogController.getProduct));
catalogRouter.get("/products/:id/image", asyncHandler(catalogController.getProductImage));

export const adminCatalogRouter = Router();
adminCatalogRouter.get("/categories", requireAuth, requireRole("ADMIN"), asyncHandler(catalogController.adminListCategories));
adminCatalogRouter.post("/categories", requireAuth, requireRole("ADMIN"), asyncHandler(catalogController.adminCreateCategory));
adminCatalogRouter.patch("/categories/:id", requireAuth, requireRole("ADMIN"), asyncHandler(catalogController.adminUpdateCategory));
adminCatalogRouter.get("/products", requireAuth, requireRole("ADMIN"), asyncHandler(catalogController.adminListProducts));
adminCatalogRouter.post("/products", requireAuth, requireRole("ADMIN"), asyncHandler(catalogController.adminCreateProduct));
adminCatalogRouter.patch("/products/:id", requireAuth, requireRole("ADMIN"), asyncHandler(catalogController.adminUpdateProduct));
adminCatalogRouter.post("/products/:id/image", requireAuth, requireRole("ADMIN"), ...(catalogController.adminUploadImage as any));

import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { supplierInterestController } from "./supplier-interest.controller.js";

export const supplierInterestRouter = Router();

supplierInterestRouter.get(
  "/categories",
  requireAuth,
  asyncHandler(supplierInterestController.listCategories),
);

supplierInterestRouter.get(
  "/organisations",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  asyncHandler(supplierInterestController.listOrganisations),
);

supplierInterestRouter.get(
  "/me",
  requireAuth,
  requireRole("SUPPLIER"),
  asyncHandler(supplierInterestController.getMine),
);

supplierInterestRouter.put(
  "/me",
  requireAuth,
  requireRole("SUPPLIER"),
  asyncHandler(supplierInterestController.setMine),
);

supplierInterestRouter.get(
  "/organisations/:orgId",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  asyncHandler(supplierInterestController.getForOrganisation),
);

supplierInterestRouter.put(
  "/organisations/:orgId",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  asyncHandler(supplierInterestController.setForOrganisation),
);

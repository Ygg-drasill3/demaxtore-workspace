import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { supplierOrganisationController } from "./supplier-organisation.controller.js";

export const supplierOrganisationRouter = Router();

supplierOrganisationRouter.get(
  "/:orgId/logo",
  requireAuth,
  asyncHandler(supplierOrganisationController.getLogo),
);

supplierOrganisationRouter.get(
  "/:orgId/catalog",
  requireAuth,
  asyncHandler(supplierOrganisationController.getCatalog),
);

import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { salesControlController } from "./sales-control.controller.js";

const salesControlRouter = Router();

salesControlRouter.get(
  "/customers",
  requireAuth,
  requireRole("ADMIN", "SALES_CONTROL"),
  asyncHandler(salesControlController.listCustomers),
);

salesControlRouter.post(
  "/customers",
  requireAuth,
  requireRole("ADMIN", "SALES_CONTROL"),
  asyncHandler(salesControlController.createCustomer),
);

salesControlRouter.post(
  "/customers/:id/reset-password",
  requireAuth,
  requireRole("ADMIN", "SALES_CONTROL"),
  asyncHandler(salesControlController.resetCustomerPassword),
);

salesControlRouter.delete(
  "/customers/:id",
  requireAuth,
  requireRole("ADMIN", "SALES_CONTROL"),
  asyncHandler(salesControlController.deleteCustomer),
);

export default salesControlRouter;

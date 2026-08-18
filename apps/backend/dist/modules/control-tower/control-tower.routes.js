import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { controlTowerController } from "./control-tower.controller.js";
export const controlTowerRouter = Router();
// Sprint 18B — Import Control Tower (buyer / supplier / admin)
controlTowerRouter.get("/dashboard", requireAuth, requireRole("ADMIN", "BUYER", "SUPPLIER", "SALES_CONTROL"), asyncHandler(controlTowerController.importDashboard));
// Sprint 4A — Admin ops control tower
const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("ADMIN"));
adminRouter.post("/scan", asyncHandler(controlTowerController.scan));
adminRouter.get("/overview", asyncHandler(controlTowerController.overview));
adminRouter.get("/ops-dashboard", asyncHandler(controlTowerController.dashboard));
adminRouter.get("/alerts", asyncHandler(controlTowerController.alerts));
adminRouter.get("/alerts/:id", asyncHandler(controlTowerController.alertById));
adminRouter.post("/alerts/:id/resolve", asyncHandler(controlTowerController.resolveAlert));
adminRouter.get("/metrics", asyncHandler(controlTowerController.metrics));
adminRouter.get("/sla", asyncHandler(controlTowerController.sla));
adminRouter.get("/supplier-performance", asyncHandler(controlTowerController.supplierPerformance));
adminRouter.get("/buyer-performance", asyncHandler(controlTowerController.buyerPerformance));
adminRouter.get("/shipment-tracking", asyncHandler(controlTowerController.shipmentTracking));
controlTowerRouter.use(adminRouter);
//# sourceMappingURL=control-tower.routes.js.map
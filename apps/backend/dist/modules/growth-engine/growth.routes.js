import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { prisma } from "../../db.js";
import { GrowthService } from "./growth.service.js";
import { exportGrowthCsv } from "./growth-csv.js";
const growth = new GrowthService(prisma);
export const growthRouter = Router();
growthRouter.use(requireAuth, requireRole("ADMIN"));
growthRouter.get("/funnel", asyncHandler(async (_req, res) => {
    res.json(await growth.getFunnel());
}));
growthRouter.get("/conversion", asyncHandler(async (_req, res) => {
    res.json(await growth.getConversion());
}));
growthRouter.get("/dropoffs", asyncHandler(async (_req, res) => {
    res.json(await growth.getDropoffs());
}));
growthRouter.get("/insights", asyncHandler(async (_req, res) => {
    res.json(await growth.getInsights());
}));
growthRouter.get("/buyers/activation", asyncHandler(async (_req, res) => {
    res.json(await growth.getBuyerActivation());
}));
growthRouter.get("/suppliers/performance", asyncHandler(async (_req, res) => {
    res.json(await growth.getSupplierPerformance());
}));
growthRouter.get("/categories", asyncHandler(async (_req, res) => {
    res.json(await growth.getCategoryIntelligence());
}));
growthRouter.get("/routes", asyncHandler(async (_req, res) => {
    res.json(await growth.getRouteIntelligence());
}));
growthRouter.get("/procurement-strategy", asyncHandler(async (_req, res) => {
    res.json(await growth.getProcurementStrategy());
}));
growthRouter.get("/repeat-customers", asyncHandler(async (_req, res) => {
    res.json(await growth.getRepeatCustomers());
}));
growthRouter.get("/lost-opportunities", asyncHandler(async (_req, res) => {
    res.json(await growth.getLostOpportunities());
}));
growthRouter.get("/export/:reportType.csv", asyncHandler(async (req, res) => {
    const csv = await exportGrowthCsv(req.params.reportType, growth, prisma);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="growth-${req.params.reportType}.csv"`);
    res.send(csv);
}));
//# sourceMappingURL=growth.routes.js.map
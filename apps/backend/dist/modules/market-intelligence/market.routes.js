import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { prisma } from "../../db.js";
import { MarketService } from "./market.service.js";
import { exportMarketCsv } from "./market-csv.js";
const market = new MarketService(prisma);
export const marketRouter = Router();
marketRouter.use(requireAuth, requireRole("ADMIN"));
marketRouter.get("/trends", asyncHandler(async (_req, res) => {
    res.json(await market.getTrends());
}));
marketRouter.get("/categories", asyncHandler(async (_req, res) => {
    res.json(await market.getCategories());
}));
marketRouter.get("/routes", asyncHandler(async (_req, res) => {
    res.json(await market.getRoutes());
}));
marketRouter.get("/countries", asyncHandler(async (_req, res) => {
    res.json(await market.getCountries());
}));
marketRouter.get("/opportunities", asyncHandler(async (_req, res) => {
    res.json(await market.getOpportunities());
}));
marketRouter.get("/recommendations", asyncHandler(async (_req, res) => {
    res.json(await market.getRecommendations());
}));
marketRouter.get("/insights", asyncHandler(async (_req, res) => {
    res.json(await market.getInsight());
}));
marketRouter.get("/buyers/opportunities", asyncHandler(async (_req, res) => {
    res.json(await market.getBuyerOpportunities());
}));
marketRouter.get("/forwarders/opportunities", asyncHandler(async (_req, res) => {
    res.json(await market.getForwarderOpportunities());
}));
marketRouter.get("/supply-gaps", asyncHandler(async (_req, res) => {
    res.json(await market.getSupplyGaps());
}));
marketRouter.get("/export/:reportType.csv", asyncHandler(async (req, res) => {
    const csv = await exportMarketCsv(req.params.reportType, market, prisma);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="market-${req.params.reportType}.csv"`);
    res.send(csv);
}));
//# sourceMappingURL=market.routes.js.map
import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { prisma } from "../../db.js";
import { ScalePortfolioService } from "./scale-portfolio.service.js";
import { ScaleAccountService } from "./scale-account.service.js";
import { ScalePipelineService } from "./scale-pipeline.service.js";
import { ScaleForecastService } from "./scale-forecast.service.js";
import { ScaleWorkloadService } from "./scale-workload.service.js";
import { ScaleExecutiveService } from "./scale-executive.service.js";
import { ForecastHorizonQuery } from "@dmx/contracts/scale-readiness.zod";
import { exportScaleCsv } from "./scale-csv.js";
import { AppError } from "../../utils/httpErrors.js";
const portfolio = new ScalePortfolioService(prisma);
const accounts = new ScaleAccountService(prisma);
const pipeline = new ScalePipelineService(prisma);
const forecast = new ScaleForecastService(prisma);
const workload = new ScaleWorkloadService(prisma);
const executive = new ScaleExecutiveService(prisma);
export const scaleRouter = Router();
scaleRouter.use(requireAuth, requireRole("ADMIN"));
scaleRouter.get("/portfolio/buyers", asyncHandler(async (_req, res) => {
    res.json(await portfolio.listBuyerHealth());
}));
scaleRouter.get("/portfolio/buyers/:organisationId", asyncHandler(async (req, res) => {
    const row = await portfolio.getBuyerHealth(req.params.organisationId);
    if (!row)
        throw new AppError(404, "BUYER_NOT_FOUND");
    res.json(row);
}));
scaleRouter.get("/portfolio/suppliers", asyncHandler(async (_req, res) => {
    res.json(await portfolio.listSupplierHealth());
}));
scaleRouter.get("/portfolio/suppliers/:organisationId", asyncHandler(async (req, res) => {
    const row = await portfolio.getSupplierHealth(req.params.organisationId);
    if (!row)
        throw new AppError(404, "SUPPLIER_NOT_FOUND");
    res.json(row);
}));
scaleRouter.post("/accounts/:organisationId/assign", asyncHandler(async (req, res) => {
    const body = (req.body ?? {});
    res.json(await accounts.assignOwnership(req.params.organisationId, req.user, body.payload ?? req.body ?? {}, { ip: req.ip, userAgent: req.headers["user-agent"] }));
}));
scaleRouter.get("/pipeline/health", asyncHandler(async (_req, res) => {
    res.json(await pipeline.getPipelineHealth());
}));
scaleRouter.get("/forecast", asyncHandler(async (req, res) => {
    const q = ForecastHorizonQuery.parse(req.query);
    res.json(await forecast.getForecast(q.days));
}));
scaleRouter.get("/workload", asyncHandler(async (_req, res) => {
    res.json(await workload.getOperatorWorkload());
}));
scaleRouter.get("/executive", asyncHandler(async (_req, res) => {
    res.json(await executive.getExecutiveDashboard());
}));
scaleRouter.get("/export/:reportType.csv", asyncHandler(async (req, res) => {
    const csv = await exportScaleCsv(req.params.reportType, {
        portfolio,
        pipeline,
        forecast,
        workload,
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="scale-${req.params.reportType}.csv"`);
    res.send(csv);
}));
//# sourceMappingURL=scale.routes.js.map
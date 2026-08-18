import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db.js";
import { AnalyticsExportQuerySchema, AnalyticsFilterQuerySchema, } from "@dmx/contracts/operational-analytics.zod";
import { OperationalKPIService } from "./operational-kpi.service.js";
const kpi = new OperationalKPIService(prisma);
function actor(req) {
    return { id: req.user.id, role: req.user.role };
}
function parseFilter(req) {
    return AnalyticsFilterQuerySchema.parse(req.query);
}
export const operationalAnalyticsRouter = Router();
operationalAnalyticsRouter.get("/summary", requireAuth, asyncHandler(async (req, res) => {
    res.json(await kpi.summary(actor(req), parseFilter(req)));
}));
operationalAnalyticsRouter.get("/orders", requireAuth, asyncHandler(async (req, res) => {
    res.json(await kpi.orders(actor(req), parseFilter(req)));
}));
operationalAnalyticsRouter.get("/shipments", requireAuth, asyncHandler(async (req, res) => {
    res.json(await kpi.shipments(actor(req), parseFilter(req)));
}));
operationalAnalyticsRouter.get("/inspections", requireAuth, asyncHandler(async (req, res) => {
    res.json(await kpi.inspections(actor(req), parseFilter(req)));
}));
operationalAnalyticsRouter.get("/tasks", requireAuth, asyncHandler(async (req, res) => {
    res.json(await kpi.tasks(actor(req), parseFilter(req)));
}));
operationalAnalyticsRouter.get("/issues", requireAuth, asyncHandler(async (req, res) => {
    res.json(await kpi.issues(actor(req), parseFilter(req)));
}));
operationalAnalyticsRouter.get("/completion", requireAuth, asyncHandler(async (req, res) => {
    res.json(await kpi.completion(actor(req), parseFilter(req)));
}));
operationalAnalyticsRouter.get("/suppliers", requireAuth, asyncHandler(async (req, res) => {
    res.json(await kpi.suppliers(actor(req), parseFilter(req)));
}));
operationalAnalyticsRouter.get("/export", requireAuth, asyncHandler(async (req, res) => {
    const query = AnalyticsExportQuerySchema.parse(req.query);
    const file = await kpi.export(actor(req), query);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.send(file.body);
}));
//# sourceMappingURL=operational-analytics.routes.js.map
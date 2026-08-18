import { Router } from "express";
import { requireAuth, requireRole } from "../../auth/auth.middleware.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { prisma } from "../../../db.js";
import { FreightAnalyticsService } from "./freight-analytics.service.js";
import { FreightMarginPolicyService } from "./freight-margin-policy.service.js";
import { SuggestMarginQuery } from "@dmx/contracts/freight-analytics.zod";
import { assertAdminCommercial } from "./freight-commercial.policy.js";
const analytics = new FreightAnalyticsService(prisma);
const policies = new FreightMarginPolicyService(prisma);
export const freightAnalyticsRouter = Router();
freightAnalyticsRouter.get("/insight", requireAuth, requireRole("ADMIN"), asyncHandler(async (_req, res) => {
    res.json(await analytics.getInsight());
}));
freightAnalyticsRouter.get("/forwarders/scorecard", requireAuth, requireRole("ADMIN"), asyncHandler(async (_req, res) => {
    res.json(await analytics.buildForwarderScorecards());
}));
freightAnalyticsRouter.get("/margin/suggest", requireAuth, requireRole("ADMIN"), asyncHandler(async (req, res) => {
    const q = SuggestMarginQuery.parse(req.query);
    res.json(await policies.suggestMargin(q.pol, q.pod));
}));
freightAnalyticsRouter.get("/margin/policies", requireAuth, requireRole("ADMIN"), asyncHandler(async (_req, res) => {
    res.json(await policies.listPolicies());
}));
freightAnalyticsRouter.post("/margin/policies", requireAuth, requireRole("ADMIN"), asyncHandler(async (req, res) => {
    assertAdminCommercial(req.user);
    const body = (req.body ?? {});
    res.status(201).json(await policies.createPolicy(req.user, body.payload ?? req.body ?? {}, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
    }));
}));
freightAnalyticsRouter.patch("/margin/policies/:policyId", requireAuth, requireRole("ADMIN"), asyncHandler(async (req, res) => {
    assertAdminCommercial(req.user);
    const body = (req.body ?? {});
    res.json(await policies.updatePolicy(req.params.policyId, req.user, body.payload ?? req.body ?? {}, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
    }));
}));
freightAnalyticsRouter.get("/export/:reportType.csv", requireAuth, requireRole("ADMIN"), asyncHandler(async (req, res) => {
    const reportType = req.params.reportType;
    const csv = await analytics.exportCsv(reportType);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="freight-${reportType}.csv"`);
    res.send(csv);
}));
//# sourceMappingURL=freight-analytics.routes.js.map
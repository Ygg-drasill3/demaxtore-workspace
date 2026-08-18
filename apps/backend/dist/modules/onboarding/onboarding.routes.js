import { Router } from "express";
import { LEARNING_CARDS, TOUR_STEPS_BY_ROLE } from "@dmx/contracts/onboarding";
import { CompleteTourSchema, OpenLearningSchema } from "@dmx/contracts/onboarding.zod";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { adminAnalyticsLimiter } from "../../middleware/rate-limit.js";
import { prisma } from "../../db.js";
import { OnboardingService } from "./onboarding.service.js";
import { exportOnboardingCsv } from "./onboarding-csv.js";
import { guidanceHandler } from "./onboarding-workspace.js";
const onboarding = new OnboardingService(prisma);
export const onboardingRouter = Router();
onboardingRouter.use(requireAuth);
/** Current user's onboarding progress (synced from trade data). */
onboardingRouter.get("/progress", asyncHandler(async (req, res) => {
    const user = req.user;
    res.json(await onboarding.getOrSyncProgress(user.id, user.role));
}));
/** Product tour steps for current role. */
onboardingRouter.get("/tour", asyncHandler(async (req, res) => {
    const role = req.user.role;
    const steps = TOUR_STEPS_BY_ROLE[role] ?? [];
    res.json({ steps });
}));
/** Mark product tour complete (first login). */
onboardingRouter.post("/tour/complete", asyncHandler(async (req, res) => {
    CompleteTourSchema.parse(req.body ?? {});
    await onboarding.completeTour(req.user.id);
    res.json({ ok: true });
}));
/** Learning center static content. */
onboardingRouter.get("/learning", asyncHandler(async (_req, res) => {
    res.json({ cards: LEARNING_CARDS });
}));
/** Track learning content opened. */
onboardingRouter.post("/learning/open", asyncHandler(async (req, res) => {
    const { contentId } = OpenLearningSchema.parse(req.body);
    await onboarding.recordLearningOpen(req.user.id, contentId);
    res.json({ ok: true });
}));
/** Workspace context guidance — reuses existing next-action engines. */
onboardingRouter.get("/guidance/:workspaceType/:workspaceId", asyncHandler(async (req, res) => guidanceHandler(req, res, prisma)));
/** Admin dashboard metrics. */
onboardingRouter.get("/dashboard", requireRole("ADMIN"), asyncHandler(async (_req, res) => {
    res.json(await onboarding.getDashboardMetrics());
}));
/** Admin list all user progress. */
onboardingRouter.get("/users", requireRole("ADMIN"), adminAnalyticsLimiter, asyncHandler(async (_req, res) => {
    res.json(await onboarding.listAllProgress());
}));
/** Admin CSV exports. */
onboardingRouter.get("/export/:reportType.csv", requireRole("ADMIN"), asyncHandler(async (req, res) => {
    const csv = await exportOnboardingCsv(req.params.reportType, onboarding, req.user.id);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="onboarding-${req.params.reportType}.csv"`);
    res.send(csv);
}));
//# sourceMappingURL=onboarding.routes.js.map
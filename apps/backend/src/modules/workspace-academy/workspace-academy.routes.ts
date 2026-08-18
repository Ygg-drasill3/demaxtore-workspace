import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { z } from "zod";
import { AcademyArticleIdSchema } from "@dmx/contracts/workspace-academy";
import { prisma } from "../../db.js";
import { WorkspaceAcademyService } from "./workspace-academy.service.js";

/**
 * Minimal recovery stub — full module sources were deleted from the working tree.
 * Enough for API boot + non-blocking academy calls during Golden Path work.
 */
export const workspaceAcademyRouter = Router();
const academy = new WorkspaceAcademyService(prisma);

const GuideStartBody = z.object({
  automatic: z.boolean().optional(),
  guideVersion: z.number().int().min(1).optional(),
});
const GuideVersionBody = z.object({
  guideVersion: z.number().int().min(1).optional(),
});
const GuideProgressBody = z.object({
  stepIndex: z.number().int().min(0),
});
const WelcomeBody = z.object({
  language: z.string().min(2).max(10).optional(),
});

workspaceAcademyRouter.use(requireAuth);

workspaceAcademyRouter.get(
  "/state",
  asyncHandler(async (req, res) => {
    res.json(await academy.getState(req.user!.id, req.user!.role));
  }),
);

workspaceAcademyRouter.post(
  "/guides/:guideId/start",
  asyncHandler(async (req, res) => {
    const { automatic, guideVersion } = GuideStartBody.parse(req.body ?? {});
    await academy.startGuide(req.user!.id, req.params.guideId, Boolean(automatic), guideVersion ?? 1);
    res.json({ ok: true });
  }),
);

workspaceAcademyRouter.post(
  "/guides/:guideId/progress",
  asyncHandler(async (req, res) => {
    const { stepIndex } = GuideProgressBody.parse(req.body ?? {});
    await academy.progressGuide(req.user!.id, req.params.guideId, stepIndex);
    res.json({ ok: true });
  }),
);

workspaceAcademyRouter.post(
  "/guides/:guideId/complete",
  asyncHandler(async (req, res) => {
    const { guideVersion } = GuideVersionBody.parse(req.body ?? {});
    await academy.completeGuide(req.user!.id, req.params.guideId, guideVersion ?? 1);
    res.json({ ok: true });
  }),
);

workspaceAcademyRouter.post(
  "/guides/:guideId/dismiss",
  asyncHandler(async (req, res) => {
    const { guideVersion } = GuideVersionBody.parse(req.body ?? {});
    await academy.dismissGuide(req.user!.id, req.params.guideId, guideVersion ?? 1);
    res.json({ ok: true });
  }),
);

workspaceAcademyRouter.post(
  "/tasks/:taskId/complete",
  asyncHandler(async (req, res) => {
    await academy.completeTask(req.user!.id, req.user!.role, req.params.taskId);
    res.json({ ok: true });
  }),
);

workspaceAcademyRouter.post(
  "/tasks/:taskId/dismiss",
  asyncHandler(async (req, res) => {
    await academy.dismissTask(req.user!.id, req.user!.role, req.params.taskId);
    res.json({ ok: true });
  }),
);

workspaceAcademyRouter.post(
  "/welcome/complete",
  asyncHandler(async (req, res) => {
    const { language } = WelcomeBody.parse(req.body ?? {});
    await academy.completeWelcome(req.user!.id, language);
    res.json({ ok: true });
  }),
);

workspaceAcademyRouter.post(
  "/welcome/dismiss",
  asyncHandler(async (req, res) => {
    await academy.dismissWelcome(req.user!.id);
    res.json({ ok: true });
  }),
);

workspaceAcademyRouter.post(
  "/process-overview/complete",
  asyncHandler(async (req, res) => {
    await academy.completeProcessOverview(req.user!.id);
    res.json({ ok: true });
  }),
);

workspaceAcademyRouter.post(
  "/checklist/dismiss",
  asyncHandler(async (req, res) => {
    await academy.dismissChecklist(req.user!.id);
    res.json({ ok: true });
  }),
);

workspaceAcademyRouter.post(
  "/articles/:articleId/view",
  asyncHandler(async (req, res) => {
    const articleId = AcademyArticleIdSchema.parse(req.params.articleId);
    await academy.viewArticle(req.user!.id, articleId);
    res.json({ ok: true });
  }),
);

workspaceAcademyRouter.post(
  "/reset",
  asyncHandler(async (req, res) => {
    await academy.reset(req.user!.id);
    res.json({ ok: true });
  }),
);

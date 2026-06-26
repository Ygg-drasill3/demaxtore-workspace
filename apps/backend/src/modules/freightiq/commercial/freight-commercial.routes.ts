import { Router } from "express";
import { requireAuth, requireRole } from "../../auth/auth.middleware.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { prisma } from "../../../db.js";
import { FreightCommercialService } from "./freight-commercial.service.js";
import { assertAdminCommercial } from "./freight-commercial.policy.js";
import { freightAnalyticsRouter } from "./freight-analytics.routes.js";

const commercial = new FreightCommercialService(prisma);

export const freightCommercialRouter = Router();

freightCommercialRouter.use("/analytics", freightAnalyticsRouter);

freightCommercialRouter.get(
  "/metrics",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    res.json(await commercial.getMetrics());
  }),
);

freightCommercialRouter.get(
  "/report",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    res.json(await commercial.getReport());
  }),
);

freightCommercialRouter.post(
  "/offers/:offerId/margin",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    assertAdminCommercial(req.user!);
    const body = (req.body ?? {}) as { payload?: Record<string, unknown> };
    await commercial.setOfferMargin(
      req.params.offerId,
      req.user!,
      body.payload ?? req.body ?? {},
      { ip: req.ip, userAgent: req.headers["user-agent"] },
    );
    res.json({ ok: true });
  }),
);

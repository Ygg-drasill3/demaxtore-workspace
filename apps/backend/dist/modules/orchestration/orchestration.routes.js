import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermissionOrLegacyAdmin } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { OrderShipmentOrchestrator } from "./order-shipment-orchestrator.service.js";
import { orchestratorConfigForClient } from "../../config/orchestrator.js";
const router = Router();
const orch = new OrderShipmentOrchestrator(prisma);
router.get("/config", requireAuth, asyncHandler(async (_req, res) => {
    res.json(orchestratorConfigForClient());
}));
router.get("/recommendations", requireAuth, requirePermissionOrLegacyAdmin("control_tower:admin"), asyncHandler(async (req, res) => {
    const q = z.object({
        orderId: z.string().uuid().optional(),
        shipmentId: z.string().uuid().optional(),
    }).parse(req.query);
    const rows = await orch.listRecommendations(q);
    res.json(rows);
}));
router.post("/recommendations/:id/apply", requireAuth, requirePermissionOrLegacyAdmin("control_tower:admin"), asyncHandler(async (req, res) => {
    await orch.applyRecommendation(req.params.id, req.user.id);
    res.json({ ok: true });
}));
router.post("/recommendations/:id/dismiss", requireAuth, requirePermissionOrLegacyAdmin("control_tower:admin"), asyncHandler(async (req, res) => {
    await orch.dismissRecommendation(req.params.id, req.user.id);
    res.json({ ok: true });
}));
export { router as orchestrationRouter };
//# sourceMappingURL=orchestration.routes.js.map
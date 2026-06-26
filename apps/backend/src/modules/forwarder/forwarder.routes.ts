import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireForwarderPortalAccess } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { TradeActionGateway } from "../orchestration/trade-action.gateway.js";
import { AppError } from "../../utils/httpErrors.js";
import type { ShipmentAction } from "@dmx/contracts/shipment.fsm";

const router = Router();
const gateway = new TradeActionGateway(prisma);

const MilestoneSubmit = z.object({
  action: z.string(),
  payload: z.record(z.unknown()).optional(),
  reason: z.string().optional(),
});

router.get(
  "/shipments",
  requireAuth,
  requireForwarderPortalAccess(),
  asyncHandler(async (req, res) => {
    const rows = await prisma.workspace.findMany({
      where: {
        type: "SHIPMENT",
        participants: { some: { userId: req.user!.id } },
      },
      select: { id: true, externalRef: true, state: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(rows);
  }),
);

router.post(
  "/shipments/:id/milestones",
  requireAuth,
  requireForwarderPortalAccess(),
  asyncHandler(async (req, res) => {
    const body = MilestoneSubmit.parse(req.body);
    const allowed: ShipmentAction[] = [
      "confirm_booking", "assign_container", "load_vessel", "depart_vessel", "arrive_destination",
    ];
    if (!allowed.includes(body.action as ShipmentAction)) {
      throw new AppError(403, "FORWARDER_ACTION_NOT_ALLOWED");
    }
    const result = await gateway.applyShipmentAction({
      workspaceId: req.params.id,
      action: body.action as ShipmentAction,
      actor: { id: req.user!.id, email: req.user!.email, role: req.user!.role as never },
      payload: { ...(body.payload ?? {}), transitionSource: "forwarder" },
      reason: body.reason,
    });
    res.json({ ok: true, ...result });
  }),
);

export { router as forwarderRouter };

// apps/backend/src/modules/telemetry/telemetry.routes.ts
//
// Phase G2 — POST /api/telemetry — fire-and-forget event ingest.
// Returns 202 Accepted with a tiny body; persistence is best-effort.
import { Router } from "express";
import { TelemetryEventInput } from "@dmx/contracts/telemetry";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../config/logger.js";
const router = Router();
router.post("/", requireAuth, validateBody(TelemetryEventInput), asyncHandler(async (req, res) => {
    const body = req.body;
    // Reply immediately — write is fire-and-forget.
    res.status(202).json({ accepted: true });
    prisma.telemetryEvent
        .create({
        data: {
            userId: req.user.id,
            event: body.event,
            workspaceId: body.workspaceId ?? null,
            targetId: body.targetId ?? null,
            meta: (body.meta ?? {}),
            clientAt: new Date(body.clientAt),
        },
    })
        .catch((e) => logger.warn({ err: e, event: body.event }, "telemetry insert failed"));
}));
export default router;
//# sourceMappingURL=telemetry.routes.js.map
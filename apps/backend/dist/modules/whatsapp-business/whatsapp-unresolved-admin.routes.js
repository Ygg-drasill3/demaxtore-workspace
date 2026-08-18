import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { WhatsAppUnresolvedAdminService } from "./whatsapp-unresolved-admin.service.js";
const router = Router();
const service = () => new WhatsAppUnresolvedAdminService(prisma);
router.use(requireAuth, requireRole("ADMIN", "SUPER_ADMIN"));
router.get("/whatsapp-unresolved-events", asyncHandler(async (_req, res) => {
    const events = await service().listUnresolved();
    res.json({ events });
}));
router.post("/whatsapp-unresolved-events/:id/resolve", asyncHandler(async (req, res) => {
    const body = z.object({ workspaceConversationId: z.string().uuid() }).parse(req.body);
    const result = await service().resolveToConversation(req.params.id, body.workspaceConversationId, req.user.id);
    res.json(result);
}));
router.post("/whatsapp-unresolved-events/:id/reprocess", asyncHandler(async (req, res) => {
    const result = await service().reprocess(req.params.id);
    res.json(result);
}));
router.post("/whatsapp-unresolved-events/:id/ignore", asyncHandler(async (req, res) => {
    const result = await service().ignore(req.params.id, req.user.id);
    res.json(result);
}));
router.get("/whatsapp-unresolved-events/:id/audit", asyncHandler(async (req, res) => {
    const audit = await service().auditForEvent(req.params.id);
    res.json({ audit });
}));
export const whatsappUnresolvedAdminRouter = router;
//# sourceMappingURL=whatsapp-unresolved-admin.routes.js.map
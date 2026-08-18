import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { WhatsAppBusinessConnectionService } from "./whatsapp-business-connection.service.js";
const buyerRouter = Router();
const adminRouter = Router();
const service = () => new WhatsAppBusinessConnectionService(prisma);
const CompleteSignupSchema = z.object({
    code: z.string().min(1),
    wabaId: z.string().optional(),
    phoneNumberId: z.string().optional(),
    businessId: z.string().optional(),
});
buyerRouter.use(requireAuth, requireRole("BUYER"));
buyerRouter.get("/me", asyncHandler(async (req, res) => {
    const connection = await service().getConnectionForBuyer(req.user);
    res.json({ connection });
}));
buyerRouter.post("/embedded-signup/complete", asyncHandler(async (req, res) => {
    const body = CompleteSignupSchema.parse(req.body);
    const connection = await service().connect(req.user, {
        code: body.code,
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
        businessId: body.businessId,
        metaBusinessId: body.businessId,
    });
    res.status(201).json({ connection });
}));
buyerRouter.post("/test", asyncHandler(async (req, res) => {
    const result = await service().testConnection(req.user);
    res.json(result);
}));
buyerRouter.post("/disconnect", asyncHandler(async (req, res) => {
    const result = await service().disconnect(req.user);
    res.json(result);
}));
buyerRouter.post("/reconnect", asyncHandler(async (req, res) => {
    const state = service().prepareReconnect(req.user);
    if (req.body?.code) {
        const body = CompleteSignupSchema.parse(req.body);
        const connection = await service().connect(req.user, {
            code: body.code,
            wabaId: body.wabaId,
            phoneNumberId: body.phoneNumberId,
            businessId: body.businessId,
            metaBusinessId: body.businessId,
        });
        return res.json({ ...state, connection });
    }
    res.json(state);
}));
adminRouter.get("/whatsapp-connections", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (_req, res) => {
    const connections = await service().listConnectionsForAdmin();
    res.json({ connections });
}));
export const whatsappIntegrationsRouter = buyerRouter;
export const whatsappAdminRouter = adminRouter;
/** Legacy routes — kept for backward compatibility. */
export const whatsappBusinessLegacyRouter = Router();
whatsappBusinessLegacyRouter.use(requireAuth, requireRole("BUYER", "ADMIN", "SUPER_ADMIN"));
whatsappBusinessLegacyRouter.get("/embedded-signup-config", asyncHandler(async (_req, res) => {
    res.json(service().getEmbeddedSignupConfig());
}));
whatsappBusinessLegacyRouter.get("/", asyncHandler(async (req, res) => {
    const connection = await service().getConnectionForBuyer(req.user);
    res.json({ connection });
}));
whatsappBusinessLegacyRouter.post("/connect", asyncHandler(async (req, res) => {
    const body = CompleteSignupSchema.parse(req.body);
    const connection = await service().connect(req.user, body);
    res.status(201).json({ connection });
}));
whatsappBusinessLegacyRouter.post("/reconnect", asyncHandler(async (req, res) => {
    const body = CompleteSignupSchema.parse(req.body);
    const connection = await service().connect(req.user, body);
    res.json({ connection });
}));
whatsappBusinessLegacyRouter.post("/disconnect", asyncHandler(async (req, res) => {
    res.json(await service().disconnect(req.user));
}));
//# sourceMappingURL=whatsapp-business.routes.js.map
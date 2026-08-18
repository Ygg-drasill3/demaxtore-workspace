import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { PhoneVerificationService } from "./phone-verification.service.js";
import { prisma } from "../../db/prisma.js";
import { SubmitPhoneInput, ReviewPhoneInput } from "@dmx/contracts/phone-verification";
const router = Router();
const service = new PhoneVerificationService(prisma);
router.get("/me", requireAuth, asyncHandler(async (req, res) => {
    res.json(await service.getMe(req.user));
}));
router.post("/submit", requireAuth, asyncHandler(async (req, res) => {
    const body = SubmitPhoneInput.parse(req.body);
    res.status(201).json(await service.submitPhone(req.user, body));
}));
router.get("/queue", requireAuth, asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : "PENDING";
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    res.json(await service.listQueue(req.user, { status, limit, offset }));
}));
router.get("/pending-count", requireAuth, asyncHandler(async (req, res) => {
    if (req.user.role !== "ADMIN" && req.user.role !== "SALES_CONTROL" && req.user.role !== "SUPER_ADMIN") {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    res.json({ count: await service.pendingCount() });
}));
router.post("/:id/approve", requireAuth, asyncHandler(async (req, res) => {
    const body = ReviewPhoneInput.optional().parse(req.body ?? {});
    res.json(await service.approve(req.user, req.params.id, body));
}));
router.post("/:id/reject", requireAuth, asyncHandler(async (req, res) => {
    const body = ReviewPhoneInput.optional().parse(req.body ?? {});
    res.json(await service.reject(req.user, req.params.id, body));
}));
export default router;
//# sourceMappingURL=phone-verification.routes.js.map
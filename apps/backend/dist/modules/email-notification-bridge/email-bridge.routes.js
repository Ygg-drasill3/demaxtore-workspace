import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { OPEN_TRACKING_GIF, recordEmailOpen } from "./email-bridge.service.js";
const router = Router();
router.get("/track/:deliveryId/open.gif", asyncHandler(async (req, res) => {
    const { deliveryId } = req.params;
    if (deliveryId) {
        void recordEmailOpen(deliveryId).catch(() => undefined);
    }
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.send(OPEN_TRACKING_GIF);
}));
export default router;
//# sourceMappingURL=email-bridge.routes.js.map
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import * as svc from "./supplier-activity.service.js";
import { getRfqId, resolveRfqParam } from "../../lib/resolve-rfq-ref.js";
const router = Router({ mergeParams: true });
router.use(resolveRfqParam);
router.get("/", requireAuth, asyncHandler(async (req, res) => {
    res.json(await svc.getSummary(getRfqId(req), req.user));
}));
router.get("/detail", requireAuth, asyncHandler(async (req, res) => {
    res.json(await svc.getDetail(getRfqId(req), req.user));
}));
router.post("/view", requireAuth, asyncHandler(async (req, res) => {
    await svc.recordSupplierView(getRfqId(req), req.user);
    res.status(204).send();
}));
router.post("/nudge-silent", requireAuth, asyncHandler(async (req, res) => {
    await svc.nudgeSilentSuppliers(getRfqId(req), req.user);
    res.status(204).send();
}));
router.post("/:supplierId/nudge", requireAuth, asyncHandler(async (req, res) => {
    await svc.nudgeSupplier(getRfqId(req), req.params.supplierId, req.user);
    res.status(204).send();
}));
export default router;
//# sourceMappingURL=supplier-activity.routes.js.map
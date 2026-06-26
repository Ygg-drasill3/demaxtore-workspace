import { Router, type Request, type Response } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import * as svc from "./supplier-activity.service.js";

const router = Router({ mergeParams: true });

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await svc.getSummary(req.params.id, req.user!));
  }),
);

router.get(
  "/detail",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await svc.getDetail(req.params.id, req.user!));
  }),
);

router.post(
  "/view",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    await svc.recordSupplierView(req.params.id, req.user!);
    res.status(204).send();
  }),
);

router.post(
  "/nudge-silent",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    await svc.nudgeSilentSuppliers(req.params.id, req.user!);
    res.status(204).send();
  }),
);

router.post(
  "/:supplierId/nudge",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    await svc.nudgeSupplier(req.params.id, req.params.supplierId, req.user!);
    res.status(204).send();
  }),
);

export default router;

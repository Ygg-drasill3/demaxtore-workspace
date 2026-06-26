// apps/backend/src/modules/quotations/quotations.routes.ts
import { Router, type Request, type Response } from "express";
import { SubmitQuotationPayload, ReviseQuotationPayload, WithdrawQuotationPayload } from "@dmx/contracts/rfq.zod";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import * as svc from "./quotations.service.js";
import { listQuotationsForWorkspace } from "./quotations.list.js";

const router = Router({ mergeParams: true });

// GET /api/rfq/:id/quotations — comparison matrix (buyer/admin: all active; supplier: own)
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await listQuotationsForWorkspace(req.params.id, req.user!));
  }),
);

// POST /api/rfq/:id/quotations  — supplier submits a fresh quotation
router.post(
  "/",
  requireAuth,
  validateBody(SubmitQuotationPayload),
  asyncHandler(async (req: Request, res: Response) => {
    const dto = await svc.submitQuotation(req.params.id, req.user!, req.body);
    res.status(201).json(dto);
  }),
);

// PATCH /api/rfq/:id/quotations/:quotationId  — supplier revises
router.patch(
  "/:quotationId",
  requireAuth,
  validateBody(ReviseQuotationPayload),
  asyncHandler(async (req: Request, res: Response) => {
    const dto = await svc.reviseQuotation(req.params.id, req.params.quotationId, req.user!, req.body);
    res.json(dto);
  }),
);

// DELETE /api/rfq/:id/quotations/:quotationId  — supplier withdraws (soft)
router.delete(
  "/:quotationId",
  requireAuth,
  validateBody(WithdrawQuotationPayload),
  asyncHandler(async (req: Request, res: Response) => {
    const dto = await svc.withdrawQuotation(req.params.id, req.params.quotationId, req.user!, req.body);
    res.json(dto);
  }),
);

export default router;

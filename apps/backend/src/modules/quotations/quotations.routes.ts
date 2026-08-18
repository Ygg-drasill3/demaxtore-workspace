// apps/backend/src/modules/quotations/quotations.routes.ts
import { Router, type Request, type Response } from "express";
import {
  SubmitQuotationPayload, AdminSubmitQuotationPayload,
  ReviseQuotationPayload, WithdrawQuotationPayload,
} from "@dmx/contracts/rfq.zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import * as svc from "./quotations.service.js";
import { listQuotationsForWorkspace } from "./quotations.list.js";
import { getRfqId, resolveRfqParam } from "../../lib/resolve-rfq-ref.js";

const router = Router({ mergeParams: true });
router.use(resolveRfqParam);

// GET /api/rfq/:id/quotations — comparison matrix (buyer/admin: all active; supplier: own)
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await listQuotationsForWorkspace(getRfqId(req), req.user!));
  }),
);

// GET /api/rfq/:id/quotations/admin/scope/:supplierUserId — allowed line scope for admin quote form
router.get(
  "/admin/scope/:supplierUserId",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await svc.getSupplierQuoteScopeForAdmin(getRfqId(req), req.user!, req.params.supplierUserId));
  }),
);

// POST /api/rfq/:id/quotations/admin — admin submits on behalf of assigned supplier
router.post(
  "/admin",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validateBody(AdminSubmitQuotationPayload),
  asyncHandler(async (req: Request, res: Response) => {
    const dto = await svc.adminSubmitQuotation(getRfqId(req), req.user!, req.body);
    res.status(201).json(dto);
  }),
);

// PATCH /api/rfq/:id/quotations/admin/:quotationId — admin revises supplier quotation
router.patch(
  "/admin/:quotationId",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validateBody(AdminSubmitQuotationPayload),
  asyncHandler(async (req: Request, res: Response) => {
    const dto = await svc.adminReviseQuotation(getRfqId(req), req.params.quotationId, req.user!, req.body);
    res.json(dto);
  }),
);

// POST /api/rfq/:id/quotations  — supplier submits a fresh quotation
router.post(
  "/",
  requireAuth,
  validateBody(SubmitQuotationPayload),
  asyncHandler(async (req: Request, res: Response) => {
    const dto = await svc.submitQuotation(getRfqId(req), req.user!, req.body);
    res.status(201).json(dto);
  }),
);

// PATCH /api/rfq/:id/quotations/:quotationId  — supplier revises
router.patch(
  "/:quotationId",
  requireAuth,
  validateBody(ReviseQuotationPayload),
  asyncHandler(async (req: Request, res: Response) => {
    const dto = await svc.reviseQuotation(getRfqId(req), req.params.quotationId, req.user!, req.body);
    res.json(dto);
  }),
);

// DELETE /api/rfq/:id/quotations/:quotationId  — supplier withdraws (soft)
router.delete(
  "/:quotationId",
  requireAuth,
  validateBody(WithdrawQuotationPayload),
  asyncHandler(async (req: Request, res: Response) => {
    const dto = await svc.withdrawQuotation(getRfqId(req), req.params.quotationId, req.user!, req.body);
    res.json(dto);
  }),
);

export default router;

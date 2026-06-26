import type { Request, Response } from "express";
import { z } from "zod";
import type { PoAction } from "@dmx/contracts/purchase-order";
import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import { PurchaseOrderService } from "./purchase-order.service.js";
import { canAccessOrder } from "../order/order.policy.js";
import { canAccessPo } from "./purchase-order.policy.js";

const service = new PurchaseOrderService(prisma);

const ActionBody = z.object({
  payload: z.record(z.unknown()).optional(),
});

const ACTION_MAP: Record<string, PoAction> = {
  "acknowledge-po": "acknowledge_po",
  "request-amendment": "request_amendment",
  "approve-amendment": "approve_amendment",
  "reject-amendment": "reject_amendment",
  "close-po": "close_po",
  "cancel-po": "cancel_po",
};

export const purchaseOrderController = {
  async dashboard(_req: Request, res: Response) {
    res.json(await service.getDashboard());
  },

  async byOrder(req: Request, res: Response) {
    const orderId = req.params.id ?? req.params.orderId;
    if (!(await canAccessOrder(prisma, req.user!, orderId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    const summary = await service.getByOrderId(orderId);
    if (!summary) throw new AppError(404, "PO_NOT_FOUND");
    res.json(summary);
  },

  async get(req: Request, res: Response) {
    const poId = req.params.id;
    if (!(await canAccessPo(prisma, req.user!, poId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    res.json(await service.getSummary(poId));
  },

  async action(req: Request, res: Response) {
    const actionKey = ACTION_MAP[req.params.action];
    if (!actionKey) throw new AppError(400, "UNKNOWN_ACTION");
    const body = ActionBody.parse(req.body ?? {});
    res.json(
      await service.applyPoAction(
        req.params.id,
        actionKey,
        req.user!,
        body.payload ?? {},
        { ip: req.ip, userAgent: req.headers["user-agent"] },
      ),
    );
  },
};

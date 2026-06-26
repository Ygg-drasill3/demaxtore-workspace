import type { Request, Response } from "express";
import { z } from "zod";
import type { FreightAction } from "@dmx/contracts/freightiq";
import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import { FreightIqService } from "./freightiq.service.js";
const service = new FreightIqService(prisma);

const ActionBody = z.object({
  payload: z.record(z.unknown()).optional(),
});

const ACTION_MAP: Record<string, FreightAction> = {
  "create-request": "create_request",
  "submit-offer": "submit_offer",
  "revise-offer": "revise_offer",
  "withdraw-offer": "withdraw_offer",
  "select-offer": "select_offer",
  "cancel-request": "cancel_request",
};

export const freightiqController = {
  async action(req: Request, res: Response) {
    const orderId = req.params.orderId;
    const actionKey = ACTION_MAP[req.params.action];
    if (!actionKey) throw new AppError(400, "UNKNOWN_ACTION");
    const body = ActionBody.parse(req.body ?? {});
    res.json(
      await service.applyFreightAction(
        orderId,
        actionKey,
        req.user!,
        body.payload ?? {},
        { ip: req.ip, userAgent: req.headers["user-agent"] },
      ),
    );
  },

  async operationsOverview(_req: Request, res: Response) {
    res.json(await service.getOpsOverview());
  },
};

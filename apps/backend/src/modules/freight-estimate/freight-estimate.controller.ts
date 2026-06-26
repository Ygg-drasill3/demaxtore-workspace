import type { Request, Response } from "express";
import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import { ListFreightEstimatesQuery, CreateFreightEstimatePayload } from "@dmx/contracts/freight-estimate.zod";
import { FreightEstimateService } from "./freight-estimate.service.js";

const service = new FreightEstimateService(prisma);

export const freightEstimateController = {
  list: async (req: Request, res: Response) => {
    const query = ListFreightEstimatesQuery.parse(req.query);
    res.json(await service.list(req.user!, query));
  },

  get: async (req: Request, res: Response) => {
    res.json(await service.getById(req.user!, req.params.id));
  },

  panel: async (req: Request, res: Response) => {
    const tradeId = String(req.query.tradeId ?? "");
    if (!tradeId) throw new AppError(400, "TRADE_ID_REQUIRED");
    res.json(await service.getPanel(req.user!, tradeId));
  },

  create: async (req: Request, res: Response) => {
    const payload = CreateFreightEstimatePayload.parse(req.body);
    res.status(201).json(await service.create(req.user!, payload));
  },

  refresh: async (req: Request, res: Response) => {
    res.json(await service.refresh(req.user!, req.params.id));
  },

  kpi: async (req: Request, res: Response) => {
    if (req.user!.role !== "BUYER" && req.user!.role !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN");
    }
    const buyerId = req.user!.role === "ADMIN" && req.query.buyerId
      ? String(req.query.buyerId)
      : req.user!.id;
    res.json({ estimatedCifReady: await service.countCifReadyForBuyer(buyerId) });
  },
};

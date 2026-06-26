import type { Request, Response } from "express";
import { prisma } from "../../db.js";
import { TradeTimelineService } from "./trade-timeline.service.js";

const service = new TradeTimelineService(prisma);

export const tradeTimelineController = {
  getTimeline: async (req: Request, res: Response) => {
    res.json(await service.getTimeline(req.user!, req.params.tradeId));
  },

  kpi: async (req: Request, res: Response) => {
    res.json(await service.countKpis(req.user!));
  },
};

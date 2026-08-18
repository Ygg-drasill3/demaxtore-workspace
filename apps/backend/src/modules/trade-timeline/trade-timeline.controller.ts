import type { Request, Response } from "express";
import { prisma } from "../../db.js";
import { NotFound } from "../../lib/errors.js";
import { looksLikeUuid } from "../../lib/resolve-rfq-ref.js";
import { TradeTimelineService } from "./trade-timeline.service.js";

const service = new TradeTimelineService(prisma);

export const tradeTimelineController = {
  getTimeline: async (req: Request, res: Response) => {
    const tradeId = req.params.tradeId;
    if (!tradeId || !looksLikeUuid(tradeId)) throw NotFound("Trade not found");
    res.json(await service.getTimeline(req.user!, tradeId));
  },

  kpi: async (req: Request, res: Response) => {
    res.json(await service.countKpis(req.user!));
  },
};

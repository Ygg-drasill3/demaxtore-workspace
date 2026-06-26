import type { Request, Response } from "express";
import {
  AdminBcProcurementQuoteInput,
  CreateBcContainerOfferInput,
} from "@dmx/contracts/bulk-container.zod";
import { prisma } from "../../db/prisma.js";
import { BulkContainerProcurementService } from "./bulk-container-procurement.service.js";

const service = new BulkContainerProcurementService(prisma);

function actor(req: Request) {
  return req.user!;
}

export const bulkContainerAdminController = {
  kpis: async (_req: Request, res: Response) => {
    res.json(await service.kpis());
  },

  inbox: async (_req: Request, res: Response) => {
    res.json({ items: await service.inbox() });
  },

  get: async (req: Request, res: Response) => {
    res.json(await service.getProcurement(req.params.id));
  },

  startProcurement: async (req: Request, res: Response) => {
    res.json(await service.startProcurement(req.params.id, actor(req)));
  },

  resumeProcurement: async (req: Request, res: Response) => {
    res.json(await service.resumeProcurement(req.params.id, actor(req)));
  },

  upsertQuote: async (req: Request, res: Response) => {
    const input = AdminBcProcurementQuoteInput.parse(req.body);
    res.json(await service.upsertQuote(req.params.id, input, actor(req)));
  },

  createOffer: async (req: Request, res: Response) => {
    const input = CreateBcContainerOfferInput.parse(req.body);
    res.json(await service.createOffer(req.params.id, input, actor(req)));
  },

  sendOffer: async (req: Request, res: Response) => {
    res.json(await service.sendOffer(req.params.id, req.params.offerId, actor(req)));
  },

  expireOffers: async (req: Request, res: Response) => {
    res.json({ expired: await service.expireOffers(actor(req)) });
  },
};

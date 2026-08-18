import type { Request, Response } from "express";
import {
  AdminProcurementQuoteInput,
  CreateContainerOfferInput,
} from "@dmx/contracts/mixed-container.zod";
import { McInternalNoteInput, McProcurementInboxFilters } from "@dmx/contracts/mixed-container-procurement";
import { MixedContainerProcurementService } from "./mixed-container-procurement.service.js";
import { prisma } from "../../db/prisma.js";

const service = new MixedContainerProcurementService(prisma);

function actor(req: Request) {
  return req.user!;
}

export const mixedContainerAdminController = {
  kpis: async (_req: Request, res: Response) => {
    res.json(await service.kpis());
  },

  inbox: async (req: Request, res: Response) => {
    const filters = McProcurementInboxFilters.parse(req.query);
    res.json({ items: await service.inbox(filters) });
  },

  procurementManagers: async (_req: Request, res: Response) => {
    res.json({ items: await service.listProcurementManagers() });
  },

  procurementRequest: async (req: Request, res: Response) => {
    res.json(await service.getProcurementRequest(req.params.id, actor(req), true));
  },

  addInternalNote: async (req: Request, res: Response) => {
    const input = McInternalNoteInput.parse(req.body);
    res.json(await service.addInternalNote(req.params.id, input, actor(req)));
  },

  get: async (req: Request, res: Response) => {
    res.json(await service.getProcurement(req.params.id));
  },

  startProcurement: async (req: Request, res: Response) => {
    res.json(await service.startProcurement(req.params.id, actor(req)));
  },

  assignManager: async (req: Request, res: Response) => {
    const { managerId } = req.body as { managerId: string };
    res.json(await service.assignManager(req.params.id, managerId, actor(req)));
  },

  upsertQuote: async (req: Request, res: Response) => {
    const input = AdminProcurementQuoteInput.parse(req.body);
    res.json(await service.upsertQuote(req.params.id, input, actor(req)));
  },

  createOffer: async (req: Request, res: Response) => {
    const input = CreateContainerOfferInput.parse(req.body);
    res.json(await service.createOffer(req.params.id, input, actor(req)));
  },

  sendOffer: async (req: Request, res: Response) => {
    res.json(await service.sendOffer(req.params.id, req.params.offerId, actor(req)));
  },

  resumeProcurement: async (req: Request, res: Response) => {
    res.json(await service.resumeProcurement(req.params.id, actor(req)));
  },

  expireOffers: async (req: Request, res: Response) => {
    const count = await service.expireOffers(actor(req));
    res.json({ expired: count });
  },
};

import type { Request, Response } from "express";
import {
  CreateBulkContainerInput,
  UpdateBulkContainerInput,
  AddBulkContainerLineInput,
  UpdateBulkContainerLineInput,
} from "@dmx/contracts/bulk-container.zod";
import { BuyerBcRevisionInput } from "@dmx/contracts/bulk-container.zod";
import { BulkContainerService } from "./bulk-container.service.js";
import { BulkContainerProcurementService } from "./bulk-container-procurement.service.js";
import { BulkContainerAllocationService } from "./bulk-container-allocation.service.js";
import { canAccessBulkContainer } from "./bulk-container.policy.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/httpErrors.js";

const service = new BulkContainerService(prisma);
const procurementService = new BulkContainerProcurementService(prisma);
const allocationService = new BulkContainerAllocationService(prisma);

function actor(req: Request) {
  return req.user!;
}

export const bulkContainerController = {
  list: async (req: Request, res: Response) => {
    res.json({ items: await service.list(actor(req)) });
  },

  create: async (req: Request, res: Response) => {
    const input = CreateBulkContainerInput.parse(req.body);
    res.status(201).json(await service.create(input, actor(req)));
  },

  get: async (req: Request, res: Response) => {
    const ok = await canAccessBulkContainer(prisma, actor(req), req.params.id);
    if (!ok) throw new AppError(403, "FORBIDDEN");
    res.json(await service.fetchDTO(req.params.id));
  },

  update: async (req: Request, res: Response) => {
    const input = UpdateBulkContainerInput.parse(req.body);
    res.json(await service.update(req.params.id, input, actor(req)));
  },

  addLine: async (req: Request, res: Response) => {
    const input = AddBulkContainerLineInput.parse(req.body);
    res.json(await service.addLine(req.params.id, input, actor(req)));
  },

  updateLine: async (req: Request, res: Response) => {
    const input = UpdateBulkContainerLineInput.parse(req.body);
    res.json(await service.updateLine(req.params.id, req.params.lineId, input, actor(req)));
  },

  removeLine: async (req: Request, res: Response) => {
    res.json(await service.removeLine(req.params.id, req.params.lineId, actor(req)));
  },

  submitRequest: async (req: Request, res: Response) => {
    res.json(await service.submitRequest(req.params.id, actor(req)));
  },

  timeline: async (req: Request, res: Response) => {
    res.json({ items: await service.timeline(req.params.id, actor(req)) });
  },

  getOffer: async (req: Request, res: Response) => {
    res.json(await procurementService.getBuyerOffer(req.params.offerId, actor(req)));
  },

  approveOffer: async (req: Request, res: Response) => {
    res.json(await procurementService.approveOffer(req.params.offerId, actor(req)));
  },

  requestRevision: async (req: Request, res: Response) => {
    const input = BuyerBcRevisionInput.parse(req.body);
    res.json(await procurementService.requestRevision(req.params.offerId, input, actor(req)));
  },

  getCoordination: async (req: Request, res: Response) => {
    res.json(await allocationService.getCoordination(req.params.id, actor(req)));
  },
};

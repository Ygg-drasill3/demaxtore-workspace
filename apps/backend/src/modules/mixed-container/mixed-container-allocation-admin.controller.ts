import type { Request, Response } from "express";
import {
  CreateMcAllocationInput,
  UploadMcProformaInput,
  CreateMcPaymentInput,
  UpdateMcPaymentInput,
} from "@dmx/contracts/mixed-container.zod";
import { MixedContainerAllocationService } from "./mixed-container-allocation.service.js";
import { prisma } from "../../db/prisma.js";

const service = new MixedContainerAllocationService(prisma);

function actor(req: Request) {
  return req.user!;
}

export const mixedContainerAllocationAdminController = {
  kpis: async (_req: Request, res: Response) => {
    res.json(await service.allocationKpis());
  },

  inbox: async (_req: Request, res: Response) => {
    res.json({ items: await service.allocationInbox() });
  },

  get: async (req: Request, res: Response) => {
    res.json(await service.getAllocationWorkspace(req.params.id));
  },

  startAllocation: async (req: Request, res: Response) => {
    res.json(await service.startAllocation(req.params.id, actor(req)));
  },

  createAllocation: async (req: Request, res: Response) => {
    const input = CreateMcAllocationInput.parse(req.body);
    res.json(await service.createAllocation(req.params.id, input, actor(req)));
  },

  completeAllocations: async (req: Request, res: Response) => {
    res.json(await service.completeAllocations(req.params.id, actor(req)));
  },

  uploadProforma: async (req: Request, res: Response) => {
    const input = UploadMcProformaInput.parse(req.body);
    res.json(await service.uploadProforma(req.params.id, req.params.allocationId, input, actor(req)));
  },

  createPayment: async (req: Request, res: Response) => {
    const input = CreateMcPaymentInput.parse(req.body);
    res.json(await service.createPayment(req.params.id, input, actor(req)));
  },

  updatePayment: async (req: Request, res: Response) => {
    const input = UpdateMcPaymentInput.parse(req.body);
    res.json(await service.updatePayment(req.params.id, req.params.paymentId, input, actor(req)));
  },
};

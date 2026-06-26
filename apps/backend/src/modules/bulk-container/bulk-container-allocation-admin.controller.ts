import type { Request, Response } from "express";
import {
  CreateBcAllocationInput,
  UploadBcProformaInput,
  UpdateBcPaymentInput,
} from "@dmx/contracts/bulk-container.zod";
import { prisma } from "../../db/prisma.js";
import { BulkContainerAllocationService } from "./bulk-container-allocation.service.js";

const service = new BulkContainerAllocationService(prisma);

function actor(req: Request) {
  return req.user!;
}

export const bulkContainerAllocationAdminController = {
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
    const input = CreateBcAllocationInput.parse(req.body);
    res.json(await service.createAllocation(req.params.id, input, actor(req)));
  },

  completeAllocations: async (req: Request, res: Response) => {
    res.json(await service.completeAllocations(req.params.id, actor(req)));
  },

  uploadProforma: async (req: Request, res: Response) => {
    const input = UploadBcProformaInput.parse(req.body);
    res.json(await service.uploadProforma(req.params.id, req.params.allocationId, input, actor(req)));
  },

  updatePayment: async (req: Request, res: Response) => {
    const input = UpdateBcPaymentInput.parse(req.body);
    res.json(await service.updatePayment(req.params.id, req.params.paymentId, input, actor(req)));
  },
};

import type { Request, Response } from "express";
import { BulkContainerExecutionService } from "./bulk-container-execution.service.js";
import { prisma } from "../../db/prisma.js";

const service = new BulkContainerExecutionService(prisma);

function actor(req: Request) {
  return req.user!;
}

export const bulkContainerExecutionController = {
  spawn: async (req: Request, res: Response) => {
    res.json(await service.spawnExecutionOrders(req.params.id, actor(req)));
  },

  getExecution: async (req: Request, res: Response) => {
    res.json(await service.getExecution(req.params.id, actor(req)));
  },
};

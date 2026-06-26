import type { Request, Response } from "express";
import { MixedContainerExecutionService } from "./mixed-container-execution.service.js";
import { prisma } from "../../db/prisma.js";

const service = new MixedContainerExecutionService(prisma);

function actor(req: Request) {
  return req.user!;
}

export const mixedContainerExecutionController = {
  spawn: async (req: Request, res: Response) => {
    res.json(await service.spawnExecutionOrders(req.params.id, actor(req)));
  },

  getExecution: async (req: Request, res: Response) => {
    res.json(await service.getExecution(req.params.id, actor(req)));
  },
};

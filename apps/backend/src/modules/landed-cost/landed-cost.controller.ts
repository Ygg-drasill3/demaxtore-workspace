import type { Request, Response } from "express";
import {
  LandedCostCalculateSchema,
  TransactionCostCreateSchema,
} from "@dmx/contracts/landed-cost";
import { prisma } from "../../db/prisma.js";
import type { AuthUser } from "../../types/auth-user.js";
import { createLandedCostService } from "./landed-cost.service.js";

function user(req: Request): AuthUser {
  return req.user as AuthUser;
}

const svc = createLandedCostService(prisma);

export const landedCostController = {
  async list(req: Request, res: Response) {
    res.json(await svc.list(user(req)));
  },

  async calculate(req: Request, res: Response) {
    const body = LandedCostCalculateSchema.parse(req.body ?? {});
    res.status(201).json(await svc.calculate(user(req), body));
  },

  async get(req: Request, res: Response) {
    res.json(await svc.get(user(req), req.params.id));
  },

  async byShipment(req: Request, res: Response) {
    res.json(await svc.currentByShipment(user(req), req.params.shipmentWorkspaceId));
  },

  async versions(req: Request, res: Response) {
    res.json(await svc.versions(user(req), req.params.shipmentWorkspaceId));
  },

  async addCost(req: Request, res: Response) {
    const body = TransactionCostCreateSchema.parse(req.body ?? {});
    const row = await svc.addTransactionCost(user(req), body);
    res.status(201).json(row);
  },
};

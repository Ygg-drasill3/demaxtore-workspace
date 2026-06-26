import type { Request, Response } from "express";
import {
  AdminPackingTypeInput,
  AssignPackingTypeInput,
  UpdateProductPackingTypeInput,
} from "@dmx/contracts/packing-type";
import { prisma } from "../../db/prisma.js";
import { PackingTypeService } from "./packing-type.service.js";

const service = new PackingTypeService(prisma);

export const packingTypeController = {
  list: async (_req: Request, res: Response) => {
    res.json(await service.list(true));
  },

  adminList: async (_req: Request, res: Response) => {
    res.json(await service.adminList());
  },

  create: async (req: Request, res: Response) => {
    const input = AdminPackingTypeInput.parse(req.body);
    res.status(201).json(await service.create(input));
  },

  update: async (req: Request, res: Response) => {
    const input = AdminPackingTypeInput.partial().parse(req.body);
    res.json(await service.update(req.params.id, input));
  },

  assignProduct: async (req: Request, res: Response) => {
    const input = AssignPackingTypeInput.parse(req.body);
    res.status(201).json(await service.assignProduct(input));
  },

  updateProductLink: async (req: Request, res: Response) => {
    const input = UpdateProductPackingTypeInput.parse(req.body);
    res.json(await service.updateProductLink(req.params.linkId, input));
  },

  listProductLinks: async (req: Request, res: Response) => {
    const catalogKind = req.query.catalogKind as "MIXED_CONTAINER" | "BULK_CONTAINER";
    const productId = req.query.productId as string;
    res.json(await service.listProductLinks(catalogKind, productId));
  },
};

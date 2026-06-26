import type { Request, Response } from "express";
import { BulkCatalogListQuery } from "@dmx/contracts/bulk-container-catalog";
import {
  AdminBulkCategoryInput,
  AdminBulkProductInput,
  AdminBulkSpecTemplateInput,
} from "@dmx/contracts/bulk-container.zod";
import { BulkCatalogService } from "./catalog.service.js";
import { prisma } from "../../db/prisma.js";

const service = new BulkCatalogService(prisma);

export const bulkCatalogController = {
  listCategories: async (_req: Request, res: Response) => {
    res.json({ items: await service.listCategories() });
  },

  listProducts: async (req: Request, res: Response) => {
    const query = BulkCatalogListQuery.parse(req.query);
    res.json(await service.listProducts(query));
  },

  getProduct: async (req: Request, res: Response) => {
    res.json(await service.getProduct(req.params.id));
  },

  adminListCategories: async (_req: Request, res: Response) => {
    res.json({ items: await service.adminListCategories() });
  },

  adminUpsertCategory: async (req: Request, res: Response) => {
    const input = AdminBulkCategoryInput.parse(req.body);
    const id = req.params.id;
    res.json(await service.adminUpsertCategory(input, id));
  },

  adminListProducts: async (_req: Request, res: Response) => {
    res.json({ items: await service.adminListProducts() });
  },

  adminUpsertProduct: async (req: Request, res: Response) => {
    const input = AdminBulkProductInput.parse(req.body);
    const id = req.params.id;
    res.json(await service.adminUpsertProduct(input, id));
  },

  adminListSpecTemplates: async (_req: Request, res: Response) => {
    res.json({ items: await service.adminListSpecTemplates() });
  },

  adminUpsertSpecTemplate: async (req: Request, res: Response) => {
    const input = AdminBulkSpecTemplateInput.parse(req.body);
    const id = req.params.id;
    res.json(await service.adminUpsertSpecTemplate(input, id));
  },
};

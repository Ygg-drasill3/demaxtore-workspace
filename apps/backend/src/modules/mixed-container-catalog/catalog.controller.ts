import type { Request, Response } from "express";
import multer from "multer";
import fs from "node:fs";
import {
  AdminCatalogCategoryInput,
  AdminCatalogProductInput,
} from "@dmx/contracts/mixed-container.zod";
import type { CatalogListQuery } from "@dmx/contracts/mixed-container-catalog";
import { CatalogService } from "./catalog.service.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/httpErrors.js";

const service = new CatalogService(prisma);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const catalogController = {
  listCategories: async (_req: Request, res: Response) => {
    res.json({ items: await service.listCategories() });
  },

  listProducts: async (req: Request, res: Response) => {
    const query: CatalogListQuery = {
      category: req.query.category as string | undefined,
      sampleAvailable: req.query.sampleAvailable === "true",
      certification: req.query.certification as string | undefined,
      marketStatus: req.query.marketStatus as CatalogListQuery["marketStatus"],
      originCountry: req.query.originCountry as string | undefined,
      q: req.query.q as string | undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 24,
    };
    res.json(await service.listProducts(query));
  },

  getProduct: async (req: Request, res: Response) => {
    res.json(await service.getProduct(req.params.id));
  },

  getProductImage: async (req: Request, res: Response) => {
    const { path: filePath, mime } = await service.getProductImage(req.params.id);
    res.setHeader("Content-Type", mime);
    fs.createReadStream(filePath).pipe(res);
  },

  adminListCategories: async (_req: Request, res: Response) => {
    res.json({ items: await service.adminListCategories() });
  },

  adminCreateCategory: async (req: Request, res: Response) => {
    const input = AdminCatalogCategoryInput.parse(req.body);
    res.status(201).json(await service.adminCreateCategory(input));
  },

  adminUpdateCategory: async (req: Request, res: Response) => {
    const input = AdminCatalogCategoryInput.partial().parse(req.body);
    res.json(await service.adminUpdateCategory(req.params.id, input));
  },

  adminListProducts: async (_req: Request, res: Response) => {
    res.json({ items: await service.adminListProducts() });
  },

  adminCreateProduct: async (req: Request, res: Response) => {
    const input = AdminCatalogProductInput.parse(req.body);
    res.status(201).json(await service.adminCreateProduct(input));
  },

  adminUpdateProduct: async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    res.json(await service.adminUpdateProduct(req.params.id, body as Partial<AdminCatalogProductInput> & { status?: string }));
  },

  adminUploadImage: [
    upload.single("file"),
    async (req: Request, res: Response) => {
      if (!req.file) throw new AppError(400, "FILE_REQUIRED");
      const result = await service.adminUploadImage(
        req.params.id,
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
      );
      res.json(result);
    },
  ],
};

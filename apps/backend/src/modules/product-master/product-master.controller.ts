import type { Request, Response } from "express";
import {
  CreateProductSchema,
  ProductListQuerySchema,
  UpdateProductSchema,
  UpsertProductSupplierReferenceSchema,
} from "@dmx/contracts/product-master";
import { prisma } from "../../db/prisma.js";
import type { AuthUser } from "../../types/auth-user.js";
import { createProductMasterService } from "./product-master.service.js";

function user(req: Request): AuthUser {
  return req.user as AuthUser;
}

const svc = createProductMasterService(prisma);

export const productMasterController = {
  async list(req: Request, res: Response) {
    const query = ProductListQuerySchema.parse(req.query);
    res.json(await svc.list(user(req), query));
  },

  async get(req: Request, res: Response) {
    res.json(await svc.get(user(req), req.params.id));
  },

  async create(req: Request, res: Response) {
    const body = CreateProductSchema.parse(req.body ?? {});
    res.status(201).json(await svc.create(user(req), body));
  },

  async update(req: Request, res: Response) {
    const body = UpdateProductSchema.parse(req.body ?? {});
    res.json(await svc.update(user(req), req.params.id, body));
  },

  async upsertSupplierRef(req: Request, res: Response) {
    const body = UpsertProductSupplierReferenceSchema.parse(req.body ?? {});
    res.json(await svc.upsertSupplierReference(user(req), req.params.id, body));
  },

  async relatedPos(req: Request, res: Response) {
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Math.min(100, Number(req.query.pageSize ?? 25) || 25);
    res.json(await svc.relatedPurchaseOrders(user(req), req.params.id, page, pageSize));
  },

  async relatedShipments(req: Request, res: Response) {
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Math.min(100, Number(req.query.pageSize ?? 25) || 25);
    res.json(await svc.relatedShipments(user(req), req.params.id, page, pageSize));
  },
};

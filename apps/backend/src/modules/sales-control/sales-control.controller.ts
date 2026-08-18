import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { prisma } from "../../db.js";
import {
  CreateCustomerAccountInput,
  ResetCustomerPasswordInput,
  SetSupplierCatalogLinkInput,
  UpdateCustomerAccountInput,
} from "@dmx/contracts/sales-control";
import { AppError } from "../../utils/httpErrors.js";
import { SalesControlService } from "./sales-control.service.js";

const service = new SalesControlService(prisma);

function loginUrl(req: Request): string {
  const origin = req.get("origin");
  if (origin) return `${origin.replace(/\/$/, "")}/login/`;
  const base = env.APP_BASE_URL.replace(/\/$/, "");
  if (base) return `${base}/login/`;
  const host = req.get("host");
  const proto = req.get("x-forwarded-proto") ?? req.protocol;
  return host ? `${proto}://${host}/login/` : "/login/";
}

export const salesControlController = {
  listCustomers: async (req: Request, res: Response) => {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const role = req.query.role === "BUYER" || req.query.role === "SUPPLIER" ? req.query.role : undefined;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    res.json(await service.listRecent(req.user!.id, q, 50, { role, category }));
  },

  listInterestCategories: async (_req: Request, res: Response) => {
    res.json(await service.listInterestCategories());
  },

  getCustomer: async (req: Request, res: Response) => {
    res.json(await service.getCustomer(req.params.id));
  },

  updateCustomer: async (req: Request, res: Response) => {
    const payload = UpdateCustomerAccountInput.parse(req.body);
    res.json(await service.updateCustomer(req.params.id, payload));
  },

  uploadLogo: async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw new AppError(400, "FILE_REQUIRED");
    res.json(await service.setLogo(req.params.id, file));
  },

  uploadCatalog: async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw new AppError(400, "FILE_REQUIRED");
    res.json(await service.setCatalog(req.params.id, file));
  },

  setCatalogLink: async (req: Request, res: Response) => {
    const { url } = SetSupplierCatalogLinkInput.parse(req.body ?? {});
    res.json(await service.setCatalogLink(req.params.id, url));
  },

  resetCustomerPassword: async (req: Request, res: Response) => {
    const body = ResetCustomerPasswordInput.parse(req.body ?? {});
    res.json(await service.resetCustomerPassword(req.params.id, body.newPassword));
  },

  deleteCustomer: async (req: Request, res: Response) => {
    res.json(await service.deleteCustomer(req.params.id));
  },

  createCustomer: async (req: Request, res: Response) => {
    const payload = CreateCustomerAccountInput.parse(req.body);
    const actor = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { id: true, displayName: true, email: true, role: true },
    });
    const result = await service.createCustomer(actor, payload, loginUrl(req));
    res.status(201).json(result);
  },
};

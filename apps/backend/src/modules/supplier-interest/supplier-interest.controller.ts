import type { Request, Response } from "express";
import { SetOrganisationCategoryInterestsSchema } from "@dmx/contracts/supplier-interest.zod";
import { supplierInterestService } from "./supplier-interest.service.js";
import { AppError } from "../../utils/httpErrors.js";

export const supplierInterestController = {
  listCategories: async (_req: Request, res: Response) => {
    res.json({ items: await supplierInterestService.listInterestCategoryOptions() });
  },

  listOrganisations: async (req: Request, res: Response) => {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;
    res.json({
      items: await supplierInterestService.listSupplierOrganisations({ q, limit }),
    });
  },

  getMine: async (req: Request, res: Response) => {
    res.json(await supplierInterestService.getMyInterests(req.user!.id));
  },

  setMine: async (req: Request, res: Response) => {
    const input = SetOrganisationCategoryInterestsSchema.parse(req.body ?? {});
    res.json(await supplierInterestService.setMyInterests(req.user!.id, input.labels ?? []));
  },

  getForOrganisation: async (req: Request, res: Response) => {
    const orgId = req.params.orgId;
    if (!orgId) throw new AppError(400, "ORG_ID_REQUIRED");
    res.json(await supplierInterestService.getInterests(orgId));
  },

  setForOrganisation: async (req: Request, res: Response) => {
    const orgId = req.params.orgId;
    if (!orgId) throw new AppError(400, "ORG_ID_REQUIRED");
    const input = SetOrganisationCategoryInterestsSchema.parse(req.body ?? {});
    res.json(await supplierInterestService.setInterests(orgId, input.labels ?? []));
  },
};

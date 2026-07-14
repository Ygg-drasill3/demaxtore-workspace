import type { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import {
  CopyReferenceFreightMonthPayload,
  CreateReferenceFreightRatePayload,
  ImportReferenceFreightCsvPayload,
  ListReferenceFreightRatesQuery,
  UpdateReferenceFreightRatePayload,
} from "@dmx/contracts/reference-freight.zod";
import { ReferenceFreightService } from "./reference-freight.service.js";

export const referenceFreightController = {
  async list(req: Request, res: Response) {
    const query = ListReferenceFreightRatesQuery.parse(req.query);
    const page = await new ReferenceFreightService(prisma).listPaginated(query);
    res.json(page);
  },

  async getById(req: Request, res: Response) {
    const row = await new ReferenceFreightService(prisma).getById(req.params.id);
    res.json(row);
  },

  async create(req: Request, res: Response) {
    const payload = CreateReferenceFreightRatePayload.parse(req.body);
    const row = await new ReferenceFreightService(prisma).create(req.user!.id, payload);
    res.status(201).json(row);
  },

  async upsert(req: Request, res: Response) {
    return referenceFreightController.create(req, res);
  },

  async update(req: Request, res: Response) {
    const payload = UpdateReferenceFreightRatePayload.parse(req.body);
    const row = await new ReferenceFreightService(prisma).update(req.user!.id, req.params.id, payload);
    res.json(row);
  },

  async deactivate(req: Request, res: Response) {
    const row = await new ReferenceFreightService(prisma).deactivate(req.user!.id, req.params.id);
    res.json(row);
  },

  async audits(req: Request, res: Response) {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const rows = await new ReferenceFreightService(prisma).listAudits(req.params.id, limit);
    res.json(rows);
  },

  async copyMonth(req: Request, res: Response) {
    const payload = CopyReferenceFreightMonthPayload.parse(req.body ?? {});
    const result = await new ReferenceFreightService(prisma).copyPreviousMonth(req.user!.id, payload);
    res.json(result);
  },

  async importCsv(req: Request, res: Response) {
    const payload = ImportReferenceFreightCsvPayload.parse(req.body);
    const result = await new ReferenceFreightService(prisma).importCsv(req.user!.id, payload.csv);
    res.json(result);
  },
};

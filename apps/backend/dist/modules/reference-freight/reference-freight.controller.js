import { prisma } from "../../db/prisma.js";
import { CopyReferenceFreightMonthPayload, CreateReferenceFreightRatePayload, ImportReferenceFreightCsvPayload, ListReferenceFreightRatesQuery, UpdateReferenceFreightRatePayload, } from "@dmx/contracts/reference-freight.zod";
import { ReferenceFreightService } from "./reference-freight.service.js";
export const referenceFreightController = {
    async list(req, res) {
        const query = ListReferenceFreightRatesQuery.parse(req.query);
        const page = await new ReferenceFreightService(prisma).listPaginated(query);
        res.json(page);
    },
    async getById(req, res) {
        const row = await new ReferenceFreightService(prisma).getById(req.params.id);
        res.json(row);
    },
    async create(req, res) {
        const payload = CreateReferenceFreightRatePayload.parse(req.body);
        const row = await new ReferenceFreightService(prisma).create(req.user.id, payload);
        res.status(201).json(row);
    },
    async upsert(req, res) {
        return referenceFreightController.create(req, res);
    },
    async update(req, res) {
        const payload = UpdateReferenceFreightRatePayload.parse(req.body);
        const row = await new ReferenceFreightService(prisma).update(req.user.id, req.params.id, payload);
        res.json(row);
    },
    async deactivate(req, res) {
        const row = await new ReferenceFreightService(prisma).deactivate(req.user.id, req.params.id);
        res.json(row);
    },
    async audits(req, res) {
        const limit = req.query.limit ? Number(req.query.limit) : 50;
        const rows = await new ReferenceFreightService(prisma).listAudits(req.params.id, limit);
        res.json(rows);
    },
    async copyMonth(req, res) {
        const payload = CopyReferenceFreightMonthPayload.parse(req.body ?? {});
        const result = await new ReferenceFreightService(prisma).copyPreviousMonth(req.user.id, payload);
        res.json(result);
    },
    async importCsv(req, res) {
        const payload = ImportReferenceFreightCsvPayload.parse(req.body);
        const result = await new ReferenceFreightService(prisma).importCsv(req.user.id, payload.csv);
        res.json(result);
    },
};
//# sourceMappingURL=reference-freight.controller.js.map
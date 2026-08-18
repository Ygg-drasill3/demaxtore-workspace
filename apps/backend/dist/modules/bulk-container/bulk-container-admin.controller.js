import { AdminBcProcurementQuoteInput, CreateBcContainerOfferInput, } from "@dmx/contracts/bulk-container.zod";
import { prisma } from "../../db/prisma.js";
import { BulkContainerProcurementService } from "./bulk-container-procurement.service.js";
const service = new BulkContainerProcurementService(prisma);
function actor(req) {
    return req.user;
}
export const bulkContainerAdminController = {
    kpis: async (_req, res) => {
        res.json(await service.kpis());
    },
    inbox: async (_req, res) => {
        res.json({ items: await service.inbox() });
    },
    get: async (req, res) => {
        res.json(await service.getProcurement(req.params.id));
    },
    startProcurement: async (req, res) => {
        res.json(await service.startProcurement(req.params.id, actor(req)));
    },
    resumeProcurement: async (req, res) => {
        res.json(await service.resumeProcurement(req.params.id, actor(req)));
    },
    upsertQuote: async (req, res) => {
        const input = AdminBcProcurementQuoteInput.parse(req.body);
        res.json(await service.upsertQuote(req.params.id, input, actor(req)));
    },
    createOffer: async (req, res) => {
        const input = CreateBcContainerOfferInput.parse(req.body);
        res.json(await service.createOffer(req.params.id, input, actor(req)));
    },
    sendOffer: async (req, res) => {
        res.json(await service.sendOffer(req.params.id, req.params.offerId, actor(req)));
    },
    expireOffers: async (req, res) => {
        res.json({ expired: await service.expireOffers(actor(req)) });
    },
};
//# sourceMappingURL=bulk-container-admin.controller.js.map
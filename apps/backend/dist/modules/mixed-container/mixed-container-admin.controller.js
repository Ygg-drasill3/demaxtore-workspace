import { AdminProcurementQuoteInput, CreateContainerOfferInput, } from "@dmx/contracts/mixed-container.zod";
import { McInternalNoteInput, McProcurementInboxFilters } from "@dmx/contracts/mixed-container-procurement";
import { MixedContainerProcurementService } from "./mixed-container-procurement.service.js";
import { prisma } from "../../db/prisma.js";
const service = new MixedContainerProcurementService(prisma);
function actor(req) {
    return req.user;
}
export const mixedContainerAdminController = {
    kpis: async (_req, res) => {
        res.json(await service.kpis());
    },
    inbox: async (req, res) => {
        const filters = McProcurementInboxFilters.parse(req.query);
        res.json({ items: await service.inbox(filters) });
    },
    procurementManagers: async (_req, res) => {
        res.json({ items: await service.listProcurementManagers() });
    },
    procurementRequest: async (req, res) => {
        res.json(await service.getProcurementRequest(req.params.id, actor(req), true));
    },
    addInternalNote: async (req, res) => {
        const input = McInternalNoteInput.parse(req.body);
        res.json(await service.addInternalNote(req.params.id, input, actor(req)));
    },
    get: async (req, res) => {
        res.json(await service.getProcurement(req.params.id));
    },
    startProcurement: async (req, res) => {
        res.json(await service.startProcurement(req.params.id, actor(req)));
    },
    assignManager: async (req, res) => {
        const { managerId } = req.body;
        res.json(await service.assignManager(req.params.id, managerId, actor(req)));
    },
    upsertQuote: async (req, res) => {
        const input = AdminProcurementQuoteInput.parse(req.body);
        res.json(await service.upsertQuote(req.params.id, input, actor(req)));
    },
    createOffer: async (req, res) => {
        const input = CreateContainerOfferInput.parse(req.body);
        res.json(await service.createOffer(req.params.id, input, actor(req)));
    },
    sendOffer: async (req, res) => {
        res.json(await service.sendOffer(req.params.id, req.params.offerId, actor(req)));
    },
    resumeProcurement: async (req, res) => {
        res.json(await service.resumeProcurement(req.params.id, actor(req)));
    },
    expireOffers: async (req, res) => {
        const count = await service.expireOffers(actor(req));
        res.json({ expired: count });
    },
};
//# sourceMappingURL=mixed-container-admin.controller.js.map
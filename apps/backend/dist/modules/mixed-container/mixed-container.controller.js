import { CreateMixedContainerInput, UpdateMixedContainerInput, AddContainerLineInput, UpdateContainerLineInput, } from "@dmx/contracts/mixed-container.zod";
import { SubmitProcurementRequestInput } from "@dmx/contracts/mixed-container-procurement";
import { MixedContainerService } from "./mixed-container.service.js";
import { MixedContainerProcurementService } from "./mixed-container-procurement.service.js";
import { MixedContainerAllocationService } from "./mixed-container-allocation.service.js";
import { MixedContainerExecutionService } from "./mixed-container-execution.service.js";
import { MixedContainerOrganizationService } from "./mixed-container-organization.service.js";
import { BuyerRevisionInput, UpdateMcPaymentInput } from "@dmx/contracts/mixed-container.zod";
import { canAccessMixedContainer } from "./mixed-container.policy.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/httpErrors.js";
const service = new MixedContainerService(prisma);
const procurementService = new MixedContainerProcurementService(prisma);
const allocationService = new MixedContainerAllocationService(prisma);
const executionService = new MixedContainerExecutionService(prisma);
const organizationService = new MixedContainerOrganizationService(prisma);
function actor(req) {
    return req.user;
}
export const mixedContainerController = {
    list: async (_req, res) => {
        res.json({ items: await service.list(actor(_req)) });
    },
    create: async (req, res) => {
        const input = CreateMixedContainerInput.parse(req.body);
        res.status(201).json(await service.create(input, actor(req)));
    },
    addSiblingContainer: async (req, res) => {
        res.status(201).json(await service.addSiblingContainer(req.params.id, actor(req)));
    },
    get: async (req, res) => {
        const ok = await canAccessMixedContainer(prisma, actor(req), req.params.id);
        if (!ok)
            throw new AppError(403, "FORBIDDEN");
        res.json(await service.fetchDTO(req.params.id));
    },
    update: async (req, res) => {
        const input = UpdateMixedContainerInput.parse(req.body);
        res.json(await service.update(req.params.id, input, actor(req)));
    },
    addLine: async (req, res) => {
        const input = AddContainerLineInput.parse(req.body);
        res.json(await service.addLine(req.params.id, input, actor(req)));
    },
    updateLine: async (req, res) => {
        const input = UpdateContainerLineInput.parse(req.body);
        res.json(await service.updateLine(req.params.id, req.params.lineId, input, actor(req)));
    },
    removeLine: async (req, res) => {
        res.json(await service.removeLine(req.params.id, req.params.lineId, actor(req)));
    },
    requestPricing: async (req, res) => {
        const input = SubmitProcurementRequestInput.parse(req.body ?? {});
        res.json(await service.requestPricing(req.params.id, actor(req), input));
    },
    procurementRequest: async (req, res) => {
        res.json(await procurementService.getProcurementRequest(req.params.id, actor(req)));
    },
    timeline: async (req, res) => {
        res.json({ items: await service.timeline(req.params.id, actor(req)) });
    },
    commercialProposal: async (req, res) => {
        const offerId = typeof req.query.offerId === "string" ? req.query.offerId : undefined;
        res.json(await procurementService.getCommercialProposal(req.params.id, actor(req), offerId));
    },
    getOffer: async (req, res) => {
        res.json(await procurementService.getBuyerOffer(req.params.offerId, actor(req)));
    },
    approveOffer: async (req, res) => {
        res.json(await procurementService.approveOffer(req.params.offerId, actor(req)));
    },
    requestRevision: async (req, res) => {
        const input = BuyerRevisionInput.parse(req.body);
        res.json(await procurementService.requestRevision(req.params.offerId, input, actor(req)));
    },
    coordination: async (req, res) => {
        res.json(await allocationService.getCoordination(req.params.id, actor(req)));
    },
    reviewProforma: async (req, res) => {
        res.json(await allocationService.reviewProforma(req.params.id, req.params.proformaId, actor(req)));
    },
    updatePayment: async (req, res) => {
        const input = UpdateMcPaymentInput.parse(req.body);
        res.json(await allocationService.updatePayment(req.params.id, req.params.paymentId, input, actor(req)));
    },
    execution: async (req, res) => {
        res.json(await executionService.getExecution(req.params.id, actor(req)));
    },
    organization: async (req, res) => {
        res.json(await organizationService.getOrganization(req.params.id, actor(req)));
    },
};
//# sourceMappingURL=mixed-container.controller.js.map
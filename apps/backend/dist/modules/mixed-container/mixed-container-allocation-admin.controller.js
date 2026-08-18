import { CreateMcAllocationInput, UploadMcProformaInput, CreateMcPaymentInput, UpdateMcPaymentInput, } from "@dmx/contracts/mixed-container.zod";
import { MixedContainerAllocationService } from "./mixed-container-allocation.service.js";
import { prisma } from "../../db/prisma.js";
const service = new MixedContainerAllocationService(prisma);
function actor(req) {
    return req.user;
}
export const mixedContainerAllocationAdminController = {
    kpis: async (_req, res) => {
        res.json(await service.allocationKpis());
    },
    inbox: async (_req, res) => {
        res.json({ items: await service.allocationInbox() });
    },
    get: async (req, res) => {
        res.json(await service.getAllocationWorkspace(req.params.id));
    },
    startAllocation: async (req, res) => {
        res.json(await service.startAllocation(req.params.id, actor(req)));
    },
    createAllocation: async (req, res) => {
        const input = CreateMcAllocationInput.parse(req.body);
        res.json(await service.createAllocation(req.params.id, input, actor(req)));
    },
    completeAllocations: async (req, res) => {
        res.json(await service.completeAllocations(req.params.id, actor(req)));
    },
    uploadProforma: async (req, res) => {
        const input = UploadMcProformaInput.parse(req.body);
        res.json(await service.uploadProforma(req.params.id, req.params.allocationId, input, actor(req)));
    },
    createPayment: async (req, res) => {
        const input = CreateMcPaymentInput.parse(req.body);
        res.json(await service.createPayment(req.params.id, input, actor(req)));
    },
    updatePayment: async (req, res) => {
        const input = UpdateMcPaymentInput.parse(req.body);
        res.json(await service.updatePayment(req.params.id, req.params.paymentId, input, actor(req)));
    },
};
//# sourceMappingURL=mixed-container-allocation-admin.controller.js.map
import { UpdateOrganizationStatusInput, AssignOperationsManagerInput, } from "@dmx/contracts/mixed-container-organization";
import { McInternalNoteInput } from "@dmx/contracts/mixed-container-procurement";
import { MixedContainerOrganizationService } from "./mixed-container-organization.service.js";
import { MixedContainerProcurementService } from "./mixed-container-procurement.service.js";
import { prisma } from "../../db/prisma.js";
const organizationService = new MixedContainerOrganizationService(prisma);
const procurementService = new MixedContainerProcurementService(prisma);
function actor(req) {
    return req.user;
}
export const mixedContainerOrganizationAdminController = {
    get: async (req, res) => {
        res.json(await organizationService.getOrganization(req.params.id, actor(req), true));
    },
    updateStatus: async (req, res) => {
        const input = UpdateOrganizationStatusInput.parse(req.body);
        res.json(await organizationService.updateStatus(req.params.id, input, actor(req)));
    },
    assignManager: async (req, res) => {
        const { managerId } = AssignOperationsManagerInput.parse(req.body);
        res.json(await organizationService.assignOperationsManager(req.params.id, managerId, actor(req)));
    },
    addInternalNote: async (req, res) => {
        const input = McInternalNoteInput.parse(req.body);
        await procurementService.addInternalNote(req.params.id, input, actor(req));
        res.json(await organizationService.getOrganization(req.params.id, actor(req), true));
    },
};
//# sourceMappingURL=mixed-container-organization-admin.controller.js.map
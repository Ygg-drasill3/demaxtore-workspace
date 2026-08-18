import type { Request, Response } from "express";
import {
  UpdateOrganizationStatusInput,
  AssignOperationsManagerInput,
} from "@dmx/contracts/mixed-container-organization";
import { McInternalNoteInput } from "@dmx/contracts/mixed-container-procurement";
import { MixedContainerOrganizationService } from "./mixed-container-organization.service.js";
import { MixedContainerProcurementService } from "./mixed-container-procurement.service.js";
import { prisma } from "../../db/prisma.js";

const organizationService = new MixedContainerOrganizationService(prisma);
const procurementService = new MixedContainerProcurementService(prisma);

function actor(req: Request) {
  return req.user!;
}

export const mixedContainerOrganizationAdminController = {
  get: async (req: Request, res: Response) => {
    res.json(await organizationService.getOrganization(req.params.id, actor(req), true));
  },

  updateStatus: async (req: Request, res: Response) => {
    const input = UpdateOrganizationStatusInput.parse(req.body);
    res.json(await organizationService.updateStatus(req.params.id, input, actor(req)));
  },

  assignManager: async (req: Request, res: Response) => {
    const { managerId } = AssignOperationsManagerInput.parse(req.body);
    res.json(await organizationService.assignOperationsManager(req.params.id, managerId, actor(req)));
  },

  addInternalNote: async (req: Request, res: Response) => {
    const input = McInternalNoteInput.parse(req.body);
    await procurementService.addInternalNote(req.params.id, input, actor(req));
    res.json(await organizationService.getOrganization(req.params.id, actor(req), true));
  },
};

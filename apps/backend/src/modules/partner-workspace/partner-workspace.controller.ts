import type { Request, Response } from "express";
import { z } from "zod";
import {
  AssignPartnerInput,
  PartnerConfirmCargoReadyInput,
  PartnerConfirmGateInInput,
  PartnerRoleEnum,
} from "@dmx/contracts/partner-workspace";
import { prisma } from "../../db/prisma.js";
import { PartnerWorkspaceService } from "./partner-workspace.service.js";

function actor(req: Request) {
  const u = req.user!;
  return { id: u.id, email: u.email, role: u.role };
}

export const partnerWorkspaceController = {
  async home(req: Request, res: Response) {
    const svc = new PartnerWorkspaceService(prisma);
    res.json(await svc.home(actor(req)));
  },

  async listTransactions(req: Request, res: Response) {
    const svc = new PartnerWorkspaceService(prisma);
    res.json({ items: await svc.listTransactions(actor(req)) });
  },

  async getTransaction(req: Request, res: Response) {
    const svc = new PartnerWorkspaceService(prisma);
    res.json(await svc.getTransaction(actor(req), req.params.workspaceId));
  },

  async completeTask(req: Request, res: Response) {
    const svc = new PartnerWorkspaceService(prisma);
    res.json(await svc.completeTask(actor(req), req.params.taskId));
  },

  async confirmCargoReady(req: Request, res: Response) {
    const body = PartnerConfirmCargoReadyInput.parse(req.body ?? {});
    const svc = new PartnerWorkspaceService(prisma);
    res.json(await svc.confirmCargoReady(actor(req), req.params.orderId, body));
  },

  async confirmGateIn(req: Request, res: Response) {
    const body = PartnerConfirmGateInInput.parse(req.body ?? {});
    const svc = new PartnerWorkspaceService(prisma);
    res.json(await svc.confirmGateIn(actor(req), req.params.shipmentId, body));
  },

  async listAssignable(req: Request, res: Response) {
    const partnerRole = PartnerRoleEnum.parse(req.query.role);
    const svc = new PartnerWorkspaceService(prisma);
    res.json(await svc.listAssignablePartners(actor(req), partnerRole));
  },

  async listAssignments(req: Request, res: Response) {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    const svc = new PartnerWorkspaceService(prisma);
    res.json(await svc.listWorkspaceAssignments(actor(req), workspaceId));
  },

  async assign(req: Request, res: Response) {
    const body = AssignPartnerInput.parse(req.body);
    const svc = new PartnerWorkspaceService(prisma);
    res.status(201).json(await svc.assignPartner(actor(req), body));
  },

  async revoke(req: Request, res: Response) {
    const svc = new PartnerWorkspaceService(prisma);
    res.json(await svc.revokeAssignment(actor(req), req.params.assignmentId));
  },
};

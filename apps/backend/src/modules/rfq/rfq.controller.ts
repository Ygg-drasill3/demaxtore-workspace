// =============================================================================
// DeMaxtore — RFQ Express controllers
// Destination: apps/backend/src/modules/rfq/rfq.controller.ts
// =============================================================================
import type { Request, Response } from "express";
import { z } from "zod";
import {
  CreateRfqDraftInput, EditRfqDraftInput, ActionEnvelope,
  AssignSuppliersPayload, RemoveSupplierPayload, RejectRfqPayload, PublishRfqPayload,
  ExtendDeadlinePayload, ReopenQuotationsPayload, SelectSupplierPayload,
  RevertSelectionPayload, CloseWithoutAwardPayload, RequestProformaPayload,
  SubmitProformaPayload, DeclineProformaPayload, ApproveProformaPayload,
  RejectProformaPayload, IssuePoPayload, CancelRfqPayload, AddObserverPayload, RemoveObserverPayload,
  SubmitRfqPayload, StartEvaluationPayload, CloseQuotationsEarlyPayload,
  WithdrawRfqPayload, ReviseRejectedRfqPayload, DeadlineReachedPayload,
  DeadlineReachedNoBidsPayload, ProformaSlaExpiredPayload, SyncOrderClosedPayload,
  PostClarificationPayload, ListRfqQuery,
  SelectProcurementStrategyInput, SpawnCommodityBidFromRfqInput,
} from "@dmx/contracts/rfq.zod";
import { computeRfqNextActions } from "@dmx/contracts/rfq.next-actions";
import type { RfqAction } from "@dmx/contracts/rfq.fsm";
import { RfqService } from "./rfq.service";
import { canAccessRfq } from "./rfq.policy";
import { prisma } from "../../db";
import { AppError } from "../../utils/httpErrors";

const service = new RfqService(prisma);

// Per-action payload schemas — used by the generic action handler
const PAYLOAD_SCHEMAS: Partial<Record<RfqAction, z.ZodTypeAny>> = {
  submit_rfq:              SubmitRfqPayload,
  assign_suppliers:        AssignSuppliersPayload,
  add_more_suppliers:      AssignSuppliersPayload,
  remove_supplier:         RemoveSupplierPayload,
  reject_rfq:              RejectRfqPayload,
  withdraw_rfq:            WithdrawRfqPayload,
  revise_rejected_rfq:     ReviseRejectedRfqPayload,
  publish_rfq:             PublishRfqPayload,
  extend_deadline:         ExtendDeadlinePayload,
  close_quotations_early:  CloseQuotationsEarlyPayload,
  deadline_reached:        DeadlineReachedPayload,
  deadline_reached_no_bids: DeadlineReachedNoBidsPayload,
  reopen_quotations:       ReopenQuotationsPayload,
  start_evaluation:        StartEvaluationPayload,
  select_supplier:         SelectSupplierPayload,
  revert_selection:        RevertSelectionPayload,
  close_without_award:     CloseWithoutAwardPayload,
  request_proforma:        RequestProformaPayload,
  submit_proforma:         SubmitProformaPayload,
  decline_proforma:        DeclineProformaPayload,
  proforma_sla_expired:    ProformaSlaExpiredPayload,
  approve_proforma:        ApproveProformaPayload,
  reject_proforma:         RejectProformaPayload,
  issue_po:                IssuePoPayload,
  sync_order_closed:       SyncOrderClosedPayload,
  cancel_rfq:              CancelRfqPayload,
  add_observer:            AddObserverPayload,
  remove_observer:         RemoveObserverPayload,
};

async function loadAccessible(req: Request) {
  const ws = await prisma.workspace.findUnique({
    where: { id: req.params.id },
    include: {
      rfqDetails: true, rfqLineItems: { orderBy: { position: "asc" } },
      participants: true, supplierAssignments: { where: { removedAt: null } },
      createdBy: { select: { displayName: true } },
    },
  });
  if (!ws) throw new AppError(404, "RFQ_NOT_FOUND");
  if (ws.trashedAt) throw new AppError(404, "RFQ_NOT_FOUND");
  if (!(await canAccessRfq(prisma, req.user!, ws.id))) throw new AppError(403, "FORBIDDEN");
  return ws;
}

export const rfqController = {

  async createDraft(req: Request, res: Response) {
    const input = CreateRfqDraftInput.parse(req.body);
    const dto = await service.createDraft(input, req.user!);
    res.status(201).json(dto);
  },

  async editDraft(req: Request, res: Response) {
    const input = EditRfqDraftInput.parse(req.body);
    const ws = await loadAccessible(req);
    const dto = await service.editDraft(ws.id, input, req.user!);
    res.json(dto);
  },

  async get(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    const { recordSupplierViewIfApplicable } = await import(
      "../supplier-activity/supplier-activity.service.js"
    );
    await recordSupplierViewIfApplicable(ws.id, req.user!, ws.participants);
    res.json(await service.toDTO(ws, req.user!));
  },

  async list(req: Request, res: Response) {
    const q = ListRfqQuery.parse(req.query);
    res.json(await service.list(q, req.user!));
  },

  async trash(req: Request, res: Response) {
    await service.moveToTrash(req.params.id, req.user!);
    res.status(204).end();
  },

  async restore(req: Request, res: Response) {
    await service.restoreFromTrash(req.params.id, req.user!);
    res.status(204).end();
  },

  async timeline(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    const events = await service.timeline(ws.id, req.query);
    if (req.user!.role === "SUPPLIER") {
      res.json(
        (events as Array<{ actor?: { displayName?: string; role?: string } | null }>).map((e) => ({
          ...e,
          actor: e.actor
            ? { ...e.actor, displayName: e.actor.role === "SUPPLIER" ? e.actor.displayName : "Buyer" }
            : e.actor,
        })),
      );
      return;
    }
    res.json(events);
  },

  async listClarifications(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    res.json(await service.listClarifications(ws.id));
  },

  async listAttachments(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    res.json(await service.listAttachments(ws.id));
  },

  async spawnedOrders(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    const orders = await prisma.workspace.findMany({
      where: { spawnedFromId: ws.id, type: "ORDER" },
      select: { id: true, externalRef: true, state: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(orders);
  },

  async nextActions(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    const ctx = await service.buildNextActionContext(ws, req.user!);
    res.json(computeRfqNextActions(ctx));
  },

  /** Generic FSM action endpoint — wires through applyTransition(). */
  action(action: RfqAction) {
    return async (req: Request, res: Response) => {
      const env = ActionEnvelope.parse(req.body ?? {});
      const schema = PAYLOAD_SCHEMAS[action];
      const payload = schema ? schema.parse(env.payload ?? {}) : (env.payload ?? {});
      const ws = await loadAccessible(req);

      const result = await service.applyTransition({
        workspaceId: ws.id,
        action,
        actor: { id: req.user!.id, email: req.user!.email, role: req.user!.role },
        payload,
        idempotencyKey: env.idempotencyKey,
        reason: env.reason,
        requestContext: { ip: req.ip, userAgent: req.headers["user-agent"] ?? "" },
      });
      const dto = await service.fetchDTO(ws.id);
      res.json({ ...result, workspace: dto });
    };
  },

  async postClarification(req: Request, res: Response) {
    const input = PostClarificationPayload.parse(req.body);
    const ws = await loadAccessible(req);
    const result = await service.applyTransition({
      workspaceId: ws.id,
      action: "post_clarification",
      actor: { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      payload: input,
    });
    res.status(201).json(result);
  },

  async markClarificationRead(req: Request, res: Response) {
    await service.markClarificationRead(req.params.id, req.params.messageId, req.user!.id);
    res.status(204).end();
  },

  async adminQueue(req: Request, res: Response) {
    res.json(await service.adminQueue());
  },

  async lookupSuppliers(req: Request, res: Response) {
    const q = z.object({
      q: z.string().max(200).optional(),
      category: z.string().optional(),
      country:  z.string().optional(),
      limit:    z.coerce.number().int().min(1).max(100).default(20),
    }).parse(req.query);
    res.json(await service.lookupSuppliers(q));
  },

  async selectProcurementStrategy(req: Request, res: Response) {
    const input = SelectProcurementStrategyInput.parse(req.body);
    const ws = await loadAccessible(req);
    const dto = await service.selectProcurementStrategy(ws.id, input, req.user!);
    res.json(dto);
  },

  async spawnCommodityBidFromRfq(req: Request, res: Response) {
    const input = SpawnCommodityBidFromRfqInput.parse(req.body);
    const ws = await loadAccessible(req);
    const result = await service.spawnCommodityBidFromRfq(ws.id, input, req.user!);
    res.status(201).json(result);
  },

  async runSchedulerTick(_req: Request, res: Response) {
    const { runRfqSchedulerTick } = await import("./rfq.scheduler.js");
    await runRfqSchedulerTick();
    res.json({ ok: true });
  },

};

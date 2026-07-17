// =============================================================================
// DeMaxtore — Sprint 2 RFQ Service: applyTransition() reference implementation
// Destination: apps/backend/src/modules/rfq/rfq.service.ts
//
// CONTRACT (non-negotiable):
//  - This is the ONLY function in the codebase that updates workspaces.state.
//  - Every state mutation runs inside this transaction.
//  - Inside the tx we SET LOCAL app.fsm_authorised = 'true' so the Postgres
//    state-guard trigger lets the UPDATE through.
//  - Timeline event + Audit log + Notifications are written in the SAME tx.
//  - Socket emits are deferred to the post-commit hook.
// =============================================================================

import { PrismaClient, Prisma } from "@prisma/client";
import type { Role } from "@prisma/client";
import {
  RFQ_TRANSITIONS, findRfqTransition,
  type RfqState, type RfqAction, type RfqTransition, type ActorRole,
} from "@dmx/contracts/rfq.fsm";
import { resolveRecipients } from "./rfq.notifications";
import { PRECONDITIONS } from "./rfq.preconditions";
import { socketBus } from "../../realtime/socket-bus";
import { AppError } from "../../utils/httpErrors";
import { logger } from "../../logger";
import { spawnOrderWorkspace } from "../order/order.spawn.js";
import { createPurchaseOrderOnOrderSpawn } from "../purchase-order/purchase-order.spawn.js";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { generatePoNumber } from "../../utils/po-number.js";
import { IssuePoPayload } from "@dmx/contracts/rfq.zod";

export interface ApplyTransitionInput {
  workspaceId: string;
  action: RfqAction;
  actor: { id: string; email: string; role: ActorRole };
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  reason?: string;
  requestContext?: { ip?: string; userAgent?: string };
}

export interface ApplyTransitionResult {
  workspaceId: string;
  fromState: RfqState;
  toState: RfqState;
  timelineEventId: string;
  auditLogId: string;
  notificationsCreated: number;
}

export class RfqService {
  public readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Single entrypoint for ALL RFQ workspace state mutations.
   * Caller MUST NOT update workspaces.state directly.
   */
  async applyTransition(input: ApplyTransitionInput): Promise<ApplyTransitionResult> {
    const { workspaceId, action, actor, payload = {}, idempotencyKey, reason, requestContext } = input;

    // Idempotency short-circuit
    if (idempotencyKey) {
      const existing = await this.prisma.auditLog.findFirst({
        where: { workspaceId, payload: { path: ["idempotencyKey"], equals: idempotencyKey } },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        const ws = await this.prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
        return {
          workspaceId,
          fromState: existing.fromState as RfqState,
          toState: existing.toState as RfqState,
          timelineEventId: "(idempotent-replay)",
          auditLogId: existing.id,
          notificationsCreated: 0,
        };
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // (a) Allow the state-guard trigger to permit the UPDATE we are about to do
      await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);

      // (b) Lock the workspace row so concurrent transitions serialise
      const lockRows = await tx.$queryRaw<Array<{ id: string; state: string; type: string }>>(
        Prisma.sql`SELECT id, state, type FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`,
      );
      if (lockRows.length === 0) throw new AppError(404, "WORKSPACE_NOT_FOUND");
      const currentState = lockRows[0].state as RfqState;
      if (lockRows[0].type !== "RFQ") {
        throw new AppError(409, "WRONG_WORKSPACE_TYPE");
      }

      // (c) Find the FSM transition
      const transition = findRfqTransition(currentState, action);
      if (!transition) {
        if (action === "issue_po" && currentState === "PO_ISSUED") {
          throw new AppError(409, "PO_ALREADY_ISSUED");
        }
        throw new AppError(400, "UNKNOWN_ACTION", { from: currentState, action });
      }

      // (d) Role check
      if (!transition.allowedRoles.includes(actor.role)) {
        throw new AppError(403, "FORBIDDEN_ROLE", { allowed: transition.allowedRoles, actor: actor.role });
      }

      // (e) Participant constraint check (skip for ADMIN / SYSTEM)
      if (
        transition.requiredParticipant &&
        actor.role !== "ADMIN" &&
        actor.role !== "SYSTEM"
      ) {
        const p = await tx.workspaceParticipant.findFirst({
          where: { workspaceId, userId: actor.id },
        });
        if (!p) throw new AppError(403, "FORBIDDEN_NON_PARTICIPANT");
        if (
          transition.requiredParticipant !== "ANY" &&
          p.participantRole !== transition.requiredParticipant
        ) {
          throw new AppError(403, "FORBIDDEN_PARTICIPANT", {
            required: transition.requiredParticipant,
            actual: p.participantRole,
          });
        }
      }

      // (f) Reason check
      if (transition.requiresReason && !reason?.trim()) {
        throw new AppError(400, "REASON_REQUIRED", { action });
      }

      // (g) Per-action preconditions (pure functions, no I/O — they get the full row)
      const workspaceFull = await tx.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        include: {
          rfqDetails: true,
          rfqLineItems: true,
          rfqAttachments: true,
          supplierAssignments: { where: { removedAt: null } },
          participants: true,
          quotations: {
            where: { withdrawnAt: null },
            select: { id: true, supplierUserId: true, withdrawnAt: true },
          },
          _count: { select: { quotations: { where: { withdrawnAt: null } } } },
          freightEstimates: {
            where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
            orderBy: { estimatedAt: "desc" },
            take: 1,
          },
        },
      });
      for (const pre of transition.preconditions ?? []) {
        const fn = PRECONDITIONS[pre];
        if (!fn) throw new AppError(500, "UNKNOWN_PRECONDITION", { pre });
        fn({ workspace: workspaceFull, payload, actor });
      }

      if (action === "assign_suppliers" || action === "add_more_suppliers") {
        const supplierUserIds = (payload.supplierUserIds as string[]) ?? [];
        const users = await tx.user.findMany({
          where: { id: { in: supplierUserIds } },
          select: { id: true, role: true },
        });
        const found = new Set(users.map((u) => u.id));
        const missing = supplierUserIds.filter((id) => !found.has(id));
        if (missing.length) throw new AppError(404, "RFQ_SUPPLIER_NOT_FOUND", { missing });
        const notSupplier = users.filter((u) => u.role !== "SUPPLIER").map((u) => u.id);
        if (notSupplier.length)
          throw new AppError(400, "RFQ_USER_NOT_SUPPLIER", { userIds: notSupplier });
      }

      // (h) Perform the state update
      if (transition.to !== ("*" as RfqState) && transition.to !== currentState) {
        await tx.workspace.update({
          where: { id: workspaceId },
          data: { state: transition.to },
        });
      }

      // (i) Run side-effects specific to this action (line item edits, supplier inserts, etc.)
      await this.runActionSideEffects(tx, transition, workspaceFull, payload, actor);

      // (j) Append timeline event
      const timelineEvent = await tx.timelineEvent.create({
        data: {
          workspaceId,
          eventType: transition.auditEvent,
          actorUserId: actor.role === "SYSTEM" ? null : actor.id,
          payload: { ...payload, reason, idempotencyKey } as Prisma.InputJsonValue,
        },
      });

      // (k) Append audit log (separate, with actor snapshots)
      const auditLog = await tx.auditLog.create({
        data: {
          workspaceId,
          actorUserId: actor.id,
          actorEmail: actor.email,
          actorRole: actor.role,
          action,
          fromState: currentState,
          toState: transition.to === ("*" as RfqState) ? currentState : transition.to,
          reason,
          payload: { ...payload, idempotencyKey } as Prisma.InputJsonValue,
          ipAddress: requestContext?.ip,
          userAgent: requestContext?.userAgent,
        },
      });

      // (l) Notifications (write in tx, emit on commit). We create rows
      //     one-by-one (instead of createMany) so we have ids to emit.
      const recipients = await resolveRecipients(tx, transition, workspaceFull, actor);
      const createdNotifications: Array<{
        id: string;
        userId: string | null;
        role: string | null;
        type: string;
        eventType: string | null;
        title: string;
        message: string;
        link: string | null;
        workspaceId: string | null;
        createdAt: Date;
      }> = [];
      for (const r of recipients) {
        const n = await tx.notification.create({
          data: {
            userId: r.userId,
            role: r.broadcastRole ?? null,
            workspaceId,
            eventType: transition.auditEvent,
            type: r.notificationType,
            title: r.title,
            message: r.message,
            link: `/workspace/rfq/${workspaceId}`,
          },
        });
        createdNotifications.push(n);
      }

      const toNotificationDTO = (n: typeof createdNotifications[number]) => ({
        id:            n.id,
        type:          n.type,
        titleKey:      n.eventType ?? "notification.generic",
        title:         n.title,
        body:          n.message ?? null,
        link:          n.link ?? null,
        workspaceId:   n.workspaceId ?? null,
        workspaceType: "RFQ" as const,
        read:          false,
        readAt:        null,
        createdAt:     n.createdAt.toISOString(),
      });

      const timelineEventDTO = {
        id:          timelineEvent.id,
        eventType:   timelineEvent.eventType,
        actorUserId: timelineEvent.actorUserId,
        createdAt:   timelineEvent.createdAt.toISOString(),
        payload:     timelineEvent.payload as Record<string, unknown> | null,
      };

      const newState = transition.to === ("*" as RfqState) ? currentState : transition.to;

      // (m) Post-commit hook — emit sockets after tx commits.
      socketBus.scheduleEmit(() => {
        // Workspace-scoped — for subscribers viewing this RFQ.
        socketBus.emitToWorkspace(workspaceId, "rfq.state.changed", {
          workspaceId,
          fromState: currentState,
          toState:   newState,
          action,
          actorUserId: actor.role === "SYSTEM" ? null : actor.id,
          occurredAt: new Date().toISOString(),
        });
        socketBus.emitToWorkspace(workspaceId, "rfq.timeline.appended", {
          workspaceId,
          event: timelineEventDTO,
        });
        // Friendlier aliases (used by lightweight UI listeners).
        socketBus.emitToWorkspace(workspaceId, "timeline:new",     { workspaceId, event: timelineEventDTO });
        socketBus.emitToWorkspace(workspaceId, "workspace:update", { workspaceId, state: newState, action });

        // Personal + role-wide notification fan-out.
        for (const n of createdNotifications) {
          const dto = toNotificationDTO(n);
          if (n.userId) socketBus.emitToUser(n.userId, "notification:new", { notification: dto });
          if (n.role)   socketBus.emitToRole(n.role as Role, "notification:new", { notification: dto });
        }

        void import("../notification-center/delivery.dispatcher.js").then(({ scheduleNotificationChannelDeliveries }) => {
          scheduleNotificationChannelDeliveries(
            createdNotifications
              .filter((n) => n.userId)
              .map((n) => ({ id: n.id, userId: n.userId! })),
          );
        });
      });

      return {
        workspaceId,
        fromState: currentState,
        toState:   newState,
        timelineEventId: timelineEvent.id,
        auditLogId: auditLog.id,
        notificationsCreated: createdNotifications.length,
      };
    });

    if (action === "assign_suppliers" || action === "add_more_suppliers") {
      void (async () => {
        try {
          const { TradeChatService } = await import("../chat/chat.service.js");
          await new TradeChatService(this.prisma).ensureRfqConversations(workspaceId, actor);
        } catch (err) {
          logger.warn({ err, workspaceId }, "RFQ WhatsApp thread ensure failed");
        }
      })();
    }

    if (action === "post_clarification") {
      void (async () => {
        try {
          const { getMessagingWriteBridge } = await import("../unified-messaging/messaging-write.bridge.js");
          const latest = await this.prisma.clarificationMessage.findFirst({
            where: { thread: { workspaceId } },
            orderBy: { createdAt: "desc" },
          });
          if (!latest) return;
          const body = String(payload.message ?? "").trim();
          const visibility = payload.visibility === "ADMIN_ONLY" ? "ADMIN_ONLY" : "ALL";
          await getMessagingWriteBridge(this.prisma).onWorkspaceMessageCreated({
            actor: { id: actor.id, role: actor.role, email: actor.email },
            workspaceType: "RFQ",
            workspaceId,
            auditWorkspaceId: workspaceId,
            messageId: latest.id,
            body,
            messageType: visibility === "ADMIN_ONLY" ? "INTERNAL_NOTE" : "MESSAGE",
            visibility: visibility === "ADMIN_ONLY" ? "ADMIN_ONLY" : "ALL_PARTICIPANTS",
            legacySource: "rfq_clarification",
          });
        } catch (err) {
          logger.warn({ err, workspaceId }, "RFQ clarification messaging bridge failed");
        }
      })();
    }

    void (async () => {
      const { emitFromRfqAuditEvent, bootstrapSpawnedOrdersForParent } =
        await import("../conversation-hub/conversation-hub.hooks.js");
      const transition = findRfqTransition(result.fromState, action);
      if (transition?.auditEvent) {
        emitFromRfqAuditEvent(this.prisma, workspaceId, transition.auditEvent, actor.id);
      }
      if (action === "issue_po") {
        bootstrapSpawnedOrdersForParent(this.prisma, workspaceId, actor.id);
      }
    })();

    return result;
  }

  /**
   * Per-action side effects beyond the state field itself.
   * Example: `assign_suppliers` inserts SupplierAssignment + WorkspaceParticipant rows.
   * Example: `extend_deadline` updates deadlineExtensionCount + deadlineExtensionTotalDays.
   *
   * The full table is in /app/docs/sprint-2-implementation-plan.md §6.3.
   */
  private async runActionSideEffects(
    tx: Prisma.TransactionClient,
    transition: RfqTransition,
    ws: Awaited<ReturnType<RfqService["loadFull"]>>,
    payload: Record<string, unknown>,
    actor: ApplyTransitionInput["actor"],
  ) {
    switch (transition.action) {
      case "assign_suppliers":
      case "add_more_suppliers": {
        const supplierIds = (payload.supplierUserIds as string[]) ?? [];
        const { ensureInvitedLogs } = await import("../supplier-activity/supplier-activity.service.js");
        for (const sid of supplierIds) {
          await tx.supplierAssignment.create({
            data: { workspaceId: ws.id, supplierUserId: sid, assignedById: actor.id },
          });
          await tx.workspaceParticipant.upsert({
            where: { workspaceId_userId_participantRole: { workspaceId: ws.id, userId: sid, participantRole: "COUNTERPARTY" } },
            create: { workspaceId: ws.id, userId: sid, participantRole: "COUNTERPARTY" },
            update: {},
          });
        }
        await ensureInvitedLogs(tx, ws.id, supplierIds);
        return;
      }

      case "remove_supplier": {
        const sid = payload.supplierUserId as string;
        await tx.supplierAssignment.updateMany({
          where: { workspaceId: ws.id, supplierUserId: sid, removedAt: null },
          data: { removedAt: new Date(), removedById: actor.id },
        });
        return;
      }

      case "extend_deadline": {
        const newDeadline = new Date(payload.newDeadline as string);
        const oldDeadline = ws.deadlineAt!;
        const addedDays = Math.ceil(
          (newDeadline.getTime() - oldDeadline.getTime()) / (1000 * 60 * 60 * 24),
        );
        await tx.workspace.update({
          where: { id: ws.id },
          data: {
            deadlineAt: newDeadline,
            deadlineExtensionCount: { increment: 1 },
            deadlineExtensionTotalDays: { increment: addedDays },
          },
        });
        return;
      }

      case "request_proforma": {
        const slaDeadline = addBusinessDays(new Date(), 5);
        await tx.workspace.update({
          where: { id: ws.id },
          data: {
            proformaRequestedAt: new Date(),
            proformaSlaDeadlineAt: slaDeadline,
          },
        });
        return;
      }

      case "submit_proforma": {
        await tx.rfqDetails.update({
          where: { workspaceId: ws.id },
          data: {
            proformaFileUrl: payload.proformaFileUrl as string,
            proformaSubmittedAt: new Date(),
          },
        });
        return;
      }

      case "select_supplier": {
        await tx.rfqDetails.update({
          where: { workspaceId: ws.id },
          data: {
            selectedSupplierUserId: payload.supplierUserId as string,
            selectedQuotationId: payload.quotationId as string,
            selectionRationale: (payload.rationale as string) ?? null,
          },
        });
        const { autoGenerateFreightEstimateInTx } = await import("../freight-estimate/freight-estimate.service.js");
        await autoGenerateFreightEstimateInTx(tx, ws.id, actor.id, {
          supplierId: payload.supplierUserId as string,
        });
        return;
      }

      case "add_observer": {
        const uid = payload.observerUserId as string;
        if (!uid) throw new AppError(400, "OBSERVER_USER_REQUIRED");
        await tx.workspaceParticipant.upsert({
          where: {
            workspaceId_userId_participantRole: {
              workspaceId: ws.id,
              userId: uid,
              participantRole: "OBSERVER",
            },
          },
          create: { workspaceId: ws.id, userId: uid, participantRole: "OBSERVER" },
          update: {},
        });
        return;
      }

      case "remove_observer": {
        const uid = payload.observerUserId as string;
        if (!uid) throw new AppError(400, "OBSERVER_USER_REQUIRED");
        await tx.workspaceParticipant.deleteMany({
          where: { workspaceId: ws.id, userId: uid, participantRole: "OBSERVER" },
        });
        return;
      }

      case "post_clarification": {
        const body = String(payload.message ?? "").trim();
        if (!body) throw new AppError(400, "CLARIFICATION_MESSAGE_REQUIRED");
        const replyTo = typeof payload.replyToMessageId === "string" ? payload.replyToMessageId : null;
        const visibility = payload.visibility === "ADMIN_ONLY" ? "ADMIN_ONLY" : "ALL";
        const mentionedUserIds = Array.isArray(payload.mentionedUserIds)
          ? (payload.mentionedUserIds as string[]).slice(0, 20)
          : [];
        const attachmentIds = Array.isArray(payload.attachmentIds)
          ? (payload.attachmentIds as string[]).slice(0, 10)
          : [];

        const thread = await tx.clarificationThread.upsert({
          where: { workspaceId: ws.id },
          create: { workspaceId: ws.id },
          update: {},
        });

        const msg = await tx.clarificationMessage.create({
          data: {
            threadId: thread.id,
            authorUserId: actor.id,
            parentMessageId: replyTo,
            body,
            visibility,
            mentionedUserIds,
          },
        });

        if (attachmentIds.length > 0) {
          await tx.rfqAttachment.updateMany({
            where: {
              id: { in: attachmentIds },
              workspaceId: ws.id,
              uploadedById: actor.id,
              clarificationMessageId: null,
            },
            data: { clarificationMessageId: msg.id },
          });
        }
        return;
      }

      case "issue_po": {
        const issue = IssuePoPayload.parse(payload);
        const details = ws.rfqDetails;
        if (!details?.selectedSupplierUserId) throw new AppError(400, "NO_SELECTED_SUPPLIER");
        const poNumber = generatePoNumber();
        const quotation = await tx.quotation.findFirst({
          where: { workspaceId: ws.id, supplierUserId: details.selectedSupplierUserId, withdrawnAt: null },
        });
        await tx.rfqDetails.update({
          where: { workspaceId: ws.id },
          data: {
            poNumber,
            poIssuedAt: new Date(),
            poFileUrl: issue.mode === "manual" ? (issue.poFileUrl ?? null) : null,
          },
        });
        const spawned = await spawnOrderWorkspace(tx, {
          parentWorkspaceId: ws.id,
          parentType: "RFQ",
          parentExternalRef: ws.externalRef,
          buyerUserId: ws.createdById,
          supplierUserId: details.selectedSupplierUserId,
          contractRef: poNumber,
          currency: ws.currency ?? "USD",
          totalValue: quotation?.total != null ? Number(quotation.total) : 0,
          incoterms: details.incoterm,
          originPort: "CNSHA",
          destinationPort: details.targetMarket?.slice(0, 20) ?? "NLRTM",
          actorUserId: actor.id,
          auditEvent: "order.created_from_rfq",
          timelinePayload: { poNumber, rfqWorkspaceId: ws.id },
        });
        const lineItems = quotation
          ? await tx.quotationLineItem.findMany({ where: { quotationId: quotation.id }, orderBy: { position: "asc" } })
          : await tx.rfqLineItem.findMany({ where: { workspaceId: ws.id }, orderBy: { position: "asc" } });
        const poId = await createPurchaseOrderOnOrderSpawn(tx, {
          orderId: spawned.orderWorkspaceId,
          poNumber,
          buyerId: ws.createdById,
          supplierId: details.selectedSupplierUserId,
          currency: ws.currency ?? "USD",
          incoterm: details.incoterm,
          paymentTerms: quotation?.paymentTerms ?? null,
          lines: lineItems.map((li, i) => ({
            description: li.description,
            quantity: Number(li.quantity),
            unitPrice: Number(
              "unitPrice" in li ? li.unitPrice : (li as { targetPrice?: { toString(): string } | null }).targetPrice ?? 1,
            ),
            sku: `LINE-${i + 1}`,
          })),
          actorUserId: actor.id,
          actorEmail: actor.email,
          actorRole: actor.role,
          source: issue.mode,
          documentUrl: issue.mode === "manual" ? (issue.poFileUrl ?? null) : null,
          documentFileName:
            issue.mode === "manual" && issue.poFileUrl
              ? decodeURIComponent(issue.poFileUrl.split("/").pop() ?? "uploaded-po.pdf")
              : null,
          issueReason:
            issue.mode === "manual"
              ? "Buyer uploaded PO document"
              : "Initial PO issuance",
        });
        socketBus.scheduleEmit(() => {
          socketBus.emitToWorkspace(spawned.orderWorkspaceId, SocketEvents.PO_ISSUED, {
            poId,
            orderId: spawned.orderWorkspaceId,
          });
        });
        return;
      }

      // No side effects beyond state change & timeline for the rest.
      default:
        return;
    }
  }

  // Helper used inside the transaction's snapshot fetch.
  private loadFull(workspaceId: string) {
    return this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: {
        rfqDetails: true,
        rfqLineItems: true,
        supplierAssignments: { where: { removedAt: null } },
        participants: true,
      },
    });
  }
}

// Business-day helper (Decision #3 — proforma 5 BD, Decision #5 — deadline accounting).
function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

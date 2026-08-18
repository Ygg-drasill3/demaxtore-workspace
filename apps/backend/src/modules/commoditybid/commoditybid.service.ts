// =============================================================================
// DeMaxtore — Sprint 3A CommodityBid Service: applyTransition() reference implementation
// Destination: apps/backend/src/modules/commoditybid/commoditybid.service.ts
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
  findCommodityBidTransition,
  type CommodityBidState, type CommodityBidAction, type CommodityBidTransition, type ActorRole,
} from "@dmx/contracts/commoditybid.fsm";
import { resolveRecipients } from "./commoditybid.notifications.js";
import { PRECONDITIONS } from "./commoditybid.preconditions.js";
import { socketBus } from "../../realtime/socket-bus";
import { AppError } from "../../utils/httpErrors";
import { logger } from "../../logger";
import { spawnOrderWorkspace } from "../order/order.spawn.js";
import { createPurchaseOrderOnOrderSpawn } from "../purchase-order/purchase-order.spawn.js";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { createAuctionEngine } from "./auction-engine.js";
import { recordWinners, approveWinners } from "./winner-engine.js";

export interface ApplyTransitionInput {
  workspaceId: string;
  action: CommodityBidAction;
  actor: { id: string; email: string; role: ActorRole };
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  reason?: string;
  requestContext?: { ip?: string; userAgent?: string };
}

export interface ApplyTransitionResult {
  workspaceId: string;
  fromState: CommodityBidState;
  toState: CommodityBidState;
  timelineEventId: string;
  auditLogId: string;
  notificationsCreated: number;
}

export class CommodityBidService {
  public readonly prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Single entrypoint for ALL CommodityBid workspace state mutations.
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
          fromState: existing.fromState as CommodityBidState,
          toState: existing.toState as CommodityBidState,
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
      const currentState = lockRows[0].state as CommodityBidState;
      if (lockRows[0].type !== "COMMODITYBID") {
        throw new AppError(409, "WRONG_WORKSPACE_TYPE");
      }

      const transition = findCommodityBidTransition(currentState, action);
      if (!transition) {
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
          commodityBidDetails: true,
          commodityBidLots: true,
          commodityBidInvitations: { where: { removedAt: null } },
          commodityBidSubmissions: true,
          commodityBidAwards: true,
          participants: true,
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

      // (h) Perform the state update
      if (transition.to !== ("*" as CommodityBidState) && transition.to !== currentState) {
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
          toState: transition.to === ("*" as CommodityBidState) ? currentState : transition.to,
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
            link: `/workspace/commoditybid/${workspaceId}`,
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
        workspaceType: "COMMODITYBID" as const,
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

      const newState = transition.to === ("*" as CommodityBidState) ? currentState : transition.to;

      socketBus.scheduleEmit(() => {
        socketBus.emitToWorkspace(workspaceId, "commoditybid.updated", {
          workspaceId,
          fromState: currentState,
          toState:   newState,
          action,
          actorUserId: actor.role === "SYSTEM" ? null : actor.id,
          occurredAt: new Date().toISOString(),
        });
        socketBus.emitToWorkspace(workspaceId, "commoditybid.timeline.appended", {
          workspaceId,
          event: timelineEventDTO,
        });
        socketBus.emitToWorkspace(workspaceId, "timeline:new",     { workspaceId, event: timelineEventDTO });
        socketBus.emitToWorkspace(workspaceId, "workspace:update", { workspaceId, state: newState, action });

        const lotId = payload.lotId as string | undefined;
        const bidEventBase = { workspaceId, lotId: lotId ?? "", occurredAt: new Date().toISOString() };
        if (transition.action === "submit_bid_lot" || transition.action === "revise_bid_lot") {
          socketBus.emitToWorkspace(workspaceId, "auction.bid.submitted", {
            ...bidEventBase,
            unitPrice: payload.unitPrice as number | undefined,
          });
          socketBus.emitToWorkspace(workspaceId, "commoditybid.bid.submitted", bidEventBase);
        }
        if (transition.action === "auction_started")
          socketBus.emitToWorkspace(workspaceId, "auction.started", bidEventBase);
        if (transition.action === "auction_closed")
          socketBus.emitToWorkspace(workspaceId, "auction.closed", bidEventBase);
        if (transition.action === "winner_selected")
          socketBus.emitToWorkspace(workspaceId, "auction.winner.selected", bidEventBase);
        if (transition.action === "require_buyer_approval")
          socketBus.emitToWorkspace(workspaceId, "auction.approval.required", bidEventBase);

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

      const result = {
        workspaceId,
        fromState: currentState,
        toState:   newState,
        timelineEventId: timelineEvent.id,
        auditLogId: auditLog.id,
        notificationsCreated: createdNotifications.length,
      };

      return result;
    });

    void (async () => {
      const { emitFromFsmAuditEvent, bootstrapSpawnedOrdersForParent } =
        await import("../conversation-hub/conversation-hub.hooks.js");
      const transition = findCommodityBidTransition(result.fromState, action);
      if (transition?.auditEvent && result.timelineEventId !== "(idempotent-replay)") {
        emitFromFsmAuditEvent(
          this.prisma,
          "COMMODITYBID",
          workspaceId,
          transition.auditEvent,
          actor.role === "SYSTEM" ? null : actor.id,
        );
      }
      if (action === "spawn_orders") {
        bootstrapSpawnedOrdersForParent(this.prisma, workspaceId, actor.id);
      }
    })();

    return result;
  }

  /** Legacy no-op — auction engine uses buyer approval path. */
  async checkAllAwardsFinalised(_workspaceId: string): Promise<void> {}

  /**
   * Per-action side effects beyond the state field itself.
   * Example: `assign_suppliers` inserts SupplierAssignment + WorkspaceParticipant rows.
   * Example: `extend_deadline` updates deadlineExtensionCount + deadlineExtensionTotalDays.
   *
   * The full table is in /app/docs/sprint-2-implementation-plan.md §6.3.
   */
  private async runActionSideEffects(
    tx: Prisma.TransactionClient,
    transition: CommodityBidTransition,
    ws: Awaited<ReturnType<CommodityBidService["loadFull"]>>,
    payload: Record<string, unknown>,
    actor: ApplyTransitionInput["actor"],
  ) {
    const auctionEngine = createAuctionEngine(this.prisma);
    switch (transition.action) {
      case "schedule_auction": {
        const starts = new Date(payload.auctionStartsAt as string);
        const durationMin = Number(payload.auctionDurationMinutes ?? 30);
        const invLeadMin = Number(payload.invitationDeadlineMinutes ?? 60);
        const ends = new Date(starts.getTime() + durationMin * 60_000);
        const invDeadline = new Date(starts.getTime() - invLeadMin * 60_000);
        await tx.commodityBidDetails.update({
          where: { workspaceId: ws.id },
          data: {
            auctionStartsAt: starts,
            auctionEndsAt: ends,
            auctionDurationMinutes: durationMin,
            invitationDeadlineAt: invDeadline,
            auctionRules: {
              supplierUserIds: payload.supplierUserIds as string[],
              minBidImprovement: (payload.minBidImprovement as number) ?? 0,
            } as Prisma.InputJsonValue,
          },
        });
        await tx.workspace.update({
          where: { id: ws.id },
          data: { deadlineAt: ends },
        });
        return;
      }

      case "start_invitations": {
        const rules = (ws.commodityBidDetails?.auctionRules ?? {}) as { supplierUserIds?: string[] };
        const supplierIds = rules.supplierUserIds ?? (payload.supplierUserIds as string[]) ?? [];
        await auctionEngine.inviteSuppliers(tx, ws.id, supplierIds, actor.id);
        return;
      }

      case "supplier_view_invitation": {
        await tx.commodityBidInvitation.updateMany({
          where: { workspaceId: ws.id, supplierUserId: actor.id, viewedAt: null },
          data: { viewedAt: new Date(), status: "VIEWED" },
        });
        return;
      }

      case "supplier_accept_invitation": {
        await tx.commodityBidInvitation.updateMany({
          where: { workspaceId: ws.id, supplierUserId: actor.id },
          data: { acceptedAt: new Date(), status: "ACCEPTED" },
        });
        return;
      }

      case "supplier_decline_invitation": {
        await tx.commodityBidInvitation.updateMany({
          where: { workspaceId: ws.id, supplierUserId: actor.id },
          data: { declinedAt: new Date(), status: "DECLINED" },
        });
        return;
      }

      case "supplier_join_auction": {
        await tx.commodityBidInvitation.updateMany({
          where: { workspaceId: ws.id, supplierUserId: actor.id },
          data: { joinedAt: new Date(), status: "JOINED" },
        });
        return;
      }

      case "submit_bid_lot":
      case "revise_bid_lot": {
        const lotId = payload.lotId as string;
        const unitPrice = payload.unitPrice as number;
        const data = {
          workspaceId: ws.id,
          lotId,
          supplierUserId: actor.id,
          unitPrice: new Prisma.Decimal(unitPrice),
          currency: ws.currency!,
          leadTimeDays: (payload.leadTimeDays as number) ?? null,
          moq: (payload.moq as number) ?? null,
          paymentTerms: (payload.paymentTerms as string) ?? null,
          deliveryTerms: (payload.deliveryTerms as string) ?? null,
          validUntil: new Date(payload.validUntil as string),
          notes: (payload.notes as string) ?? null,
          withdrawnAt: null,
        };
        await tx.commodityBidSubmission.upsert({
          where: { lotId_supplierUserId: { lotId, supplierUserId: actor.id } },
          create: data,
          update: { ...data, updatedAt: new Date() },
        });
        await auctionEngine.recordBidEvent(
          tx, ws.id, lotId, actor.id, unitPrice,
          transition.action === "submit_bid_lot" ? "SUBMITTED" : "REVISED",
        );
        await tx.commodityBidDetails.update({
          where: { workspaceId: ws.id },
          data: { lowestBidAmount: unitPrice, lowestBidSupplierId: actor.id },
        });
        return;
      }

      case "winner_selected": {
        const { findLowestValidBids } = await import("./winner-engine.js");
        const winners = await findLowestValidBids(tx, ws.id);
        await recordWinners(tx, ws.id, winners);
        return;
      }

      case "withdraw_bid_lot": {
        const lotId = payload.lotId as string;
        await tx.commodityBidSubmission.updateMany({
          where: { lotId, supplierUserId: actor.id, withdrawnAt: null },
          data: { withdrawnAt: new Date() },
        });
        return;
      }

      case "approve_winner": {
        await approveWinners(tx, ws.id);
        const { autoGenerateFreightEstimateInTx } = await import("../freight-estimate/freight-estimate.service.js");
        await autoGenerateFreightEstimateInTx(tx, ws.id, actor.id);
        return;
      }

      case "spawn_orders": {
        const accepted = await tx.commodityBidAward.findMany({
          where: { workspaceId: ws.id, status: "ACCEPTED" },
        });
        const bySupplier = new Map<string, typeof accepted>();
        for (const a of accepted) {
          const list = bySupplier.get(a.supplierUserId) ?? [];
          list.push(a);
          bySupplier.set(a.supplierUserId, list);
        }
        for (const [supplierId, awards] of bySupplier) {
          const sub = await tx.commodityBidSubmission.findFirst({
            where: { id: awards[0].submissionId },
            include: { lot: true },
          });
          const qty = sub?.lot.quantity ?? 1;
          const total = sub ? Number(sub.unitPrice) * Number(qty) : 0;
          const contractRef = `CB-${ws.externalRef}-${supplierId.slice(0, 8)}`;
          const spawned = await spawnOrderWorkspace(tx, {
            parentWorkspaceId: ws.id,
            parentType: "COMMODITYBID",
            parentExternalRef: ws.externalRef,
            buyerUserId: ws.createdById,
            supplierUserId: supplierId,
            contractRef,
            currency: ws.currency ?? "USD",
            totalValue: total,
            incoterms: sub?.lot.incoterms ?? "FOB",
            actorUserId: actor.id,
            auditEvent: "order.created_from_commoditybid",
            timelinePayload: { commoditybidWorkspaceId: ws.id, awardIds: awards.map((a) => a.id) },
          });
          const poId = await createPurchaseOrderOnOrderSpawn(tx, {
            orderId: spawned.orderWorkspaceId,
            poNumber: contractRef,
            buyerId: ws.createdById,
            supplierId,
            currency: ws.currency ?? "USD",
            incoterm: sub?.lot.incoterms ?? "FOB",
            lines: [{
              description: sub?.lot.commodity ?? "Commodity lot",
              quantity: Number(qty),
              unitPrice: Number(sub?.unitPrice ?? 1),
            }],
            actorUserId: actor.id,
            actorEmail: actor.email,
            actorRole: actor.role,
            source: "COMMODITY_BID",
          });
          socketBus.scheduleEmit(() => {
            socketBus.emitToWorkspace(spawned.orderWorkspaceId, SocketEvents.PO_ISSUED, {
              poId,
              orderId: spawned.orderWorkspaceId,
            });
          });
        }
        return;
      }

      default:
        return;
    }
  }

  private loadFull(workspaceId: string) {
    return this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: {
        commodityBidDetails: true,
        commodityBidLots: true,
        commodityBidInvitations: { where: { removedAt: null } },
        commodityBidSubmissions: true,
        commodityBidAwards: true,
        participants: true,
      },
    });
  }
}

const BIDDER_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateBidderCode(used: Set<string>): string {
  for (let i = 0; i < 200; i++) {
    const letter = BIDDER_LETTERS[Math.floor(Math.random() * BIDDER_LETTERS.length)];
    const num = String(Math.floor(Math.random() * 90) + 10);
    const code = `BIDDER-${letter}${num}`;
    if (!used.has(code)) return code;
  }
  throw new Error("BIDDER_CODE_EXHAUSTED");
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

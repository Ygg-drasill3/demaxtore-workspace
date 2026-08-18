import { PrismaClient, Prisma } from "@prisma/client";
import type { Role } from "@prisma/client";
import {
  findShipmentTransition,
  resolveShipmentTargetState,
  SHIPMENT_SELF_LOOP_ACTIONS,
  type ShipmentState,
  type ShipmentAction,
  type ShipmentTransition,
} from "@dmx/contracts/shipment.fsm";
import type { ActorRole } from "@dmx/contracts/rfq.fsm";
import { resolveRecipients } from "./shipment.notifications.js";
import { PRECONDITIONS } from "./shipment.preconditions.js";
import { socketBus } from "../../realtime/socket-bus";
import { buildFsmNotificationMetadata } from "../notification-engine/fsm-notification-metadata.js";
import { AppError } from "../../utils/httpErrors.js";
import { claimProcessedEvent, releaseProcessedEvent } from "../../lib/processed-event.js";
import {
  computeShipmentPermissions,
  ShipmentWorkspaceOps,
} from "./shipment-workspace.ops.js";

export interface ApplyTransitionInput {
  workspaceId: string;
  action: ShipmentAction;
  actor: { id: string; email: string; role: ActorRole };
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  reason?: string;
  requestContext?: { ip?: string; userAgent?: string };
}

export interface ApplyTransitionResult {
  workspaceId: string;
  fromState: ShipmentState;
  toState: ShipmentState;
  timelineEventId: string;
  auditLogId: string;
  notificationsCreated: number;
  exceptionId?: string;
}

export class ShipmentService {
  constructor(public readonly prisma: PrismaClient) {}

  async applyTransition(input: ApplyTransitionInput): Promise<ApplyTransitionResult> {
    return this.runOneTransition(input);
  }

  private async runOneTransition(input: ApplyTransitionInput): Promise<ApplyTransitionResult> {
    const { workspaceId, action, actor, payload = {}, idempotencyKey, reason, requestContext } = input;

    if (idempotencyKey) {
      const existing = await this.prisma.auditLog.findFirst({
        where: { workspaceId, payload: { path: ["idempotencyKey"], equals: idempotencyKey } },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        return {
          workspaceId,
          fromState: existing.fromState as ShipmentState,
          toState: existing.toState as ShipmentState,
          timelineEventId: "(idempotent-replay)",
          auditLogId: existing.id,
          notificationsCreated: 0,
        };
      }
      const claimed = await claimProcessedEvent(this.prisma, {
        source: "fsm:shipment",
        eventId: `${workspaceId}:${idempotencyKey}`,
        workspaceId,
        action,
      });
      if (!claimed) {
        const replay = await this.prisma.auditLog.findFirst({
          where: { workspaceId, payload: { path: ["idempotencyKey"], equals: idempotencyKey } },
          orderBy: { createdAt: "desc" },
        });
        if (replay) {
          return {
            workspaceId,
            fromState: replay.fromState as ShipmentState,
            toState: replay.toState as ShipmentState,
            timelineEventId: "(idempotent-replay)",
            auditLogId: replay.id,
            notificationsCreated: 0,
          };
        }
        throw new AppError(409, "IDEMPOTENT_IN_FLIGHT");
      }
    }

    let exceptionId: string | undefined;

    const txnPromise = this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);

      const lockRows = await tx.$queryRaw<Array<{ id: string; state: string; type: string }>>(
        Prisma.sql`SELECT id, state, type FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`,
      );
      if (lockRows.length === 0) throw new AppError(404, "WORKSPACE_NOT_FOUND");
      const currentState = lockRows[0].state as ShipmentState;
      if (lockRows[0].type !== "SHIPMENT") throw new AppError(409, "WRONG_WORKSPACE_TYPE");

      const transition = findShipmentTransition(currentState, action, actor.role);
      if (!transition) throw new AppError(400, "UNKNOWN_ACTION", { from: currentState, action });

      if (!transition.allowedRoles.includes(actor.role)) {
        throw new AppError(403, "FORBIDDEN_ROLE", { allowed: transition.allowedRoles, actor: actor.role });
      }

      if (transition.requiredParticipant && actor.role !== "ADMIN" && actor.role !== "SYSTEM") {
        const p = await tx.workspaceParticipant.findFirst({ where: { workspaceId, userId: actor.id } });
        if (!p) throw new AppError(403, "FORBIDDEN_NON_PARTICIPANT");
        if (transition.requiredParticipant !== "ANY" && p.participantRole !== transition.requiredParticipant) {
          throw new AppError(403, "FORBIDDEN_PARTICIPANT");
        }
      }

      const effectiveReason = (reason ?? payload.reason) as string | undefined;
      if (transition.requiresReason && !effectiveReason?.trim()) {
        throw new AppError(400, "REASON_REQUIRED", { action });
      }

      const workspaceFull = await tx.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        include: {
          shipmentWorkspace: true,
          participants: true,
          shipmentExceptions: { where: { status: "OPEN" }, take: 1 },
        },
      });

      for (const pre of transition.preconditions ?? []) {
        const fn = PRECONDITIONS[pre];
        if (!fn) throw new AppError(500, "UNKNOWN_PRECONDITION", { pre });
        fn({ workspace: workspaceFull, payload, actor });
      }

      if (action === "complete_shipment") {
        const { assertShipmentCompletionAllowed } = await import(
          "../trade-documents/compliance.js"
        );
        await assertShipmentCompletionAllowed(tx, workspaceId, actor, payload);
      }

      let newState = resolveShipmentTargetState(currentState, transition);
      if (transition.action === "resolve_exception") {
        // Resume ONLY to the server-recorded pre-exception state. The client must
        // not be able to choose an arbitrary resumeState (e.g. jump straight to
        // DELIVERED/COMPLETED), which would bypass every intermediate FSM gate (C2).
        const open = workspaceFull.shipmentExceptions[0];
        if (!open) throw new AppError(409, "NO_OPEN_EXCEPTION");
        newState = open.stateBefore as ShipmentState;
      }

      if (newState === currentState && !SHIPMENT_SELF_LOOP_ACTIONS.includes(action)) {
        throw new AppError(409, "NO_STATE_CHANGE", { from: currentState, action });
      }

      if (newState !== currentState) {
        await tx.workspace.update({ where: { id: workspaceId }, data: { state: newState } });
      }

      exceptionId = await this.runActionSideEffects(
        tx, transition, workspaceFull, payload, actor, currentState, reason, newState,
      );

      const timelineEvent = await tx.timelineEvent.create({
        data: {
          workspaceId,
          eventType: transition.auditEvent,
          actorUserId: actor.role === "SYSTEM" ? null : actor.id,
          payload: { ...payload, reason: reason ?? payload.reason, idempotencyKey } as Prisma.InputJsonValue,
        },
      });

      const auditLog = await tx.auditLog.create({
        data: {
          workspaceId,
          actorUserId: actor.id,
          actorEmail: actor.email,
          actorRole: actor.role,
          action,
          fromState: currentState,
          toState: newState,
          reason: (reason ?? payload.reason) as string | undefined,
          payload: { ...payload, idempotencyKey } as Prisma.InputJsonValue,
          ipAddress: requestContext?.ip,
          userAgent: requestContext?.userAgent,
        },
      });

      const recipients = await resolveRecipients(tx, transition, workspaceFull, actor);
      const createdNotifications: Array<{ id: string; userId: string | null }> = [];
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
            link: `/workspace/shipment/${workspaceId}`,
            metadata: buildFsmNotificationMetadata({
              auditEvent: transition.auditEvent,
              commWorkspaceType: "SHIPMENT",
              commWorkspaceId: workspaceId,
              workspaceRef: workspaceFull.externalRef,
            }),
          },
        });
        if (n.userId) createdNotifications.push({ id: n.id, userId: n.userId });
      }

      const timelineEventDTO = {
        id: timelineEvent.id,
        eventType: timelineEvent.eventType,
        actorUserId: timelineEvent.actorUserId,
        createdAt: timelineEvent.createdAt.toISOString(),
        payload: timelineEvent.payload as Record<string, unknown> | null,
      };

      socketBus.scheduleEmit(() => {
        socketBus.emitToWorkspace(workspaceId, "shipment.state.changed", {
          workspaceId,
          fromState: currentState,
          toState: newState,
          actorUserId: actor.role === "SYSTEM" ? null : actor.id,
          occurredAt: new Date().toISOString(),
        });
        socketBus.emitToWorkspace(workspaceId, "shipment.timeline.appended", { workspaceId, event: timelineEventDTO });
        socketBus.emitToWorkspace(workspaceId, "shipment.updated", {
          workspaceId,
          fromState: currentState,
          toState: newState,
          action,
          actorUserId: actor.role === "SYSTEM" ? null : actor.id,
          occurredAt: new Date().toISOString(),
        });
        socketBus.emitToWorkspace(workspaceId, "timeline:new", { workspaceId, event: timelineEventDTO });
        socketBus.emitToWorkspace(workspaceId, "workspace:update", { workspaceId, state: newState, action });
        if (transition.action === "report_exception" && exceptionId) {
          socketBus.emitToWorkspace(workspaceId, "shipment.exception.created", {
            workspaceId,
            exceptionId,
            category: String(payload.category),
          });
        }
        if (transition.action === "resolve_exception" && exceptionId) {
          socketBus.emitToWorkspace(workspaceId, "shipment.exception.resolved", { workspaceId, exceptionId });
        }

        if (createdNotifications.length) {
          void import("../notification-center/delivery.dispatcher.js").then(({ scheduleNotificationChannelDeliveries }) => {
            scheduleNotificationChannelDeliveries(
              createdNotifications.filter((n): n is { id: string; userId: string } => Boolean(n.userId)),
            );
          });
        }
      });

      return {
        workspaceId,
        fromState: currentState,
        toState: newState,
        timelineEventId: timelineEvent.id,
        auditLogId: auditLog.id,
        notificationsCreated: createdNotifications.length,
        exceptionId,
      };
    });

    let result: Awaited<typeof txnPromise>;
    if (idempotencyKey) {
      try {
        result = await txnPromise;
      } catch (err) {
        // Transaction rolled back — release the claim so a retry is not bricked.
        await releaseProcessedEvent(this.prisma, "fsm:shipment", `${workspaceId}:${idempotencyKey}`).catch(() => {});
        throw err;
      }
    } else {
      result = await txnPromise;
    }

    if (result.toState === "COMPLETED") {
      const { FreightCommercialService } = await import(
        "../freightiq/commercial/freight-commercial.service.js"
      );
      await new FreightCommercialService(this.prisma).realizeRevenueForShipment(
        workspaceId,
        { id: actor.id, email: actor.email, role: actor.role as "BUYER" | "SUPPLIER" | "ADMIN" },
      );
    }

    void this.notifyOrchestrator(workspaceId, action, payload, result).catch(() => {});

    if (result.timelineEventId !== "(idempotent-replay)") {
      void (async () => {
        const { emitFromFsmAuditEvent } = await import("../conversation-hub/conversation-hub.hooks.js");
        const transition = findShipmentTransition(result.fromState, action, actor.role);
        if (transition?.auditEvent) {
          emitFromFsmAuditEvent(
            this.prisma,
            "SHIPMENT",
            workspaceId,
            transition.auditEvent,
            actor.role === "SYSTEM" ? null : actor.id,
          );
        }
      })();
    }

    return result;
  }

  private async notifyOrchestrator(
    shipmentId: string,
    action: ShipmentAction,
    payload: Record<string, unknown>,
    result: ApplyTransitionResult,
  ): Promise<void> {
    const { isOrchestratorEnabled } = await import("../../config/orchestrator.js");
    if (!isOrchestratorEnabled()) return;
    const { OrderShipmentOrchestrator } = await import("../orchestration/order-shipment-orchestrator.service.js");
    await new OrderShipmentOrchestrator(this.prisma).onShipmentTransition({
      shipmentId,
      action,
      payload,
      eventId: `${shipmentId}:${action}:${result.fromState}->${result.toState}`,
    });
  }

  private async runActionSideEffects(
    tx: Prisma.TransactionClient,
    transition: ShipmentTransition,
    ws: {
      id: string;
      state: string;
      shipmentWorkspace: Record<string, unknown> | null;
      shipmentExceptions: Array<{ id: string; stateBefore: string }>;
    },
    payload: Record<string, unknown>,
    actor: { id: string },
    currentState: ShipmentState,
    reason?: string,
    newState?: ShipmentState,
  ): Promise<string | undefined> {
    const sw = ws.shipmentWorkspace;
    if (!sw) return undefined;

    const update = async (data: Record<string, unknown>) => {
      await tx.shipmentWorkspace.update({ where: { workspaceId: ws.id }, data });
    };

    let exceptionId: string | undefined;

    switch (transition.action) {
      case "confirm_booking":
        if (currentState === "SHIPMENT_CREATED") {
          await update({
            carrierName: (payload.carrierName as string) ?? null,
            bookingRef: (payload.bookingRef as string) ?? null,
          });
        } else {
          await update({ bookingConfirmedAt: new Date() });
        }
        break;
      case "assign_container": {
        const containerNumber = payload.containerNumber as string;
        await update({
          containerNumber,
          containerAssignedAt: new Date(),
        });
        const swId = sw.id as string | undefined;
        if (swId && containerNumber?.trim()) {
          const existing = await tx.shipmentContainer.findFirst({
            where: { shipmentWorkspaceId: swId, containerNumber },
            select: { id: true },
          });
          if (!existing) {
            await tx.shipmentContainer.create({
              data: {
                shipmentWorkspaceId: swId,
                containerNumber,
                status: "PLANNED",
              },
            });
          }
        }
        break;
      }
      case "pickup_cargo":
        if (currentState === "CONTAINER_ASSIGNED") break;
        await update({ pickedUpAt: new Date() });
        break;
      case "load_vessel":
        await update({
          vesselName: payload.vesselName as string,
          voyageNumber: (payload.voyageNumber as string) ?? null,
          loadedAt: new Date(),
        });
        break;
      case "depart_vessel":
        await update({ departedAt: new Date() });
        break;
      case "arrive_destination":
        await update({ arrivedAt: new Date() });
        break;
      case "start_customs":
        await update({ customsStartedAt: new Date() });
        break;
      case "complete_customs":
        await update({ customsCompletedAt: new Date() });
        break;
      case "confirm_partial_delivery":
        await tx.shipmentStatusUpdate.create({
          data: {
            workspaceId: ws.id,
            updateType: "DELIVERY",
            label: payload.partialDeliveryNote as string,
            notes: [
              payload.deliveredQuantity != null ? `delivered: ${payload.deliveredQuantity}` : null,
              payload.remainingQuantity != null ? `remaining: ${payload.remainingQuantity}` : null,
            ].filter(Boolean).join("; ") || undefined,
            reportedById: actor.id,
          },
        });
        break;
      case "confirm_delivery":
        await update({ deliveredAt: new Date() });
        break;
      case "reject_shipment":
        await update({ completedAt: new Date() });
        break;
      case "complete_shipment":
        await update({ completedAt: new Date() });
        break;
      case "report_exception": {
        const ex = await tx.shipmentException.create({
          data: {
            workspaceId: ws.id,
            category: payload.category as string,
            reason: (reason ?? payload.reason) as string,
            details: (payload.details as string) ?? null,
            stateBefore: currentState,
            reportedById: actor.id,
          },
        });
        exceptionId = ex.id;
        break;
      }
      case "resolve_exception": {
        const open = ws.shipmentExceptions[0];
        if (open) {
          await tx.shipmentException.update({
            where: { id: open.id },
            data: {
              status: "RESOLVED",
              resolution: (payload.resolution as string) ?? (reason as string),
              resumeState: newState as string | undefined,
              resolvedById: actor.id,
              resolvedAt: new Date(),
            },
          });
          exceptionId = open.id;
        }
        break;
      }
      case "upload_document": {
        const docType = payload.documentType as string;
        const latest = await tx.shipmentDocument.findFirst({
          where: { workspaceId: ws.id, documentType: docType },
          orderBy: { version: "desc" },
        });
        await tx.shipmentDocument.create({
          data: {
            workspaceId: ws.id,
            documentType: docType,
            fileName: payload.fileName as string,
            mimeType: payload.mimeType as string,
            storageKey: payload.storageKey as string,
            fileSizeBytes: payload.fileSizeBytes as number,
            version: (latest?.version ?? 0) + 1,
            uploadedById: actor.id,
          },
        });
        break;
      }
      default:
        break;
    }
    return exceptionId;
  }

  async fetchDTO(workspaceId: string, _user: { id: string; role: Role }) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: {
        shipmentWorkspace: { include: { containers: { orderBy: { createdAt: "asc" as const } } } },
        participants: { include: { user: { select: { id: true, email: true, displayName: true } } } },
        spawnedFrom: { select: { id: true, externalRef: true, type: true } },
        shipmentExceptions: { orderBy: { reportedAt: "desc" }, take: 20 },
      },
    });
    if (ws.type !== "SHIPMENT") throw new AppError(404, "SHIPMENT_NOT_FOUND");
    const sw = ws.shipmentWorkspace!;
    const supplier = ws.participants.find((p) => p.participantRole === "COUNTERPARTY");
    const buyer = ws.participants.find((p) => p.participantRole === "OWNER");
    const openException = ws.shipmentExceptions.find((e) => e.status === "OPEN");
    const ops = new ShipmentWorkspaceOps(this.prisma);
    const containers = (sw.containers ?? []).map((c) => ({
      id: c.id,
      containerNumber: c.containerNumber,
      containerType: c.containerType,
      sealNumber: c.sealNumber,
      grossWeightKg: c.grossWeightKg != null ? Number(c.grossWeightKg) : null,
      netWeightKg: c.netWeightKg != null ? Number(c.netWeightKg) : null,
      volumeCbm: c.volumeCbm != null ? Number(c.volumeCbm) : null,
      packageCount: c.packageCount,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
    const primaryContainer = containers[0]?.containerNumber ?? sw.containerNumber;
    return {
      id: ws.id,
      externalRef: ws.externalRef,
      state: ws.state,
      currency: ws.currency,
      spawnedFromId: ws.spawnedFromId,
      spawnedFrom: ws.spawnedFrom,
      orderRef: sw.orderRef,
      poRef: sw.poRef,
      contractRef: sw.contractRef,
      originPort: sw.originPort,
      destinationPort: sw.destinationPort,
      containerNumber: primaryContainer,
      vesselName: sw.vesselName,
      voyageNumber: sw.voyageNumber,
      bookingRef: sw.bookingRef,
      carrierName: sw.carrierName,
      transportMode: sw.transportMode,
      forwarderName: sw.forwarderName,
      etd: sw.etd?.toISOString() ?? null,
      eta: sw.eta?.toISOString() ?? null,
      currentEta: sw.eta?.toISOString() ?? null,
      ownerUserId: buyer?.userId,
      supplierUserId: supplier?.userId,
      hasOpenException: !!openException,
      booking: ops.buildBooking(sw),
      containers,
      permissions: computeShipmentPermissions(_user.role),
      participants: ws.participants.map((p) => ({
        userId: p.userId,
        participantRole: p.participantRole,
        displayName: p.user.displayName,
        email: p.user.email,
      })),
      exceptions: ws.shipmentExceptions.map((e) => ({
        id: e.id,
        category: e.category,
        reason: e.reason,
        status: e.status,
        stateBefore: e.stateBefore,
        reportedAt: e.reportedAt.toISOString(),
        resolvedAt: e.resolvedAt?.toISOString() ?? null,
      })),
    };
  }

  async timeline(workspaceId: string) {
    return this.prisma.timelineEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });
  }

  async listDocuments(workspaceId: string) {
    return this.prisma.shipmentDocument.findMany({
      where: { workspaceId },
      orderBy: [{ documentType: "asc" }, { version: "desc" }],
    });
  }

  async getDocument(workspaceId: string, docId: string) {
    const row = await this.prisma.shipmentDocument.findUnique({ where: { id: docId } });
    if (!row || row.workspaceId !== workspaceId) throw new AppError(404, "DOCUMENT_NOT_FOUND");
    return row;
  }

  async exceptions(workspaceId: string) {
    return this.prisma.shipmentException.findMany({
      where: { workspaceId },
      orderBy: { reportedAt: "desc" },
    });
  }
}

/**
 * Sprint 35 — Partner Workspace service.
 * Assignment-based access; reuses OperationalTask / Documents / Timeline.
 */
import type { PrismaClient } from "@prisma/client";
import type {
  AssignPartnerInput,
  PartnerConfirmCargoReadyInput,
  PartnerConfirmGateInInput,
  PartnerHomeDto,
  PartnerRole,
  PartnerTaskDto,
  PartnerTransactionDetailDto,
  PartnerTransactionSummaryDto,
} from "@dmx/contracts/partner-workspace";
import { partnerHasCapability } from "@dmx/contracts/partner-workspace";
import { daysUntil } from "@dmx/contracts/pre-arrival-customs";
import { AppError } from "../../utils/httpErrors.js";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";
import { OperationalTaskService } from "../operational-task/operational-task.service.js";
import {
  canManagePartnerAssignments,
  redactForPartner,
  resolvePartnerRole,
  type PartnerActor,
} from "./partner-workspace.policy.js";

const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

export class PartnerWorkspaceService {
  private readonly tasks: OperationalTaskService;

  constructor(private readonly db: PrismaClient) {
    this.tasks = new OperationalTaskService(db);
  }

  private async activeAssignmentIds(userId: string, partnerRole: PartnerRole): Promise<string[]> {
    const rows = await this.db.partnerAssignment.findMany({
      where: { userId, partnerRole, revokedAt: null },
      select: { workspaceId: true },
    });
    return rows.map((r) => r.workspaceId);
  }

  /** Supplier also inherits ORDER workspaces via COUNTERPARTY participation. */
  private async supplierOrderIds(userId: string): Promise<string[]> {
    const parts = await this.db.workspaceParticipant.findMany({
      where: {
        userId,
        leftAt: null,
        participantRole: "COUNTERPARTY",
        workspace: { type: "ORDER" },
      },
      select: { workspaceId: true },
    });
    return parts.map((p) => p.workspaceId);
  }

  private async accessibleWorkspaceIds(actor: PartnerActor, role: PartnerRole): Promise<string[]> {
    const assigned = await this.activeAssignmentIds(actor.id, role);
    if (role === "SUPPLIER") {
      const orders = await this.supplierOrderIds(actor.id);
      return [...new Set([...assigned, ...orders])];
    }
    return assigned;
  }

  async assertWorkspaceAccess(
    actor: PartnerActor,
    workspaceId: string,
  ): Promise<{ role: PartnerRole; workspaceType: string }> {
    const role = resolvePartnerRole(actor);
    if (!role) throw new AppError(403, "NOT_A_PARTNER");

    const ws = await this.db.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, type: true },
    });
    if (!ws) throw new AppError(404, "WORKSPACE_NOT_FOUND");

    const accessible = await this.accessibleWorkspaceIds(actor, role);
    if (!accessible.includes(workspaceId)) {
      throw new AppError(403, "PARTNER_NOT_ASSIGNED");
    }
    return { role, workspaceType: ws.type };
  }

  async home(actor: PartnerActor): Promise<PartnerHomeDto> {
    const role = resolvePartnerRole(actor);
    if (!role) throw new AppError(403, "NOT_A_PARTNER");

    const workspaceIds = await this.accessibleWorkspaceIds(actor, role);
    const now = new Date();
    const dayEnd = new Date(now);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const orderIds = await this.resolveOrderIds(workspaceIds);

    const openTasks = orderIds.length
      ? await this.db.operationalTask.findMany({
          where: {
            deletedAt: null,
            orderId: { in: orderIds },
            status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
            assignedToId: actor.id,
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          take: 40,
        })
      : [];

    const mine = openTasks;
    const tasksDueToday = mine.filter(
      (t) => t.dueDate && t.dueDate <= dayEnd,
    ).length;

    const missingDocs = orderIds.length
      ? await this.db.operationalIssue.count({
          where: {
            orderId: { in: orderIds },
            deletedAt: null,
            status: { in: ["OPEN", "IN_PROGRESS"] },
            impactType: "DOCUMENT_RISK",
            ownerRole: role,
          },
        })
      : 0;

    const workspaces = workspaceIds.length
      ? await this.db.workspace.findMany({
          where: { id: { in: workspaceIds } },
          select: { id: true, type: true, externalRef: true, state: true },
          take: 50,
        })
      : [];

    const transactions: PartnerTransactionSummaryDto[] = [];
    for (const w of workspaces) {
      const oids = await this.resolveOrderIds([w.id]);
      const openTaskCount = oids.length
        ? await this.db.operationalTask.count({
            where: {
              orderId: { in: oids },
              deletedAt: null,
              status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
              assignedToId: actor.id,
            },
          })
        : 0;
      transactions.push({
        workspaceId: w.id,
        workspaceType: w.type,
        externalRef: w.externalRef,
        state: w.state,
        partnerRole: role,
        openTaskCount,
      });
    }

    // Sprint 37 — CUSTOMS_BROKER: My Customs Cases (assignment-scoped only)
    let customsCases: PartnerHomeDto["customsCases"] = undefined;
    if (role === "CUSTOMS_BROKER") {
      const shipmentIds = workspaces.filter((w) => w.type === "SHIPMENT").map((w) => w.id);
      const cases = shipmentIds.length
        ? await this.db.customsCase.findMany({
            where: {
              shipmentWorkspaceId: { in: shipmentIds },
              status: { not: "CANCELLED" },
            },
            orderBy: { updatedAt: "desc" },
            take: 40,
            include: {
              shipmentWorkspace: {
                select: {
                  referenceNumber: true,
                  orderRef: true,
                  poRef: true,
                  eta: true,
                  buyerUserId: true,
                  destinationPort: true,
                },
              },
            },
          })
        : [];
      const issueCounts = await Promise.all(
        cases.map((c) =>
          this.db.operationalIssue.count({
            where: {
              orderId: c.orderWorkspaceId,
              deletedAt: null,
              status: { in: ["OPEN", "IN_PROGRESS"] },
              OR: [
                { impactType: "CUSTOMS_RISK" },
                { sourceEventType: { startsWith: "CUSTOMS_" } },
              ],
            },
          }),
        ),
      );
      const etaByShip = new Map<string, { eta: Date | null; source: string }>();
      for (const sid of shipmentIds) {
        const snap = await this.db.shipmentTrackingSnapshot.findFirst({
          where: { shipmentId: sid, eta: { not: null } },
          orderBy: { syncedAt: "desc" },
          select: { eta: true },
        });
        const booking = cases.find((c) => c.shipmentWorkspaceId === sid)?.shipmentWorkspace.eta ?? null;
        etaByShip.set(sid, {
          eta: snap?.eta ?? booking,
          source: snap?.eta ? "MARITIME" : booking ? "BOOKING" : "NONE",
        });
      }

      customsCases = cases
        .map((c, i) => {
          const op = etaByShip.get(c.shipmentWorkspaceId);
          const dta = daysUntil(op?.eta ?? c.shipmentWorkspace.eta);
          const urgency =
            c.status === "HOLD" || (issueCounts[i] ?? 0) > 0
              ? dta != null && dta <= 3
                ? "HIGH"
                : "MEDIUM"
              : "LOW";
          const blocking = issueCounts[i] ?? 0;
          const queueGroup =
            c.status === "HOLD"
              ? ("HOLD" as const)
              : c.status === "CLEARED"
                ? ("CLEARED" as const)
                : c.status === "DECLARATION_PREPARING"
                  ? ("DECLARATION_PREPARING" as const)
                  : c.status === "DECLARATION_FILED"
                    || c.status === "CUSTOMS_PROCESSING"
                    || c.status === "CLEARANCE_PENDING"
                    ? ("FILED_PROCESSING" as const)
                    : c.status === "BROKER_REVIEW"
                      ? ("UNDER_REVIEW" as const)
                      : blocking > 0 || c.readinessStatus === "NOT_READY"
                        ? ("ACTION_REQUIRED" as const)
                        : c.status === "READY_FOR_BROKER"
                          ? ("READY_FOR_REVIEW" as const)
                          : dta != null && dta <= 7
                            ? ("ARRIVING_SOON" as const)
                            : ("READY_FOR_REVIEW" as const);
          return {
            customsCaseId: c.id,
            shipmentWorkspaceId: c.shipmentWorkspaceId,
            shipmentRef: c.shipmentWorkspace.referenceNumber ?? c.shipmentWorkspace.orderRef ?? null,
            importerLabel: c.shipmentWorkspace.poRef ?? c.shipmentWorkspace.orderRef ?? null,
            eta: (op?.eta ?? c.shipmentWorkspace.eta)?.toISOString() ?? null,
            readinessStatus: c.readinessStatus,
            customsStatus: c.status,
            blockingIssues: blocking,
            daysToArrival: dta == null ? null : Math.round(dta * 10) / 10,
            etaSource: op?.source ?? "BOOKING",
            preArrivalPhase: c.status === "CLEARED" ? "CLEARED" : c.status === "HOLD" ? "ACTION_REQUIRED" : "PREPARING",
            urgency,
            priority: urgency,
            queueGroup,
            declarationStatus: c.declarationReference
              ? "EXTERNAL_DECLARATION_RECORDED"
              : c.status === "DECLARATION_PREPARING"
                ? "PREPARING"
                : "NOT_RECORDED",
            destinationPort: c.shipmentWorkspace.destinationPort ?? null,
            nextAction:
              c.status === "HOLD"
                ? "Resolve hold"
                : c.status === "READY_FOR_BROKER" || c.status === "DRAFT" || c.status === "PREPARING"
                  ? "Start review"
                  : c.status === "BROKER_REVIEW"
                    ? "Review products / documents"
                    : c.status === "DECLARATION_PREPARING"
                      ? "Record external declaration"
                      : c.status === "DECLARATION_FILED"
                        ? "Record customs processing"
                        : c.status === "CLEARANCE_PENDING"
                          ? "Mark cleared (broker reported)"
                          : c.declarationReference
                            ? "Update customs status"
                            : "Record declaration reference",
          };
        })
        .sort((a, b) => {
          const rank = (g?: string | null) =>
            g === "HOLD"
              ? 0
              : g === "ACTION_REQUIRED"
                ? 1
                : g === "ARRIVING_SOON"
                  ? 2
                  : g === "READY_FOR_REVIEW"
                    ? 3
                    : g === "UNDER_REVIEW"
                      ? 4
                      : g === "DECLARATION_PREPARING"
                        ? 5
                        : g === "FILED_PROCESSING"
                          ? 6
                          : 9;
          const dr = rank(a.queueGroup) - rank(b.queueGroup);
          if (dr !== 0) return dr;
          if (a.daysToArrival == null && b.daysToArrival == null) return 0;
          if (a.daysToArrival == null) return 1;
          if (b.daysToArrival == null) return -1;
          return a.daysToArrival - b.daysToArrival;
        });
    }

    // Sprint 41 — TRUCKER: My Deliveries (assignment-scoped only)
    let inlandDeliveries: PartnerHomeDto["inlandDeliveries"] = undefined;
    if (role === "TRUCKER") {
      const shipmentIds = workspaces.filter((w) => w.type === "SHIPMENT").map((w) => w.id);
      const rows = shipmentIds.length
        ? await this.db.inlandDelivery.findMany({
            where: {
              shipmentWorkspaceId: { in: shipmentIds },
              truckerUserId: actor.id,
              status: { not: "CANCELLED" },
            },
            orderBy: { updatedAt: "desc" },
            take: 40,
            include: {
              shipmentWorkspace: {
                select: {
                  referenceNumber: true,
                  orderRef: true,
                  containerNumber: true,
                },
              },
            },
          })
        : [];
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);

      inlandDeliveries = rows.map((r) => {
        const pickupMs = r.pickupAt?.getTime() ?? null;
        const isToday =
          pickupMs != null && pickupMs >= startOfToday.getTime() && pickupMs < endOfToday.getTime();
        const queueGroup =
          r.status === "DELIVERED"
            ? ("DELIVERED" as const)
            : r.status === "IN_TRANSIT" || r.status === "GATE_OUT" || r.status === "PICKED_UP"
              ? ("IN_TRANSIT" as const)
              : r.status === "READY_FOR_PICKUP"
                ? ("READY_FOR_PICKUP" as const)
                : isToday
                  ? ("PICKUP_TODAY" as const)
                  : r.status === "PICKUP_SCHEDULED" || (r.pickupAt && pickupMs! > Date.now())
                    ? ("UPCOMING_PICKUPS" as const)
                    : ("ACTION_REQUIRED" as const);
        const nextAction =
          r.status === "READY_FOR_PICKUP"
            ? "Confirm pickup"
            : r.status === "PICKED_UP"
              ? "Record gate-out"
              : r.status === "GATE_OUT"
                ? "Mark in transit"
                : r.status === "IN_TRANSIT"
                  ? "Mark delivered"
                  : r.status === "TRUCKER_ASSIGNED"
                    ? "Schedule pickup"
                    : r.status === "DELIVERED" && r.podStatus !== "AVAILABLE"
                      ? "Upload POD"
                      : null;
        return {
          inlandDeliveryId: r.id,
          shipmentWorkspaceId: r.shipmentWorkspaceId,
          shipmentRef: r.shipmentWorkspace.referenceNumber ?? r.shipmentWorkspace.orderRef ?? null,
          containerNumber: r.shipmentWorkspace.containerNumber ?? null,
          pickupLocation: r.pickupLocation,
          deliveryCity: r.deliveryCity,
          pickupAt: r.pickupAt?.toISOString() ?? null,
          status: r.status,
          nextAction,
          queueGroup,
        };
      });
    }

    return {
      partnerRole: role,
      tasksDueToday,
      openTasks: mine.length,
      missingDocuments: missingDocs,
      shipmentUpdates: workspaces.filter((w) => w.type === "SHIPMENT").length,
      actionRequired: mine.slice(0, 15).map((t) => ({
        id: t.id,
        kind: "TASK" as const,
        title: t.title,
        dueAt: t.dueDate?.toISOString() ?? null,
        workspaceId: t.orderId,
        workspaceType: "ORDER",
        severity: t.priority,
      })),
      transactions,
      customsCases,
      inlandDeliveries,
    };
  }

  private async resolveOrderIds(workspaceIds: string[]): Promise<string[]> {
    if (!workspaceIds.length) return [];
    const workspaces = await this.db.workspace.findMany({
      where: { id: { in: workspaceIds } },
      select: { id: true, type: true },
    });
    const orderIds = new Set<string>();
    const shipmentIds: string[] = [];
    for (const w of workspaces) {
      if (w.type === "ORDER") orderIds.add(w.id);
      if (w.type === "SHIPMENT") shipmentIds.push(w.id);
    }
    if (shipmentIds.length) {
      const sw = await this.db.shipmentWorkspace.findMany({
        where: { workspaceId: { in: shipmentIds } },
        select: { orderWorkspaceId: true },
      });
      for (const s of sw) {
        if (s.orderWorkspaceId) orderIds.add(s.orderWorkspaceId);
      }
    }
    return [...orderIds];
  }

  async listTransactions(actor: PartnerActor): Promise<PartnerTransactionSummaryDto[]> {
    const home = await this.home(actor);
    return home.transactions;
  }

  async getTransaction(
    actor: PartnerActor,
    workspaceId: string,
  ): Promise<PartnerTransactionDetailDto> {
    const { role, workspaceType } = await this.assertWorkspaceAccess(actor, workspaceId);
    const ws = await this.db.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { id: true, type: true, externalRef: true, state: true },
    });

    const summary: Record<string, unknown> = {
      externalRef: ws.externalRef,
      state: ws.state,
      type: ws.type,
    };

    let orderId = workspaceType === "ORDER" ? workspaceId : null;
    if (workspaceType === "SHIPMENT") {
      const sw = await this.db.shipmentWorkspace.findUnique({
        where: { workspaceId },
        select: {
          orderWorkspaceId: true,
          bookingStatus: true,
          bookingRef: true,
          carrierBookingNumber: true,
          carrierName: true,
          vesselName: true,
          voyageNumber: true,
          etd: true,
          eta: true,
          originPort: true,
          destinationPort: true,
          siCutoff: true,
          cyCutoff: true,
          cargoReadyDate: true,
          containerNumber: true,
        },
      });
      orderId = sw?.orderWorkspaceId ?? null;
      if (sw && partnerHasCapability(role, "SHIPMENT_VIEW")) {
        Object.assign(summary, redactForPartner({
          bookingStatus: sw.bookingStatus,
          pol: sw.originPort,
          pod: sw.destinationPort,
          etd: sw.etd?.toISOString() ?? null,
          eta: sw.eta?.toISOString() ?? null,
          containerNumber: partnerHasCapability(role, "CONTAINER_VIEW")
            ? sw.containerNumber
            : undefined,
        }));
      }
      if (sw && partnerHasCapability(role, "BOOKING_VIEW")) {
        Object.assign(summary, redactForPartner({
          bookingReference: sw.bookingRef ?? sw.carrierBookingNumber,
          carrierName: sw.carrierName,
          vesselName: sw.vesselName,
          voyageNumber: sw.voyageNumber,
          siCutoff: sw.siCutoff?.toISOString() ?? null,
          cyCutoff: sw.cyCutoff?.toISOString() ?? null,
        }));
      }
      if (role === "SUPPLIER" && sw) {
        summary.cargoReadyDate = sw.cargoReadyDate?.toISOString() ?? null;
      }
    }

    if (workspaceType === "ORDER" && partnerHasCapability(role, "PO_VIEW")) {
      const po = await this.db.purchaseOrder.findFirst({
        where: { orderId: workspaceId },
        select: {
          id: true,
          poNumber: true,
          status: true,
          currency: true,
          lines: {
            select: {
              id: true,
              sku: true,
              description: true,
              quantity: true,
            },
            take: 50,
          },
        },
      });
      if (po) {
        summary.po = {
          id: po.id,
          poNumber: po.poNumber,
          status: po.status,
          // currency is operational context; unit prices intentionally omitted
          lines: partnerHasCapability(role, "PO_LINE_VIEW")
            ? po.lines.map((l) => ({
                id: l.id,
                sku: l.sku,
                description: l.description,
                quantity: Number(l.quantity),
              }))
            : [],
        };
      }
    }

    const taskRows = orderId
      ? await this.db.operationalTask.findMany({
          where: {
            orderId,
            deletedAt: null,
            assignedToId: actor.id,
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : [];

    const tasks: PartnerTaskDto[] = taskRows.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString() ?? null,
      orderId: t.orderId,
      relatedEntityType: t.relatedEntityType,
      relatedEntityId: t.relatedEntityId,
      canComplete:
        partnerHasCapability(role, "TASK_UPDATE")
        && t.assignedToId === actor.id
        && !["COMPLETED", "CANCELLED"].includes(t.status),
    }));

    const docWorkspaceIds = [workspaceId, ...(orderId ? [orderId] : [])];
    const documents =
      partnerHasCapability(role, "DOCUMENT_VIEW")
        ? await this.db.tradeDocument.findMany({
            where: { workspaceId: { in: docWorkspaceIds } },
            orderBy: { createdAt: "desc" },
            take: 30,
            select: {
              id: true,
              documentType: true,
              status: true,
              fileName: true,
            },
          })
        : [];

    const issues =
      orderId && partnerHasCapability(role, "ISSUE_VIEW_SAFE")
        ? await this.db.operationalIssue.findMany({
            where: {
              orderId,
              deletedAt: null,
              status: { in: ["OPEN", "IN_PROGRESS"] },
              OR: [
                { ownerRole: role },
                { ownerRole: role === "ORIGIN_AGENT" ? "ORIGIN_AGENT" : role },
                { assignedTaskId: { in: tasks.map((t) => t.id) } },
              ],
            },
            take: 10,
            select: {
              id: true,
              title: true,
              impactType: true,
              recommendedAction: true,
              status: true,
              severity: true,
            },
          })
        : [];

    const allowedActions: string[] = [];
    if (partnerHasCapability(role, "CONFIRM_CARGO_READY") && workspaceType === "ORDER") {
      allowedActions.push("confirm-cargo-ready");
    }
    if (partnerHasCapability(role, "CONFIRM_GATE_IN") && workspaceType === "SHIPMENT") {
      allowedActions.push("confirm-gate-in");
    }
    if (partnerHasCapability(role, "TASK_UPDATE")) {
      allowedActions.push("complete-task");
    }

    return {
      workspaceId: ws.id,
      workspaceType: ws.type,
      externalRef: ws.externalRef,
      state: ws.state,
      partnerRole: role,
      summary: redactForPartner(summary),
      tasks,
      documents: documents.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        status: d.status,
        fileName: d.fileName ?? null,
      })),
      milestones: [],
      allowedActions,
      issues: issues.map((i) => ({
        id: i.id,
        title: i.title,
        impactType: i.impactType,
        recommendedAction: i.recommendedAction,
        status: i.status,
        severity: i.severity,
      })),
    };
  }

  async completeTask(actor: PartnerActor, taskId: string) {
    const role = resolvePartnerRole(actor);
    if (!role) throw new AppError(403, "NOT_A_PARTNER");
    if (!partnerHasCapability(role, "TASK_UPDATE")) {
      throw new AppError(403, "PARTNER_CAPABILITY_DENIED");
    }

    const task = await this.db.operationalTask.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) throw new AppError(404, "TASK_NOT_FOUND");

    const orderAccessible = (await this.accessibleWorkspaceIds(actor, role)).includes(task.orderId)
      || (await this.resolveOrderIds(await this.accessibleWorkspaceIds(actor, role))).includes(task.orderId);
    if (!orderAccessible) throw new AppError(403, "PARTNER_NOT_ASSIGNED");

    if (task.assignedToId && task.assignedToId !== actor.id) {
      throw new AppError(403, "TASK_NOT_ASSIGNED_TO_PARTNER");
    }

    // Idempotent: already complete
    if (task.status === "COMPLETED") {
      return { id: task.id, status: "COMPLETED", idempotent: true as const };
    }

    if (!task.assignedToId) {
      await this.db.operationalTask.update({
        where: { id: task.id },
        data: { assignedToId: actor.id, status: "ASSIGNED" },
      });
    }

    const dto = await this.tasks.complete(taskId, {
      id: actor.id,
      email: actor.email,
      role: actor.role as never,
    });

    // Best-effort: re-evaluate document risks for Sprint 34
    void import("../exception-intelligence/exception-intelligence.service.js")
      .then(async ({ ExceptionIntelligenceService }) => {
        // no-op hook placeholder — document resolution is driven by document upload events
        void new ExceptionIntelligenceService(this.db);
      })
      .catch(() => undefined);

    return { id: dto.id, status: dto.status, idempotent: false as const };
  }

  async confirmCargoReady(
    actor: PartnerActor,
    orderId: string,
    input: PartnerConfirmCargoReadyInput = {},
  ) {
    const role = resolvePartnerRole(actor);
    if (!role || !partnerHasCapability(role, "CONFIRM_CARGO_READY")) {
      throw new AppError(403, "PARTNER_CAPABILITY_DENIED");
    }
    await this.assertWorkspaceAccess(actor, orderId);

    const readyAt = input.cargoReadyDate ? new Date(input.cargoReadyDate) : new Date();
    const shipments = await this.db.shipmentWorkspace.findMany({
      where: { orderWorkspaceId: orderId },
      select: { workspaceId: true, cargoReadyDate: true },
    });

    for (const s of shipments) {
      // Idempotent: if already set to same day, skip write spam
      if (
        s.cargoReadyDate
        && Math.abs(s.cargoReadyDate.getTime() - readyAt.getTime()) < 60_000
      ) {
        continue;
      }
      await this.db.shipmentWorkspace.update({
        where: { workspaceId: s.workspaceId },
        data: { cargoReadyDate: readyAt },
      });
    }

    await this.writeAudit(orderId, actor, "partner.confirm_cargo_ready", {
      cargoReadyDate: readyAt.toISOString(),
      note: input.note ?? null,
      partnerRole: role,
    });

    return { ok: true as const, cargoReadyDate: readyAt.toISOString(), shipments: shipments.length };
  }

  async confirmGateIn(
    actor: PartnerActor,
    shipmentId: string,
    input: PartnerConfirmGateInInput = {},
  ) {
    const role = resolvePartnerRole(actor);
    if (!role || !partnerHasCapability(role, "CONFIRM_GATE_IN")) {
      throw new AppError(403, "PARTNER_CAPABILITY_DENIED");
    }
    await this.assertWorkspaceAccess(actor, shipmentId);

    const gateInAt = input.gateInAt ? new Date(input.gateInAt) : new Date();
    const sw = await this.db.shipmentWorkspace.findUnique({
      where: { workspaceId: shipmentId },
      select: { workspaceId: true, orderWorkspaceId: true, pickedUpAt: true },
    });
    if (!sw) throw new AppError(404, "SHIPMENT_NOT_FOUND");

    const wsMetaRow = await this.db.workspace.findUnique({
      where: { id: shipmentId },
      select: { metadata: true },
    });
    const meta = (wsMetaRow?.metadata && typeof wsMetaRow.metadata === "object"
      ? wsMetaRow.metadata
      : {}) as Record<string, unknown>;
    if (meta.gateInConfirmedAt) {
      return {
        ok: true as const,
        gateInAt: String(meta.gateInConfirmedAt),
        idempotent: true as const,
      };
    }

    await this.db.workspace.update({
      where: { id: shipmentId },
      data: {
        metadata: {
          ...meta,
          gateInConfirmedAt: gateInAt.toISOString(),
          gateInConfirmedBy: actor.id,
          gateInNote: input.note ?? null,
        },
      },
    });
    if (!sw.pickedUpAt) {
      await this.db.shipmentWorkspace.update({
        where: { workspaceId: shipmentId },
        data: { pickedUpAt: gateInAt },
      });
    }

    const auditWs = sw.orderWorkspaceId ?? shipmentId;
    await this.writeAudit(auditWs, actor, "partner.confirm_gate_in", {
      shipmentId,
      gateInAt: gateInAt.toISOString(),
      note: input.note ?? null,
      partnerRole: role,
    });

    return { ok: true as const, gateInAt: gateInAt.toISOString(), idempotent: false as const };
  }

  async listAssignablePartners(actor: PartnerActor, partnerRole: PartnerRole) {
    if (!canManagePartnerAssignments(actor.role)) {
      throw new AppError(403, "FORBIDDEN");
    }
    if (partnerRole !== "CUSTOMS_BROKER" && partnerRole !== "TRUCKER") {
      throw new AppError(400, "UNSUPPORTED_PARTNER_ROLE");
    }
    const users = await this.db.user.findMany({
      where: { role: partnerRole },
      select: { id: true, email: true, displayName: true, role: true },
      orderBy: { displayName: "asc" },
      take: 200,
    });
    return {
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role as PartnerRole,
      })),
    };
  }

  async listWorkspaceAssignments(actor: PartnerActor, workspaceId: string) {
    if (!canManagePartnerAssignments(actor.role)) {
      throw new AppError(403, "FORBIDDEN");
    }
    const ws = await this.db.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!ws) throw new AppError(404, "WORKSPACE_NOT_FOUND");

    const rows = await this.db.partnerAssignment.findMany({
      where: { workspaceId, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = userIds.length
      ? await this.db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, displayName: true },
        })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return {
      items: rows.map((r) => {
        const u = byId.get(r.userId);
        return {
          id: r.id,
          workspaceId: r.workspaceId,
          userId: r.userId,
          partnerRole: r.partnerRole as PartnerRole,
          email: u?.email ?? "",
          displayName: u?.displayName ?? r.userId,
          assignedAt: r.createdAt.toISOString(),
        };
      }),
    };
  }

  async assignPartner(actor: PartnerActor, input: AssignPartnerInput) {
    if (!canManagePartnerAssignments(actor.role)) {
      throw new AppError(403, "FORBIDDEN");
    }

    const ws = await this.db.workspace.findUnique({
      where: { id: input.workspaceId },
      select: { id: true, type: true },
    });
    if (!ws) throw new AppError(404, "WORKSPACE_NOT_FOUND");
    if (ws.type !== "ORDER" && ws.type !== "SHIPMENT") {
      throw new AppError(400, "INVALID_WORKSPACE_TYPE");
    }

    const user = await this.db.user.findUnique({
      where: { id: input.userId },
      select: { id: true, role: true, organisationId: true },
    });
    if (!user) throw new AppError(404, "USER_NOT_FOUND");
    if (String(user.role) !== input.partnerRole) {
      throw new AppError(400, "PARTNER_ROLE_MISMATCH");
    }

    const existing = await this.db.partnerAssignment.findUnique({
      where: {
        workspaceId_userId_partnerRole: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          partnerRole: input.partnerRole,
        },
      },
    });

    if (existing && !existing.revokedAt) {
      // Still sync dependent entities in case prior assign skipped sync.
      await this.syncPartnerSideEffects(actor, ws.type, input, existing.id);
      return { id: existing.id, created: false as const, idempotent: true as const };
    }

    // Reassignment: revoke other active holders of the same role on this workspace.
    await this.db.partnerAssignment.updateMany({
      where: {
        workspaceId: input.workspaceId,
        partnerRole: input.partnerRole,
        revokedAt: null,
        NOT: { userId: input.userId },
      },
      data: { revokedAt: new Date() },
    });

    const row = existing
      ? await this.db.partnerAssignment.update({
          where: { id: existing.id },
          data: {
            revokedAt: null,
            assignedById: actor.id,
            organisationId: input.organisationId ?? user.organisationId,
            notes: input.notes ?? existing.notes,
          },
        })
      : await this.db.partnerAssignment.create({
          data: {
            workspaceId: input.workspaceId,
            userId: input.userId,
            partnerRole: input.partnerRole,
            organisationId: input.organisationId ?? user.organisationId,
            assignedById: actor.id,
            notes: input.notes ?? null,
          },
        });

    // Ensure workspace participant for messaging/timeline visibility (OPERATOR = non-supplier partner)
    const participantRole =
      input.partnerRole === "SUPPLIER" ? "COUNTERPARTY" : "OPERATOR";
    const part = await this.db.workspaceParticipant.findFirst({
      where: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        participantRole,
      },
    });
    if (!part) {
      await this.db.workspaceParticipant.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          participantRole,
        },
      });
    } else if (part.leftAt) {
      await this.db.workspaceParticipant.update({
        where: { id: part.id },
        data: { leftAt: null },
      });
    }

    await this.writeAudit(input.workspaceId, actor, "partner.assigned", {
      partnerUserId: input.userId,
      partnerRole: input.partnerRole,
      assignmentId: row.id,
    });

    await this.syncPartnerSideEffects(actor, ws.type, input, row.id);

    return { id: row.id, created: !existing, idempotent: false as const };
  }

  private async syncPartnerSideEffects(
    actor: PartnerActor,
    workspaceType: string,
    input: AssignPartnerInput,
    assignmentId: string,
  ) {
    if (workspaceType !== "SHIPMENT") return;

    if (input.partnerRole === "TRUCKER") {
      const inland = await this.db.inlandDelivery.findUnique({
        where: { shipmentWorkspaceId: input.workspaceId },
      });
      if (inland && inland.status !== "CANCELLED" && inland.status !== "DELIVERED") {
        const data: Record<string, unknown> = {
          truckerUserId: input.userId,
          truckerAssignmentId: assignmentId,
        };
        if (["DRAFT", "REQUESTED"].includes(inland.status)) {
          data.status = "TRUCKER_ASSIGNED";
          data.statusSource = "DEMAXTORE_OPERATIONS";
        }
        await this.db.inlandDelivery.update({ where: { id: inland.id }, data });
        await this.db.inlandDeliveryEvent.create({
          data: {
            inlandDeliveryId: inland.id,
            actorUserId: actor.id,
            source: "DEMAXTORE_OPERATIONS",
            fromStatus: inland.status,
            toStatus: (data.status as string) ?? inland.status,
            reason: "TRUCKER_ASSIGNED",
            payload: { assignmentId, truckerUserId: input.userId },
          },
        }).catch(() => undefined);
      }
    }

    if (input.partnerRole === "CUSTOMS_BROKER") {
      const customs = await this.db.customsCase.findFirst({
        where: {
          shipmentWorkspaceId: input.workspaceId,
          status: { not: "CANCELLED" },
        },
        orderBy: { createdAt: "desc" },
      });
      if (customs) {
        await this.db.customsCase.update({
          where: { id: customs.id },
          data: {
            brokerUserId: input.userId,
            brokerAssignmentId: assignmentId,
          },
        });
      }
    }
  }

  async revokeAssignment(actor: PartnerActor, assignmentId: string) {
    if (!canManagePartnerAssignments(actor.role)) {
      throw new AppError(403, "FORBIDDEN");
    }
    const row = await this.db.partnerAssignment.findUnique({ where: { id: assignmentId } });
    if (!row) throw new AppError(404, "ASSIGNMENT_NOT_FOUND");
    if (row.revokedAt) return { id: row.id, revoked: true, idempotent: true as const };
    await this.db.partnerAssignment.update({
      where: { id: assignmentId },
      data: { revokedAt: new Date() },
    });
    if (row.partnerRole === "CUSTOMS_BROKER") {
      await this.db.customsCase.updateMany({
        where: {
          shipmentWorkspaceId: row.workspaceId,
          OR: [{ brokerAssignmentId: row.id }, { brokerUserId: row.userId }],
        },
        data: { brokerUserId: null, brokerAssignmentId: null },
      });
    }
    if (row.partnerRole === "TRUCKER") {
      const inland = await this.db.inlandDelivery.findFirst({
        where: {
          OR: [
            { truckerAssignmentId: row.id },
            { shipmentWorkspaceId: row.workspaceId, truckerUserId: row.userId },
          ],
          status: { notIn: ["DELIVERED", "CANCELLED", "PICKED_UP", "GATE_OUT", "IN_TRANSIT"] },
        },
      });
      if (inland) {
        await this.db.inlandDelivery.update({
          where: { id: inland.id },
          data: {
            truckerUserId: null,
            truckerAssignmentId: null,
            status: inland.status === "TRUCKER_ASSIGNED" || inland.status === "PICKUP_SCHEDULED"
              || inland.status === "READY_FOR_PICKUP"
              ? "REQUESTED"
              : inland.status,
          },
        });
      }
    }
    await this.writeAudit(row.workspaceId, actor, "partner.assignment_revoked", {
      assignmentId,
      partnerUserId: row.userId,
      partnerRole: row.partnerRole,
    });
    return { id: row.id, revoked: true, idempotent: false as const };
  }

  private async writeAudit(
    workspaceId: string,
    actor: PartnerActor,
    action: string,
    payload: Record<string, unknown>,
  ) {
    const actorUserId = actor.id || SYSTEM_ACTOR_ID;
    await this.db.timelineEvent.create({
      data: {
        workspaceId,
        eventType: action,
        actorUserId: actorUserId === SYSTEM_ACTOR_ID ? null : actorUserId,
        payload: payload as never,
      },
    }).catch(() => undefined);
    await this.db.auditLog.create({
      data: {
        workspaceId,
        actorUserId,
        actorEmail: actor.email,
        actorRole: actor.role,
        action,
        fromState: "",
        toState: String(payload.status ?? ""),
        payload: payload as never,
      },
    }).catch(() => undefined);
  }
}

export { canManagePartnerAssignments, isPlatformAdminRole };

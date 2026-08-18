import { Prisma, type PrismaClient, type Role } from "@prisma/client";
import {
  decisionToOrderResult,
  inspectionDurationHours,
  type InspectionAssignmentDto,
  type InspectionDefectDto,
  type InspectionFindingDto,
  type InspectionNcrDto,
  type InspectionPermissions,
  type InspectionRequestDto,
  type InspectionScheduleDto,
  type InspectionSummaryDto,
  type InspectionWorkspaceDto,
  type InspectionDecision,
} from "@dmx/contracts/inspection-workspace";
import type {
  AssignInspectorInput,
  CreateInspectionDefectInput,
  CreateInspectionFindingInput,
  CreateInspectionNcrInput,
  PatchInspectionDefectInput,
  PatchInspectionFindingInput,
  PatchInspectionNcrInput,
  PatchInspectionWorkspaceInput,
  RecordInspectionDecisionInput,
  ScheduleInspectionInput,
} from "@dmx/contracts/inspection-workspace.zod";
import { AppError } from "../../utils/httpErrors.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";
import { canAccessOrder } from "../order/order.policy.js";

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function parseDate(v: string | null | undefined): Date | null {
  if (v == null || v === "") return null;
  return new Date(v);
}

function isQaManager(role: Role): boolean {
  return (
    isPlatformAdminRole(role)
    || role === "OPS_MANAGER"
    || role === "ADMIN"
    || role === "DOCUMENT_CONTROLLER"
  );
}

function isInspector(role: Role): boolean {
  return isQaManager(role) || role === "LOGISTICS_OPERATOR";
}

export function computeInspectionPermissions(role: Role): InspectionPermissions {
  if (role === "SUPPLIER" || role === "BUYER" || role === "FORWARDER" || role === "FINANCE_OPERATOR") {
    return {
      canView: true,
      canEditRequest: false,
      canAssign: false,
      canSchedule: false,
      canManageFindings: false,
      canDecide: false,
      canManageNcr: false,
    };
  }
  const qa = isQaManager(role);
  const insp = isInspector(role);
  return {
    canView: true,
    canEditRequest: qa,
    canAssign: qa,
    canSchedule: qa || insp,
    canManageFindings: insp,
    canDecide: qa,
    canManageNcr: qa || insp,
  };
}

type Actor = { id: string; email: string; role: Role };

const findingInclude = {
  findings: { orderBy: { createdAt: "asc" as const } },
  defects: { orderBy: { createdAt: "asc" as const } },
  ncrs: { orderBy: { createdAt: "asc" as const } },
};

export class InspectionService {
  constructor(private readonly prisma: PrismaClient) {}

  private assertPerm(actor: Actor, field: keyof InspectionPermissions) {
    const perms = computeInspectionPermissions(actor.role);
    if (!perms[field]) throw new AppError(403, "FORBIDDEN");
  }

  private async assertAccess(actor: Actor, orderWorkspaceId: string) {
    // Checked before the role bypass below, otherwise a privileged actor asking for an
    // order that does not exist got an empty list instead of a 404.
    const order = await this.prisma.workspace.findFirst({
      where: { id: orderWorkspaceId, type: "ORDER" },
      select: { id: true },
    });
    if (!order) throw new AppError(404, "ORDER_NOT_FOUND");
    if (
      isPlatformAdminRole(actor.role)
      || actor.role === "OPS_MANAGER"
      || actor.role === "LOGISTICS_OPERATOR"
      || actor.role === "DOCUMENT_CONTROLLER"
    ) {
      return;
    }
    const ok = await canAccessOrder(this.prisma, actor, orderWorkspaceId);
    if (!ok) throw new AppError(403, "FORBIDDEN");
  }

  private async loadInspection(id: string) {
    const row = await this.prisma.inspectionWorkspace.findUnique({
      where: { id },
      include: findingInclude,
    });
    if (!row) throw new AppError(404, "INSPECTION_NOT_FOUND");
    return row;
  }

  private assertNotLocked(row: { decisionLocked: boolean; status: string }) {
    if (row.decisionLocked || row.status === "APPROVED") {
      throw new AppError(409, "INSPECTION_LOCKED", {
        message: "Findings and decision are immutable after approval",
      });
    }
  }

  private async writeAudit(
    orderWorkspaceId: string,
    actor: Actor,
    eventType: string,
    payload: Record<string, unknown>,
    fromState: string,
    toState: string,
  ) {
    const timelineEvent = await this.prisma.timelineEvent.create({
      data: {
        workspaceId: orderWorkspaceId,
        eventType,
        actorUserId: actor.id,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        workspaceId: orderWorkspaceId,
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: eventType,
        fromState,
        toState,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    socketBus.emitToWorkspace(orderWorkspaceId, "inspection.updated", {
      workspaceId: orderWorkspaceId,
      inspectionId: payload.inspectionId,
      eventType,
      occurredAt: new Date().toISOString(),
    });
    return timelineEvent;
  }

  private mapFinding(f: {
    id: string;
    category: string;
    severity: string;
    description: string;
    quantity: number | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): InspectionFindingDto {
    return {
      id: f.id,
      category: f.category,
      severity: f.severity,
      description: f.description,
      quantity: f.quantity,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    };
  }

  private mapDefect(d: {
    id: string;
    code: string | null;
    description: string;
    severity: string;
    quantity: number;
    resolution: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): InspectionDefectDto {
    return {
      id: d.id,
      code: d.code,
      description: d.description,
      severity: d.severity,
      quantity: d.quantity,
      resolution: d.resolution,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    };
  }

  private mapNcr(n: {
    id: string;
    ncrNumber: string;
    reason: string;
    status: string;
    ownerName: string | null;
    dueDate: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): InspectionNcrDto {
    return {
      id: n.id,
      ncrNumber: n.ncrNumber,
      reason: n.reason,
      status: n.status,
      ownerName: n.ownerName,
      dueDate: iso(n.dueDate),
      closedAt: iso(n.closedAt),
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    };
  }

  async toDto(row: Awaited<ReturnType<InspectionService["loadInspection"]>>, actor: Actor): Promise<InspectionWorkspaceDto> {
    const [po, shipment] = await Promise.all([
      row.purchaseOrderId
        ? this.prisma.purchaseOrder.findUnique({
            where: { id: row.purchaseOrderId },
            select: { id: true, poNumber: true, buyerId: true, supplierId: true },
          })
        : this.prisma.purchaseOrder.findUnique({
            where: { orderId: row.orderWorkspaceId },
            select: { id: true, poNumber: true, buyerId: true, supplierId: true },
          }),
      row.shipmentWorkspaceId
        ? this.prisma.workspace.findUnique({
            where: { id: row.shipmentWorkspaceId },
            include: { shipmentWorkspace: true },
          })
        : this.prisma.workspace.findFirst({
            where: { spawnedFromId: row.orderWorkspaceId, type: "SHIPMENT" },
            include: { shipmentWorkspace: true },
            orderBy: { createdAt: "desc" },
          }),
    ]);

    const actorIds = [po?.buyerId, po?.supplierId].filter(Boolean) as string[];
    const users = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, displayName: true },
        })
      : [];
    const nameOf = (uid: string | undefined) =>
      uid ? users.find((u) => u.id === uid)?.displayName ?? null : null;

    const sw = shipment?.shipmentWorkspace;
    const summary: InspectionSummaryDto = {
      inspectionNumber: row.inspectionNumber,
      inspectionType: row.inspectionType,
      status: row.status,
      inspectionCompany: row.inspectorOrg,
      inspector: row.inspectorName,
      shipmentNumber: shipment?.externalRef ?? null,
      shipmentWorkspaceId: shipment?.id ?? row.shipmentWorkspaceId,
      purchaseOrderNumber: po?.poNumber ?? null,
      purchaseOrderId: po?.id ?? row.purchaseOrderId,
      factory: row.factoryName,
      plannedDate: iso(row.plannedDate),
      actualDate: iso(row.actualFinishAt ?? row.actualStartAt),
      decision: row.decision,
      decisionLocked: row.decisionLocked,
      defectCount: row.defects.length,
      ncrCount: row.ncrs.length,
      findingCount: row.findings.length,
    };

    const request: InspectionRequestDto = {
      requestNumber: row.inspectionNumber,
      requestedByUserId: row.requestedByUserId,
      requestedAt: iso(row.requestedAt),
      factory: row.factoryName,
      supplier: row.supplierName ?? nameOf(po?.supplierId) ?? null,
      purchaseOrderId: po?.id ?? row.purchaseOrderId,
      purchaseOrderNumber: po?.poNumber ?? null,
      shipmentWorkspaceId: shipment?.id ?? row.shipmentWorkspaceId,
      shipmentNumber: shipment?.externalRef ?? null,
    };

    const assignment: InspectionAssignmentDto = {
      inspector: row.inspectorName,
      organization: row.inspectorOrg,
      contact: row.inspectorContact,
      assignedAt: iso(row.assignedAt),
    };

    const schedule: InspectionScheduleDto = {
      plannedDate: iso(row.plannedDate),
      actualStart: iso(row.actualStartAt),
      actualFinish: iso(row.actualFinishAt),
      durationHours: inspectionDurationHours(iso(row.actualStartAt), iso(row.actualFinishAt)),
    };

    return {
      id: row.id,
      orderWorkspaceId: row.orderWorkspaceId,
      summary,
      request,
      assignment,
      schedule,
      findings: row.findings.map((f) => this.mapFinding(f)),
      defects: row.defects.map((d) => this.mapDefect(d)),
      ncrs: row.ncrs.map((n) => this.mapNcr(n)),
      decision: row.decision,
      decisionNotes: row.decisionNotes,
      decisionAt: iso(row.decisionAt),
      decisionLocked: row.decisionLocked,
      shipment: shipment && sw
        ? {
            shipmentWorkspaceId: shipment.id,
            shipmentNumber: shipment.externalRef,
            status: shipment.state,
            etd: iso(sw.etd),
            eta: iso(sw.eta),
          }
        : null,
      purchaseOrder: po
        ? {
            purchaseOrderId: po.id,
            poNumber: po.poNumber,
            supplierName: nameOf(po.supplierId),
            buyerName: nameOf(po.buyerId),
          }
        : null,
      permissions: computeInspectionPermissions(actor.role),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async get(id: string, actor: Actor): Promise<InspectionWorkspaceDto> {
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    return this.toDto(row, actor);
  }

  async listForOrder(orderWorkspaceId: string, actor: Actor) {
    await this.assertAccess(actor, orderWorkspaceId);
    const rows = await this.prisma.inspectionWorkspace.findMany({
      where: { orderWorkspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        inspectionNumber: true,
        status: true,
        decision: true,
        decisionLocked: true,
        plannedDate: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      inspectionNumber: r.inspectionNumber,
      status: r.status,
      decision: r.decision,
      decisionLocked: r.decisionLocked,
      plannedDate: iso(r.plannedDate),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async patch(id: string, actor: Actor, input: PatchInspectionWorkspaceInput) {
    this.assertPerm(actor, "canEditRequest");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    if (row.status === "CANCELLED") throw new AppError(409, "INSPECTION_CANCELLED");

    const updated = await this.prisma.inspectionWorkspace.update({
      where: { id },
      data: {
        inspectionType: input.inspectionType ?? undefined,
        factoryName: input.factoryName === undefined ? undefined : input.factoryName,
        supplierName: input.supplierName === undefined ? undefined : input.supplierName,
        shipmentWorkspaceId: input.shipmentWorkspaceId === undefined ? undefined : input.shipmentWorkspaceId,
        purchaseOrderId: input.purchaseOrderId === undefined ? undefined : input.purchaseOrderId,
      },
      include: findingInclude,
    });
    await this.writeAudit(
      row.orderWorkspaceId,
      actor,
      "inspection.request.updated",
      { inspectionId: id, ...input },
      row.status,
      updated.status,
    );
    return this.toDto(updated, actor);
  }

  async cancelRequest(id: string, actor: Actor) {
    this.assertPerm(actor, "canEditRequest");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    this.assertNotLocked(row);
    const updated = await this.prisma.inspectionWorkspace.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: findingInclude,
    });
    await this.writeAudit(
      row.orderWorkspaceId,
      actor,
      "inspection.cancelled",
      { inspectionId: id },
      row.status,
      "CANCELLED",
    );
    return this.toDto(updated, actor);
  }

  async assign(id: string, actor: Actor, input: AssignInspectorInput) {
    this.assertPerm(actor, "canAssign");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    this.assertNotLocked(row);

    const nextStatus =
      row.status === "DRAFT" || row.status === "REQUESTED" ? "REQUESTED" : row.status;

    const updated = await this.prisma.inspectionWorkspace.update({
      where: { id },
      data: {
        inspectorName: input.inspectorName,
        inspectorOrg: input.inspectorOrg ?? null,
        inspectorContact: input.inspectorContact ?? null,
        assignedAt: new Date(),
        status: nextStatus,
      },
      include: findingInclude,
    });

    await this.prisma.orderWorkspace.update({
      where: { workspaceId: row.orderWorkspaceId },
      data: { inspectorName: input.inspectorName },
    });

    await this.writeAudit(
      row.orderWorkspaceId,
      actor,
      "inspection.assigned",
      { inspectionId: id, inspectorName: input.inspectorName },
      row.status,
      updated.status,
    );
    return this.toDto(updated, actor);
  }

  async removeAssignment(id: string, actor: Actor) {
    this.assertPerm(actor, "canAssign");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    this.assertNotLocked(row);
    const updated = await this.prisma.inspectionWorkspace.update({
      where: { id },
      data: {
        inspectorName: null,
        inspectorOrg: null,
        inspectorContact: null,
        assignedAt: null,
      },
      include: findingInclude,
    });
    await this.writeAudit(
      row.orderWorkspaceId,
      actor,
      "inspection.assignment.removed",
      { inspectionId: id },
      row.status,
      updated.status,
    );
    return this.toDto(updated, actor);
  }

  async schedule(id: string, actor: Actor, input: ScheduleInspectionInput) {
    this.assertPerm(actor, "canSchedule");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    this.assertNotLocked(row);

    if (input.cancel) {
      const updated = await this.prisma.inspectionWorkspace.update({
        where: { id },
        data: {
          plannedDate: null,
          status: row.status === "SCHEDULED" ? "REQUESTED" : row.status,
        },
        include: findingInclude,
      });
      await this.writeAudit(
        row.orderWorkspaceId,
        actor,
        "inspection.schedule.cancelled",
        { inspectionId: id },
        row.status,
        updated.status,
      );
      return this.toDto(updated, actor);
    }

    let status = row.status;
    const planned = input.plannedDate !== undefined ? parseDate(input.plannedDate) : undefined;
    const start = input.actualStartAt !== undefined ? parseDate(input.actualStartAt) : undefined;
    const finish = input.actualFinishAt !== undefined ? parseDate(input.actualFinishAt) : undefined;

    if (finish) status = "COMPLETED";
    else if (start) status = "IN_PROGRESS";
    else if (planned) status = "SCHEDULED";

    const updated = await this.prisma.inspectionWorkspace.update({
      where: { id },
      data: {
        plannedDate: planned === undefined ? undefined : planned,
        actualStartAt: start === undefined ? undefined : start,
        actualFinishAt: finish === undefined ? undefined : finish,
        status,
      },
      include: findingInclude,
    });

    const eventType =
      status === "IN_PROGRESS"
        ? "inspection.started"
        : status === "COMPLETED"
          ? "inspection.completed"
          : row.plannedDate
            ? "inspection.rescheduled"
            : "inspection.scheduled";

    await this.writeAudit(
      row.orderWorkspaceId,
      actor,
      eventType,
      { inspectionId: id, plannedDate: iso(updated.plannedDate) },
      row.status,
      updated.status,
    );
    return this.toDto(updated, actor);
  }

  async addFinding(id: string, actor: Actor, input: CreateInspectionFindingInput) {
    this.assertPerm(actor, "canManageFindings");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    this.assertNotLocked(row);

    await this.prisma.inspectionFinding.create({
      data: {
        inspectionWorkspaceId: id,
        category: input.category,
        severity: input.severity,
        description: input.description,
        quantity: input.quantity ?? null,
        status: input.status ?? "OPEN",
      },
    });
    await this.writeAudit(
      row.orderWorkspaceId,
      actor,
      "finding.created",
      { inspectionId: id, category: input.category, severity: input.severity },
      row.status,
      row.status,
    );
    return this.get(id, actor);
  }

  async patchFinding(
    id: string,
    findingId: string,
    actor: Actor,
    input: PatchInspectionFindingInput,
  ) {
    this.assertPerm(actor, "canManageFindings");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    this.assertNotLocked(row);
    const finding = row.findings.find((f) => f.id === findingId);
    if (!finding) throw new AppError(404, "FINDING_NOT_FOUND");

    await this.prisma.inspectionFinding.update({
      where: { id: findingId },
      data: {
        category: input.category,
        severity: input.severity,
        description: input.description,
        quantity: input.quantity === undefined ? undefined : input.quantity,
        status: input.status,
      },
    });
    await this.writeAudit(
      row.orderWorkspaceId,
      actor,
      "finding.updated",
      { inspectionId: id, findingId },
      row.status,
      row.status,
    );
    return this.get(id, actor);
  }

  async deleteFinding(id: string, findingId: string, actor: Actor) {
    this.assertPerm(actor, "canManageFindings");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    this.assertNotLocked(row);
    const finding = row.findings.find((f) => f.id === findingId);
    if (!finding) throw new AppError(404, "FINDING_NOT_FOUND");

    await this.prisma.inspectionFinding.delete({ where: { id: findingId } });
    await this.writeAudit(
      row.orderWorkspaceId,
      actor,
      "finding.deleted",
      { inspectionId: id, findingId },
      row.status,
      row.status,
    );
    return this.get(id, actor);
  }

  async addDefect(id: string, actor: Actor, input: CreateInspectionDefectInput) {
    this.assertPerm(actor, "canManageFindings");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    this.assertNotLocked(row);

    await this.prisma.inspectionDefect.create({
      data: {
        inspectionWorkspaceId: id,
        code: input.code ?? null,
        description: input.description,
        severity: input.severity,
        quantity: input.quantity ?? 1,
        resolution: input.resolution ?? null,
      },
    });
    await this.writeAudit(
      row.orderWorkspaceId,
      actor,
      "defect.created",
      { inspectionId: id, severity: input.severity },
      row.status,
      row.status,
    );
    return this.get(id, actor);
  }

  async patchDefect(
    id: string,
    defectId: string,
    actor: Actor,
    input: PatchInspectionDefectInput,
  ) {
    this.assertPerm(actor, "canManageFindings");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    this.assertNotLocked(row);
    if (!row.defects.some((d) => d.id === defectId)) throw new AppError(404, "DEFECT_NOT_FOUND");

    await this.prisma.inspectionDefect.update({
      where: { id: defectId },
      data: {
        code: input.code === undefined ? undefined : input.code,
        description: input.description,
        severity: input.severity,
        quantity: input.quantity,
        resolution: input.resolution === undefined ? undefined : input.resolution,
      },
    });
    return this.get(id, actor);
  }

  async deleteDefect(id: string, defectId: string, actor: Actor) {
    this.assertPerm(actor, "canManageFindings");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    this.assertNotLocked(row);
    if (!row.defects.some((d) => d.id === defectId)) throw new AppError(404, "DEFECT_NOT_FOUND");
    await this.prisma.inspectionDefect.delete({ where: { id: defectId } });
    return this.get(id, actor);
  }

  async addNcr(id: string, actor: Actor, input: CreateInspectionNcrInput) {
    this.assertPerm(actor, "canManageNcr");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);

    const seq = row.ncrs.length + 1;
    const ncrNumber = `NCR-${row.inspectionNumber}-${String(seq).padStart(2, "0")}`;
    await this.prisma.inspectionNcr.create({
      data: {
        inspectionWorkspaceId: id,
        ncrNumber,
        reason: input.reason,
        ownerName: input.ownerName ?? null,
        dueDate: parseDate(input.dueDate),
        status: input.status ?? "OPEN",
      },
    });
    await this.writeAudit(
      row.orderWorkspaceId,
      actor,
      "NCR.created",
      { inspectionId: id, ncrNumber },
      row.status,
      row.status,
    );
    return this.get(id, actor);
  }

  async patchNcr(id: string, ncrId: string, actor: Actor, input: PatchInspectionNcrInput) {
    this.assertPerm(actor, "canManageNcr");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    const ncr = row.ncrs.find((n) => n.id === ncrId);
    if (!ncr) throw new AppError(404, "NCR_NOT_FOUND");

    const closing = input.close || input.status === "CLOSED";
    await this.prisma.inspectionNcr.update({
      where: { id: ncrId },
      data: {
        reason: input.reason,
        ownerName: input.ownerName === undefined ? undefined : input.ownerName,
        dueDate: input.dueDate === undefined ? undefined : parseDate(input.dueDate),
        status: closing ? "CLOSED" : input.status,
        closedAt: closing ? new Date() : undefined,
      },
    });
    await this.writeAudit(
      row.orderWorkspaceId,
      actor,
      closing ? "NCR.closed" : "NCR.updated",
      { inspectionId: id, ncrId },
      row.status,
      row.status,
    );
    return this.get(id, actor);
  }

  async recordDecision(id: string, actor: Actor, input: RecordInspectionDecisionInput) {
    this.assertPerm(actor, "canDecide");
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    this.assertNotLocked(row);

    if (!["COMPLETED", "IN_PROGRESS", "SCHEDULED", "REQUESTED"].includes(row.status)) {
      throw new AppError(409, "INSPECTION_NOT_READY", {
        message: "Decision can only be recorded when inspection is in progress or completed",
      });
    }

    const approve = input.approve !== false;
    const decision = input.decision as InspectionDecision;
    let nextStatus = "COMPLETED";
    if (approve) {
      if (decision === "FAIL" || decision === "REINSPECTION_REQUIRED") {
        nextStatus = decision === "REINSPECTION_REQUIRED" ? "REINSPECTION_REQUIRED" : "REJECTED";
      } else {
        nextStatus = "APPROVED";
      }
    }

    const locked = approve && (decision === "PASS" || decision === "CONDITIONAL_PASS" || decision === "FAIL");

    const updated = await this.prisma.inspectionWorkspace.update({
      where: { id },
      data: {
        decision,
        decisionNotes: input.notes ?? null,
        decisionAt: new Date(),
        decisionLocked: locked || nextStatus === "APPROVED",
        status: nextStatus,
        actualFinishAt: row.actualFinishAt ?? new Date(),
      },
      include: findingInclude,
    });

    await this.prisma.orderWorkspace.update({
      where: { workspaceId: row.orderWorkspaceId },
      data: {
        inspectionCompletedAt: new Date(),
        inspectionResult: decisionToOrderResult(decision),
        inspectorName: row.inspectorName,
      },
    });

    const eventType =
      decision === "FAIL" || decision === "REINSPECTION_REQUIRED"
        ? "inspection.failed"
        : approve
          ? "inspection.approved"
          : "decision.recorded";

    await this.writeAudit(
      row.orderWorkspaceId,
      actor,
      eventType === "inspection.approved" || eventType === "inspection.failed"
        ? eventType
        : "decision.recorded",
      { inspectionId: id, decision, approve },
      row.status,
      updated.status,
    );
    if (eventType !== "decision.recorded") {
      await this.writeAudit(
        row.orderWorkspaceId,
        actor,
        "decision.recorded",
        { inspectionId: id, decision },
        row.status,
        updated.status,
      );
    }

    if (eventType === "inspection.failed") {
      void import("../operational-task/operational-task.automation.js").then(({ runOperationalTaskAutomation }) =>
        runOperationalTaskAutomation(this.prisma, {
          type: "inspection.failed",
          orderId: row.orderWorkspaceId,
          inspectionId: id,
          actorUserId: actor.id,
        }),
      ).catch(() => undefined);
      void import("../operational-issue/operational-issue.automation.js").then(({ runOperationalIssueAutomation }) =>
        runOperationalIssueAutomation(this.prisma, {
          type: "inspection.failed",
          orderId: row.orderWorkspaceId,
          inspectionId: id,
          actorUserId: actor.id,
        }),
      ).catch(() => undefined);
    } else if (eventType === "inspection.approved") {
      void import("../operational-task/operational-task.automation.js").then(({ runOperationalTaskAutomation }) =>
        runOperationalTaskAutomation(this.prisma, {
          type: "order.approved_for_shipment",
          orderId: row.orderWorkspaceId,
          actorUserId: actor.id,
        }),
      ).catch(() => undefined);
    }

    return this.toDto(updated, actor);
  }

  async timeline(id: string, actor: Actor) {
    const row = await this.loadInspection(id);
    await this.assertAccess(actor, row.orderWorkspaceId);
    const events = await this.prisma.timelineEvent.findMany({
      where: {
        workspaceId: row.orderWorkspaceId,
        OR: [
          { eventType: { startsWith: "inspection." } },
          { eventType: { startsWith: "finding." } },
          { eventType: { startsWith: "defect." } },
          { eventType: { startsWith: "decision." } },
          { eventType: { startsWith: "NCR." } },
          { eventType: { in: ["request_inspection", "record_inspection_result", "skip_inspection"] } },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
    return events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      actorUserId: e.actorUserId,
      createdAt: e.createdAt.toISOString(),
      payload: e.payload,
    }));
  }
}

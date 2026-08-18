import { Prisma, type PrismaClient, type Role } from "@prisma/client";
import {
  buildShipmentOperationalMilestones,
  shipmentBadgeGroup,
  SHIPMENT_STATUS_ALIAS_ACTIONS,
  type ShipmentBookingDto,
  type ShipmentContainerDto,
  type ShipmentPermissions,
  type ShipmentSummaryDto,
  type ShipmentTransportMode,
} from "@dmx/contracts/shipment-workspace";
import type {
  CancelShipmentBookingInput,
  CreateShipmentContainerInput,
  PatchShipmentContainerInput,
  PatchShipmentWorkspaceInput,
  TransitionShipmentBookingInput,
  UpsertShipmentBookingInput,
} from "@dmx/contracts/shipment-workspace.zod";
import type { ShipmentState } from "@dmx/contracts/shipment.fsm";
import {
  assertBookingTransition,
  type BookingStatus,
  canTransitionBooking,
  isBookingStatus,
} from "@dmx/contracts/booking-lifecycle";
import { AppError } from "../../utils/httpErrors.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";

function dec(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  return typeof v === "number" ? v : Number(v);
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function parseDate(v: string | null | undefined): Date | null {
  if (v == null || v === "") return null;
  return new Date(v);
}

function canOperateShipment(role: Role): boolean {
  return (
    isPlatformAdminRole(role)
    || role === "OPS_MANAGER"
    || role === "LOGISTICS_OPERATOR"
    || role === "ADMIN"
  );
}

function mapContainer(row: {
  id: string;
  containerNumber: string;
  containerType: string | null;
  sealNumber: string | null;
  grossWeightKg: Prisma.Decimal | null;
  netWeightKg: Prisma.Decimal | null;
  volumeCbm: Prisma.Decimal | null;
  packageCount: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): ShipmentContainerDto {
  return {
    id: row.id,
    containerNumber: row.containerNumber,
    containerType: row.containerType,
    sealNumber: row.sealNumber,
    grossWeightKg: dec(row.grossWeightKg),
    netWeightKg: dec(row.netWeightKg),
    volumeCbm: dec(row.volumeCbm),
    packageCount: row.packageCount,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function computeShipmentPermissions(role: Role): ShipmentPermissions {
  const operate = canOperateShipment(role);
  const manageMilestones =
    isPlatformAdminRole(role)
    || role === "OPS_MANAGER"
    || role === "ADMIN"
    || role === "DOCUMENT_CONTROLLER";
  return {
    canView: true,
    canEditBooking: operate,
    canManageContainers: operate,
    canTransitionStatus: operate || role === "FORWARDER",
    canManageMilestones: manageMilestones,
    canUpdateMilestones: operate || role === "FORWARDER",
  };
}

type Actor = { id: string; email: string; role: Role };

export class ShipmentWorkspaceOps {
  constructor(private readonly prisma: PrismaClient) {}

  private assertOperate(actor: Actor, field: keyof ShipmentPermissions) {
    const perms = computeShipmentPermissions(actor.role);
    if (!perms[field]) throw new AppError(403, "FORBIDDEN");
  }

  private async loadSw(workspaceId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        shipmentWorkspace: { include: { containers: { orderBy: { createdAt: "asc" } } } },
      },
    });
    if (!ws || ws.type !== "SHIPMENT" || !ws.shipmentWorkspace) {
      throw new AppError(404, "SHIPMENT_NOT_FOUND");
    }
    return ws;
  }

  private async writeAuditTimeline(
    workspaceId: string,
    actor: Actor,
    eventType: string,
    payload: Record<string, unknown>,
    fromState: string,
    toState: string,
  ) {
    const timelineEvent = await this.prisma.timelineEvent.create({
      data: {
        workspaceId,
        eventType,
        actorUserId: actor.id,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: eventType,
        fromState,
        toState,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    socketBus.emitToWorkspace(workspaceId, "shipment.timeline.appended", {
      workspaceId,
      event: {
        id: timelineEvent.id,
        eventType,
        actorUserId: actor.id,
        createdAt: timelineEvent.createdAt.toISOString(),
        payload,
      },
    });
    socketBus.emitToWorkspace(workspaceId, "shipment.updated", {
      workspaceId,
      occurredAt: new Date().toISOString(),
    });
    return timelineEvent;
  }

  private async recomputeTotals(shipmentWorkspaceId: string, workspaceId: string) {
    const containers = await this.prisma.shipmentContainer.findMany({
      where: { shipmentWorkspaceId },
    });
    const totalGross = containers.reduce((s, c) => s + (dec(c.grossWeightKg) ?? 0), 0);
    const totalVol = containers.reduce((s, c) => s + (dec(c.volumeCbm) ?? 0), 0);
    const primary = containers[0]?.containerNumber ?? null;
    await this.prisma.shipmentWorkspace.update({
      where: { id: shipmentWorkspaceId },
      data: {
        totalGrossWeightKg: containers.length ? totalGross : null,
        totalVolumeCbm: containers.length ? totalVol : null,
        containerNumber: primary,
      },
    });
    return { containerCount: containers.length, primary };
  }

  buildSummary(
    ws: { externalRef: string; state: string },
    sw: {
      transportMode: string;
      carrierName: string | null;
      forwarderName: string | null;
      etd: Date | null;
      eta: Date | null;
      departedAt: Date | null;
      arrivedAt: Date | null;
      originPort: string;
      destinationPort: string;
      incoterm: string | null;
      totalGrossWeightKg: Prisma.Decimal | null;
      totalVolumeCbm: Prisma.Decimal | null;
      containers?: unknown[];
      containerNumber: string | null;
    },
    containerCount: number,
  ): ShipmentSummaryDto {
    const state = ws.state as ShipmentState;
    return {
      shipmentNumber: ws.externalRef,
      status: state,
      badgeGroup: shipmentBadgeGroup(state),
      mode: (sw.transportMode as ShipmentTransportMode) || "SEA",
      carrier: sw.carrierName,
      forwarder: sw.forwarderName,
      etd: iso(sw.etd),
      eta: iso(sw.eta),
      actualDeparture: iso(sw.departedAt),
      actualArrival: iso(sw.arrivedAt),
      origin: sw.originPort,
      destination: sw.destinationPort,
      incoterm: sw.incoterm,
      containerCount,
      totalGrossWeightKg: dec(sw.totalGrossWeightKg),
      totalVolumeCbm: dec(sw.totalVolumeCbm),
    };
  }

  buildBooking(sw: {
    bookingRef: string | null;
    bookingNumber: string | null;
    bookingDate: Date | null;
    carrierName: string | null;
    forwarderName: string | null;
    vesselName: string | null;
    voyageNumber: string | null;
    flightNumber: string | null;
    originPort: string;
    destinationPort: string;
    etd: Date | null;
    eta: Date | null;
    bookingConfirmedAt: Date | null;
    transportMode: string;
    bookingStatus?: string | null;
    bookingSource?: string | null;
    bookingRequestedAt?: Date | null;
    bookingCancelledAt?: Date | null;
    bookingCancelReason?: string | null;
    carrierBookingNumber?: string | null;
    cargoReadyDate?: Date | null;
    siCutoff?: Date | null;
    vgmCutoff?: Date | null;
    cyCutoff?: Date | null;
    documentCutoff?: Date | null;
    freightRequestId?: string | null;
    freightOfferId?: string | null;
  }): ShipmentBookingDto {
    const vesselOrFlight =
      sw.transportMode === "AIR"
        ? sw.flightNumber
        : sw.vesselName;
    const ref = sw.bookingRef ?? sw.bookingNumber;
    return {
      bookingReference: ref,
      bookingDate: iso(sw.bookingDate),
      carrier: sw.carrierName,
      forwarder: sw.forwarderName,
      vesselOrFlight,
      voyage: sw.voyageNumber,
      portOfLoading: sw.originPort,
      portOfDischarge: sw.destinationPort,
      etd: iso(sw.etd),
      eta: iso(sw.eta),
      confirmedAt: iso(sw.bookingConfirmedAt),
      hasBooking: !!(ref || sw.carrierName || sw.bookingConfirmedAt || sw.bookingStatus),
      status: sw.bookingStatus ?? null,
      source: sw.bookingSource ?? null,
      requestedAt: iso(sw.bookingRequestedAt),
      cancelledAt: iso(sw.bookingCancelledAt),
      cancelReason: sw.bookingCancelReason ?? null,
      carrierBookingNumber: sw.carrierBookingNumber ?? null,
      cargoReadyDate: iso(sw.cargoReadyDate),
      siCutoff: iso(sw.siCutoff),
      vgmCutoff: iso(sw.vgmCutoff),
      cyCutoff: iso(sw.cyCutoff),
      documentCutoff: iso(sw.documentCutoff),
      freightRequestId: sw.freightRequestId ?? null,
      freightOfferId: sw.freightOfferId ?? null,
    };
  }

  async patchWorkspace(workspaceId: string, actor: Actor, input: PatchShipmentWorkspaceInput) {
    this.assertOperate(actor, "canEditBooking");
    const ws = await this.loadSw(workspaceId);
    const data: Prisma.ShipmentWorkspaceUpdateInput = {};
    if (input.transportMode !== undefined) data.transportMode = input.transportMode;
    if (input.incoterm !== undefined) data.incoterm = input.incoterm;
    if (input.forwarderName !== undefined) data.forwarderName = input.forwarderName;
    if (input.airlineName !== undefined) data.airlineName = input.airlineName;
    if (input.flightNumber !== undefined) data.flightNumber = input.flightNumber;
    if (input.truckReference !== undefined) data.truckReference = input.truckReference;
    if (input.trainReference !== undefined) data.trainReference = input.trainReference;
    if (input.vesselName !== undefined) data.vesselName = input.vesselName;
    if (input.voyageNumber !== undefined) data.voyageNumber = input.voyageNumber;
    if (input.etd !== undefined) data.etd = parseDate(input.etd);
    if (input.eta !== undefined) data.eta = parseDate(input.eta);
    if (input.originPort !== undefined) data.originPort = input.originPort;
    if (input.destinationPort !== undefined) data.destinationPort = input.destinationPort;

    await this.prisma.shipmentWorkspace.update({
      where: { id: ws.shipmentWorkspace!.id },
      data,
    });
    await this.writeAuditTimeline(
      workspaceId,
      actor,
      "booking.updated",
      { patch: input },
      ws.state,
      ws.state,
    );
  }

  async upsertBooking(workspaceId: string, actor: Actor, input: UpsertShipmentBookingInput) {
    this.assertOperate(actor, "canEditBooking");
    const ws = await this.loadSw(workspaceId);
    const sw = ws.shipmentWorkspace!;
    const hadBooking = !!(sw.bookingRef || sw.bookingNumber || sw.carrierName || sw.bookingConfirmedAt || sw.bookingStatus);
    const prevStatus = isBookingStatus(sw.bookingStatus) ? sw.bookingStatus : null;

    if (sw.bookingStatus === "CANCELLED" && !input.confirm) {
      throw new AppError(409, "BOOKING_CANCELLED", { message: "Cannot edit a cancelled booking" });
    }

    const mode = input.transportMode ?? (sw.transportMode as ShipmentTransportMode) ?? "SEA";
    const data: Prisma.ShipmentWorkspaceUpdateInput = {
      transportMode: mode,
      bookingRef: input.bookingReference !== undefined ? input.bookingReference : sw.bookingRef,
      bookingNumber: input.bookingReference !== undefined ? input.bookingReference : sw.bookingNumber,
      bookingDate:
        input.bookingDate !== undefined ? parseDate(input.bookingDate) : sw.bookingDate,
      carrierName: input.carrier !== undefined ? input.carrier : sw.carrierName,
      forwarderName: input.forwarder !== undefined ? input.forwarder : sw.forwarderName,
      etd: input.etd !== undefined ? parseDate(input.etd) : sw.etd,
      eta: input.eta !== undefined ? parseDate(input.eta) : sw.eta,
    };
    if (input.portOfLoading) data.originPort = input.portOfLoading;
    if (input.portOfDischarge) data.destinationPort = input.portOfDischarge;
    if (input.source !== undefined) data.bookingSource = input.source;
    if (input.carrierBookingNumber !== undefined) data.carrierBookingNumber = input.carrierBookingNumber;
    if (input.cargoReadyDate !== undefined) data.cargoReadyDate = parseDate(input.cargoReadyDate);
    if (input.siCutoff !== undefined) data.siCutoff = parseDate(input.siCutoff);
    if (input.vgmCutoff !== undefined) data.vgmCutoff = parseDate(input.vgmCutoff);
    if (input.cyCutoff !== undefined) data.cyCutoff = parseDate(input.cyCutoff);
    if (input.documentCutoff !== undefined) data.documentCutoff = parseDate(input.documentCutoff);
    if (input.freightRequestId !== undefined) data.freightRequestId = input.freightRequestId;
    if (input.freightOfferId !== undefined) data.freightOfferId = input.freightOfferId;

    if (mode === "AIR") {
      if (input.vesselOrFlight !== undefined) data.flightNumber = input.vesselOrFlight;
      if (input.voyage !== undefined) data.voyageNumber = input.voyage;
    } else if (mode === "ROAD") {
      if (input.vesselOrFlight !== undefined) data.truckReference = input.vesselOrFlight;
    } else if (mode === "RAIL") {
      if (input.vesselOrFlight !== undefined) data.trainReference = input.vesselOrFlight;
    } else {
      if (input.vesselOrFlight !== undefined) data.vesselName = input.vesselOrFlight;
      if (input.voyage !== undefined) data.voyageNumber = input.voyage;
    }

    // Lifecycle: default DRAFT on first save; CONFIRMED→AMENDED on material field change
    let nextStatus: BookingStatus | null = prevStatus;
    if (input.status) {
      try {
        assertBookingTransition(prevStatus, input.status);
      } catch {
        throw new AppError(409, "INVALID_BOOKING_TRANSITION", {
          from: prevStatus,
          to: input.status,
        });
      }
      nextStatus = input.status;
    } else if (!prevStatus) {
      nextStatus = "DRAFT";
    } else if (prevStatus === "CONFIRMED" && hadBooking) {
      nextStatus = "AMENDED";
    }
    if (nextStatus) {
      data.bookingStatus = nextStatus;
      if (nextStatus === "REQUESTED" || nextStatus === "PENDING") {
        data.bookingRequestedAt = sw.bookingRequestedAt ?? new Date();
      }
      if (nextStatus === "CONFIRMED") {
        data.bookingConfirmedAt = sw.bookingConfirmedAt ?? new Date();
      }
    }

    // Structured amendment audit (old → new) for key fields
    const changed: Record<string, { from: unknown; to: unknown }> = {};
    const track = (key: string, from: unknown, to: unknown) => {
      if (to !== undefined && String(from ?? "") !== String(to ?? "")) changed[key] = { from, to };
    };
    if (input.etd !== undefined) track("etd", iso(sw.etd), input.etd);
    if (input.eta !== undefined) track("eta", iso(sw.eta), input.eta);
    if (input.vesselOrFlight !== undefined) track("vessel", sw.vesselName, input.vesselOrFlight);
    if (input.voyage !== undefined) track("voyage", sw.voyageNumber, input.voyage);
    if (input.bookingReference !== undefined) track("bookingReference", sw.bookingRef, input.bookingReference);
    if (input.siCutoff !== undefined) track("siCutoff", iso(sw.siCutoff), input.siCutoff);

    await this.prisma.shipmentWorkspace.update({ where: { id: sw.id }, data });

    const eventType =
      nextStatus === "AMENDED"
        ? "BOOKING_AMENDED"
        : hadBooking
          ? "booking.updated"
          : "BOOKING_REQUESTED";
    await this.writeAuditTimeline(
      workspaceId,
      actor,
      eventType,
      { ...input, statusFrom: prevStatus, statusTo: nextStatus, changes: changed },
      ws.state,
      ws.state,
    );
    if (Object.keys(changed).length > 0) {
      for (const [field, delta] of Object.entries(changed)) {
        const evt =
          field === "etd"
            ? "BOOKING_ETD_CHANGED"
            : field === "eta"
              ? "BOOKING_ETA_CHANGED"
              : field === "vessel"
                ? "BOOKING_VESSEL_CHANGED"
                : field.includes("Cutoff") || field.includes("cutoff")
                  ? "BOOKING_CUTOFF_CHANGED"
                  : "booking.updated";
        await this.writeAuditTimeline(workspaceId, actor, evt, { field, ...delta }, ws.state, ws.state);
      }
      // Sprint 38 — booking ETA fallback triggers pre-arrival evaluation (non-blocking)
      if (changed.eta) {
        void import("../customs/pre-arrival-customs.service.js")
          .then(({ createPreArrivalCustomsService }) =>
            createPreArrivalCustomsService(this.prisma).safeEvaluateShipment(workspaceId),
          )
          .catch(() => undefined);
      }
    }

    if (!hadBooking && sw.orderWorkspaceId) {
      void import("../operational-task/operational-task.automation.js").then(({ runOperationalTaskAutomation }) =>
        runOperationalTaskAutomation(this.prisma, {
          type: "shipment.booked",
          orderId: sw.orderWorkspaceId,
          shipmentId: workspaceId,
          actorUserId: actor.id,
        }),
      ).catch(() => undefined);
    }

    // Optionally advance FSM when confirm requested (idempotent if already confirmed)
    if (input.confirm || nextStatus === "CONFIRMED") {
      if (ws.state === "SHIPMENT_CREATED" || ws.state === "BOOKING_PENDING") {
        const { ShipmentService } = await import("./shipment.service.js");
        const svc = new ShipmentService(this.prisma);
        await svc.applyTransition({
          workspaceId,
          action: "confirm_booking",
          actor: {
            id: actor.id,
            email: actor.email,
            role: isPlatformAdminRole(actor.role) || actor.role === "ADMIN" ? "ADMIN" : (actor.role as never),
          },
          payload: {
            carrierName: input.carrier ?? sw.carrierName ?? undefined,
            bookingRef: input.bookingReference ?? sw.bookingRef ?? undefined,
          },
        });
        // Second hop SHIPMENT_CREATED→PENDING→CONFIRMED when still pending
        const refreshed = await this.prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { state: true },
        });
        if (refreshed?.state === "BOOKING_PENDING" && (input.confirm || nextStatus === "CONFIRMED")) {
          await svc.applyTransition({
            workspaceId,
            action: "confirm_booking",
            actor: {
              id: actor.id,
              email: actor.email,
              role: isPlatformAdminRole(actor.role) || actor.role === "ADMIN" ? "ADMIN" : (actor.role as never),
            },
            payload: {
              carrierName: input.carrier ?? sw.carrierName ?? undefined,
              bookingRef: input.bookingReference ?? sw.bookingRef ?? undefined,
            },
          });
        }
      } else if (prevStatus !== "CONFIRMED" && prevStatus !== "AMENDED") {
        await this.prisma.shipmentWorkspace.update({
          where: { id: sw.id },
          data: {
            bookingStatus: "CONFIRMED",
            bookingConfirmedAt: sw.bookingConfirmedAt ?? new Date(),
          },
        });
      }
    }

    // Sprint 34 — booking cut-off / stalled intelligence (downstream)
    void import("../exception-intelligence/exception-intelligence.service.js")
      .then(({ ExceptionIntelligenceService }) =>
        new ExceptionIntelligenceService(this.prisma).onBookingContext({
          shipmentWorkspaceId: workspaceId,
        }),
      )
      .catch(() => undefined);
  }

  async transitionBooking(
    workspaceId: string,
    actor: Actor,
    input: TransitionShipmentBookingInput,
  ) {
    this.assertOperate(actor, "canEditBooking");
    const ws = await this.loadSw(workspaceId);
    const sw = ws.shipmentWorkspace!;
    const from = isBookingStatus(sw.bookingStatus) ? sw.bookingStatus : null;
    if (!canTransitionBooking(from, input.toStatus)) {
      throw new AppError(409, "INVALID_BOOKING_TRANSITION", { from, to: input.toStatus });
    }
    if (from === input.toStatus) return; // idempotent

    const data: Prisma.ShipmentWorkspaceUpdateInput = { bookingStatus: input.toStatus };
    if (input.toStatus === "REQUESTED" || input.toStatus === "PENDING") {
      data.bookingRequestedAt = sw.bookingRequestedAt ?? new Date();
    }
    if (input.toStatus === "CONFIRMED") {
      data.bookingConfirmedAt = sw.bookingConfirmedAt ?? new Date();
    }
    if (input.toStatus === "CANCELLED") {
      if (["IN_TRANSIT", "ARRIVED_DESTINATION_PORT", "DELIVERED", "COMPLETED"].includes(ws.state)) {
        throw new AppError(409, "BOOKING_CANCEL_NOT_ALLOWED", { state: ws.state });
      }
      data.bookingCancelledAt = new Date();
      data.bookingCancelReason = input.reason ?? sw.bookingCancelReason;
    }

    await this.prisma.shipmentWorkspace.update({ where: { id: sw.id }, data });
    await this.writeAuditTimeline(
      workspaceId,
      actor,
      `BOOKING_${input.toStatus}`,
      { from, to: input.toStatus, reason: input.reason },
      ws.state,
      ws.state,
    );

    if (input.toStatus === "CONFIRMED" && (ws.state === "SHIPMENT_CREATED" || ws.state === "BOOKING_PENDING")) {
      const { ShipmentService } = await import("./shipment.service.js");
      const svc = new ShipmentService(this.prisma);
      const actorRole =
        isPlatformAdminRole(actor.role) || actor.role === "ADMIN" ? "ADMIN" : (actor.role as never);
      await svc.applyTransition({
        workspaceId,
        action: "confirm_booking",
        actor: { id: actor.id, email: actor.email, role: actorRole },
        payload: {
          carrierName: sw.carrierName ?? undefined,
          bookingRef: sw.bookingRef ?? undefined,
        },
      });
      const refreshed = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { state: true },
      });
      if (refreshed?.state === "BOOKING_PENDING") {
        await svc.applyTransition({
          workspaceId,
          action: "confirm_booking",
          actor: { id: actor.id, email: actor.email, role: actorRole },
          payload: {
            carrierName: sw.carrierName ?? undefined,
            bookingRef: sw.bookingRef ?? undefined,
          },
        });
      }
      await this.prisma.shipmentWorkspace.update({
        where: { id: sw.id },
        data: {
          bookingStatus: "CONFIRMED",
          bookingConfirmedAt: sw.bookingConfirmedAt ?? new Date(),
        },
      });
    }

    void import("../exception-intelligence/exception-intelligence.service.js")
      .then(({ ExceptionIntelligenceService }) =>
        new ExceptionIntelligenceService(this.prisma).onBookingContext({
          shipmentWorkspaceId: workspaceId,
        }),
      )
      .catch(() => undefined);
  }

  async cancelBooking(workspaceId: string, actor: Actor, input: CancelShipmentBookingInput) {
    await this.transitionBooking(workspaceId, actor, {
      toStatus: "CANCELLED",
      reason: input.reason,
    });
  }

  async listContainers(workspaceId: string): Promise<ShipmentContainerDto[]> {
    const ws = await this.loadSw(workspaceId);
    return (ws.shipmentWorkspace!.containers ?? []).map(mapContainer);
  }

  async addContainer(workspaceId: string, actor: Actor, input: CreateShipmentContainerInput) {
    this.assertOperate(actor, "canManageContainers");
    const ws = await this.loadSw(workspaceId);
    const sw = ws.shipmentWorkspace!;
    const row = await this.prisma.shipmentContainer.create({
      data: {
        shipmentWorkspaceId: sw.id,
        containerNumber: input.containerNumber,
        containerType: input.containerType ?? null,
        sealNumber: input.sealNumber ?? null,
        grossWeightKg: input.grossWeightKg ?? null,
        netWeightKg: input.netWeightKg ?? null,
        volumeCbm: input.volumeCbm ?? null,
        packageCount: input.packageCount ?? null,
        status: input.status ?? "PLANNED",
      },
    });
    await this.recomputeTotals(sw.id, workspaceId);
    if (!sw.containerAssignedAt) {
      await this.prisma.shipmentWorkspace.update({
        where: { id: sw.id },
        data: { containerAssignedAt: new Date() },
      });
    }
    await this.writeAuditTimeline(
      workspaceId,
      actor,
      "container.added",
      { containerId: row.id, containerNumber: row.containerNumber },
      ws.state,
      ws.state,
    );
    return mapContainer(row);
  }

  async patchContainer(
    workspaceId: string,
    containerId: string,
    actor: Actor,
    input: PatchShipmentContainerInput,
  ) {
    this.assertOperate(actor, "canManageContainers");
    const ws = await this.loadSw(workspaceId);
    const sw = ws.shipmentWorkspace!;
    const existing = await this.prisma.shipmentContainer.findFirst({
      where: { id: containerId, shipmentWorkspaceId: sw.id },
    });
    if (!existing) throw new AppError(404, "CONTAINER_NOT_FOUND");
    const row = await this.prisma.shipmentContainer.update({
      where: { id: containerId },
      data: {
        ...(input.containerNumber !== undefined ? { containerNumber: input.containerNumber } : {}),
        ...(input.containerType !== undefined ? { containerType: input.containerType } : {}),
        ...(input.sealNumber !== undefined ? { sealNumber: input.sealNumber } : {}),
        ...(input.grossWeightKg !== undefined ? { grossWeightKg: input.grossWeightKg } : {}),
        ...(input.netWeightKg !== undefined ? { netWeightKg: input.netWeightKg } : {}),
        ...(input.volumeCbm !== undefined ? { volumeCbm: input.volumeCbm } : {}),
        ...(input.packageCount !== undefined ? { packageCount: input.packageCount } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    await this.recomputeTotals(sw.id, workspaceId);
    await this.writeAuditTimeline(
      workspaceId,
      actor,
      "container.updated",
      { containerId, ...input },
      ws.state,
      ws.state,
    );
    return mapContainer(row);
  }

  async removeContainer(workspaceId: string, containerId: string, actor: Actor) {
    this.assertOperate(actor, "canManageContainers");
    const ws = await this.loadSw(workspaceId);
    const sw = ws.shipmentWorkspace!;
    const existing = await this.prisma.shipmentContainer.findFirst({
      where: { id: containerId, shipmentWorkspaceId: sw.id },
    });
    if (!existing) throw new AppError(404, "CONTAINER_NOT_FOUND");
    await this.prisma.shipmentContainer.delete({ where: { id: containerId } });
    await this.recomputeTotals(sw.id, workspaceId);
    await this.writeAuditTimeline(
      workspaceId,
      actor,
      "container.removed",
      { containerId, containerNumber: existing.containerNumber },
      ws.state,
      ws.state,
    );
  }

  statusAliasAction(alias: keyof typeof SHIPMENT_STATUS_ALIAS_ACTIONS) {
    return SHIPMENT_STATUS_ALIAS_ACTIONS[alias];
  }
}

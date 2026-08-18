import { shipmentBadgeGroup, SHIPMENT_STATUS_ALIAS_ACTIONS, } from "@dmx/contracts/shipment-workspace";
import { assertBookingTransition, canTransitionBooking, isBookingStatus, } from "@dmx/contracts/booking-lifecycle";
import { AppError } from "../../utils/httpErrors.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";
function dec(v) {
    if (v == null)
        return null;
    return typeof v === "number" ? v : Number(v);
}
function iso(d) {
    return d ? d.toISOString() : null;
}
function parseDate(v) {
    if (v == null || v === "")
        return null;
    return new Date(v);
}
function canOperateShipment(role) {
    return (isPlatformAdminRole(role)
        || role === "OPS_MANAGER"
        || role === "LOGISTICS_OPERATOR"
        || role === "ADMIN");
}
function mapContainer(row) {
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
export function computeShipmentPermissions(role) {
    const operate = canOperateShipment(role);
    const manageMilestones = isPlatformAdminRole(role)
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
export class ShipmentWorkspaceOps {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    assertOperate(actor, field) {
        const perms = computeShipmentPermissions(actor.role);
        if (!perms[field])
            throw new AppError(403, "FORBIDDEN");
    }
    async loadSw(workspaceId) {
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
    async writeAuditTimeline(workspaceId, actor, eventType, payload, fromState, toState) {
        const timelineEvent = await this.prisma.timelineEvent.create({
            data: {
                workspaceId,
                eventType,
                actorUserId: actor.id,
                payload: payload,
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
                payload: payload,
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
    async recomputeTotals(shipmentWorkspaceId, workspaceId) {
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
    buildSummary(ws, sw, containerCount) {
        const state = ws.state;
        return {
            shipmentNumber: ws.externalRef,
            status: state,
            badgeGroup: shipmentBadgeGroup(state),
            mode: sw.transportMode || "SEA",
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
    buildBooking(sw) {
        const vesselOrFlight = sw.transportMode === "AIR"
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
    async patchWorkspace(workspaceId, actor, input) {
        this.assertOperate(actor, "canEditBooking");
        const ws = await this.loadSw(workspaceId);
        const data = {};
        if (input.transportMode !== undefined)
            data.transportMode = input.transportMode;
        if (input.incoterm !== undefined)
            data.incoterm = input.incoterm;
        if (input.forwarderName !== undefined)
            data.forwarderName = input.forwarderName;
        if (input.airlineName !== undefined)
            data.airlineName = input.airlineName;
        if (input.flightNumber !== undefined)
            data.flightNumber = input.flightNumber;
        if (input.truckReference !== undefined)
            data.truckReference = input.truckReference;
        if (input.trainReference !== undefined)
            data.trainReference = input.trainReference;
        if (input.vesselName !== undefined)
            data.vesselName = input.vesselName;
        if (input.voyageNumber !== undefined)
            data.voyageNumber = input.voyageNumber;
        if (input.etd !== undefined)
            data.etd = parseDate(input.etd);
        if (input.eta !== undefined)
            data.eta = parseDate(input.eta);
        if (input.originPort !== undefined)
            data.originPort = input.originPort;
        if (input.destinationPort !== undefined)
            data.destinationPort = input.destinationPort;
        await this.prisma.shipmentWorkspace.update({
            where: { id: ws.shipmentWorkspace.id },
            data,
        });
        await this.writeAuditTimeline(workspaceId, actor, "booking.updated", { patch: input }, ws.state, ws.state);
    }
    async upsertBooking(workspaceId, actor, input) {
        this.assertOperate(actor, "canEditBooking");
        const ws = await this.loadSw(workspaceId);
        const sw = ws.shipmentWorkspace;
        const hadBooking = !!(sw.bookingRef || sw.bookingNumber || sw.carrierName || sw.bookingConfirmedAt || sw.bookingStatus);
        const prevStatus = isBookingStatus(sw.bookingStatus) ? sw.bookingStatus : null;
        if (sw.bookingStatus === "CANCELLED" && !input.confirm) {
            throw new AppError(409, "BOOKING_CANCELLED", { message: "Cannot edit a cancelled booking" });
        }
        const mode = input.transportMode ?? sw.transportMode ?? "SEA";
        const data = {
            transportMode: mode,
            bookingRef: input.bookingReference !== undefined ? input.bookingReference : sw.bookingRef,
            bookingNumber: input.bookingReference !== undefined ? input.bookingReference : sw.bookingNumber,
            bookingDate: input.bookingDate !== undefined ? parseDate(input.bookingDate) : sw.bookingDate,
            carrierName: input.carrier !== undefined ? input.carrier : sw.carrierName,
            forwarderName: input.forwarder !== undefined ? input.forwarder : sw.forwarderName,
            etd: input.etd !== undefined ? parseDate(input.etd) : sw.etd,
            eta: input.eta !== undefined ? parseDate(input.eta) : sw.eta,
        };
        if (input.portOfLoading)
            data.originPort = input.portOfLoading;
        if (input.portOfDischarge)
            data.destinationPort = input.portOfDischarge;
        if (input.source !== undefined)
            data.bookingSource = input.source;
        if (input.carrierBookingNumber !== undefined)
            data.carrierBookingNumber = input.carrierBookingNumber;
        if (input.cargoReadyDate !== undefined)
            data.cargoReadyDate = parseDate(input.cargoReadyDate);
        if (input.siCutoff !== undefined)
            data.siCutoff = parseDate(input.siCutoff);
        if (input.vgmCutoff !== undefined)
            data.vgmCutoff = parseDate(input.vgmCutoff);
        if (input.cyCutoff !== undefined)
            data.cyCutoff = parseDate(input.cyCutoff);
        if (input.documentCutoff !== undefined)
            data.documentCutoff = parseDate(input.documentCutoff);
        if (input.freightRequestId !== undefined)
            data.freightRequestId = input.freightRequestId;
        if (input.freightOfferId !== undefined)
            data.freightOfferId = input.freightOfferId;
        if (mode === "AIR") {
            if (input.vesselOrFlight !== undefined)
                data.flightNumber = input.vesselOrFlight;
            if (input.voyage !== undefined)
                data.voyageNumber = input.voyage;
        }
        else if (mode === "ROAD") {
            if (input.vesselOrFlight !== undefined)
                data.truckReference = input.vesselOrFlight;
        }
        else if (mode === "RAIL") {
            if (input.vesselOrFlight !== undefined)
                data.trainReference = input.vesselOrFlight;
        }
        else {
            if (input.vesselOrFlight !== undefined)
                data.vesselName = input.vesselOrFlight;
            if (input.voyage !== undefined)
                data.voyageNumber = input.voyage;
        }
        // Lifecycle: default DRAFT on first save; CONFIRMED→AMENDED on material field change
        let nextStatus = prevStatus;
        if (input.status) {
            try {
                assertBookingTransition(prevStatus, input.status);
            }
            catch {
                throw new AppError(409, "INVALID_BOOKING_TRANSITION", {
                    from: prevStatus,
                    to: input.status,
                });
            }
            nextStatus = input.status;
        }
        else if (!prevStatus) {
            nextStatus = "DRAFT";
        }
        else if (prevStatus === "CONFIRMED" && hadBooking) {
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
        const changed = {};
        const track = (key, from, to) => {
            if (to !== undefined && String(from ?? "") !== String(to ?? ""))
                changed[key] = { from, to };
        };
        if (input.etd !== undefined)
            track("etd", iso(sw.etd), input.etd);
        if (input.eta !== undefined)
            track("eta", iso(sw.eta), input.eta);
        if (input.vesselOrFlight !== undefined)
            track("vessel", sw.vesselName, input.vesselOrFlight);
        if (input.voyage !== undefined)
            track("voyage", sw.voyageNumber, input.voyage);
        if (input.bookingReference !== undefined)
            track("bookingReference", sw.bookingRef, input.bookingReference);
        if (input.siCutoff !== undefined)
            track("siCutoff", iso(sw.siCutoff), input.siCutoff);
        await this.prisma.shipmentWorkspace.update({ where: { id: sw.id }, data });
        const eventType = nextStatus === "AMENDED"
            ? "BOOKING_AMENDED"
            : hadBooking
                ? "booking.updated"
                : "BOOKING_REQUESTED";
        await this.writeAuditTimeline(workspaceId, actor, eventType, { ...input, statusFrom: prevStatus, statusTo: nextStatus, changes: changed }, ws.state, ws.state);
        if (Object.keys(changed).length > 0) {
            for (const [field, delta] of Object.entries(changed)) {
                const evt = field === "etd"
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
                    .then(({ createPreArrivalCustomsService }) => createPreArrivalCustomsService(this.prisma).safeEvaluateShipment(workspaceId))
                    .catch(() => undefined);
            }
        }
        if (!hadBooking && sw.orderWorkspaceId) {
            void import("../operational-task/operational-task.automation.js").then(({ runOperationalTaskAutomation }) => runOperationalTaskAutomation(this.prisma, {
                type: "shipment.booked",
                orderId: sw.orderWorkspaceId,
                shipmentId: workspaceId,
                actorUserId: actor.id,
            })).catch(() => undefined);
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
                        role: isPlatformAdminRole(actor.role) || actor.role === "ADMIN" ? "ADMIN" : actor.role,
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
                            role: isPlatformAdminRole(actor.role) || actor.role === "ADMIN" ? "ADMIN" : actor.role,
                        },
                        payload: {
                            carrierName: input.carrier ?? sw.carrierName ?? undefined,
                            bookingRef: input.bookingReference ?? sw.bookingRef ?? undefined,
                        },
                    });
                }
            }
            else if (prevStatus !== "CONFIRMED" && prevStatus !== "AMENDED") {
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
            .then(({ ExceptionIntelligenceService }) => new ExceptionIntelligenceService(this.prisma).onBookingContext({
            shipmentWorkspaceId: workspaceId,
        }))
            .catch(() => undefined);
    }
    async transitionBooking(workspaceId, actor, input) {
        this.assertOperate(actor, "canEditBooking");
        const ws = await this.loadSw(workspaceId);
        const sw = ws.shipmentWorkspace;
        const from = isBookingStatus(sw.bookingStatus) ? sw.bookingStatus : null;
        if (!canTransitionBooking(from, input.toStatus)) {
            throw new AppError(409, "INVALID_BOOKING_TRANSITION", { from, to: input.toStatus });
        }
        if (from === input.toStatus)
            return; // idempotent
        const data = { bookingStatus: input.toStatus };
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
        await this.writeAuditTimeline(workspaceId, actor, `BOOKING_${input.toStatus}`, { from, to: input.toStatus, reason: input.reason }, ws.state, ws.state);
        if (input.toStatus === "CONFIRMED" && (ws.state === "SHIPMENT_CREATED" || ws.state === "BOOKING_PENDING")) {
            const { ShipmentService } = await import("./shipment.service.js");
            const svc = new ShipmentService(this.prisma);
            const actorRole = isPlatformAdminRole(actor.role) || actor.role === "ADMIN" ? "ADMIN" : actor.role;
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
            .then(({ ExceptionIntelligenceService }) => new ExceptionIntelligenceService(this.prisma).onBookingContext({
            shipmentWorkspaceId: workspaceId,
        }))
            .catch(() => undefined);
    }
    async cancelBooking(workspaceId, actor, input) {
        await this.transitionBooking(workspaceId, actor, {
            toStatus: "CANCELLED",
            reason: input.reason,
        });
    }
    async listContainers(workspaceId) {
        const ws = await this.loadSw(workspaceId);
        return (ws.shipmentWorkspace.containers ?? []).map(mapContainer);
    }
    async addContainer(workspaceId, actor, input) {
        this.assertOperate(actor, "canManageContainers");
        const ws = await this.loadSw(workspaceId);
        const sw = ws.shipmentWorkspace;
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
        await this.writeAuditTimeline(workspaceId, actor, "container.added", { containerId: row.id, containerNumber: row.containerNumber }, ws.state, ws.state);
        return mapContainer(row);
    }
    async patchContainer(workspaceId, containerId, actor, input) {
        this.assertOperate(actor, "canManageContainers");
        const ws = await this.loadSw(workspaceId);
        const sw = ws.shipmentWorkspace;
        const existing = await this.prisma.shipmentContainer.findFirst({
            where: { id: containerId, shipmentWorkspaceId: sw.id },
        });
        if (!existing)
            throw new AppError(404, "CONTAINER_NOT_FOUND");
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
        await this.writeAuditTimeline(workspaceId, actor, "container.updated", { containerId, ...input }, ws.state, ws.state);
        return mapContainer(row);
    }
    async removeContainer(workspaceId, containerId, actor) {
        this.assertOperate(actor, "canManageContainers");
        const ws = await this.loadSw(workspaceId);
        const sw = ws.shipmentWorkspace;
        const existing = await this.prisma.shipmentContainer.findFirst({
            where: { id: containerId, shipmentWorkspaceId: sw.id },
        });
        if (!existing)
            throw new AppError(404, "CONTAINER_NOT_FOUND");
        await this.prisma.shipmentContainer.delete({ where: { id: containerId } });
        await this.recomputeTotals(sw.id, workspaceId);
        await this.writeAuditTimeline(workspaceId, actor, "container.removed", { containerId, containerNumber: existing.containerNumber }, ws.state, ws.state);
    }
    statusAliasAction(alias) {
        return SHIPMENT_STATUS_ALIAS_ACTIONS[alias];
    }
}
//# sourceMappingURL=shipment-workspace.ops.js.map
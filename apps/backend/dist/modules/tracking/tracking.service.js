import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { AppError } from "../../utils/httpErrors.js";
import { claimProcessedEvent } from "../../lib/processed-event.js";
import { resolveTrackingProvider } from "./tracking.provider.js";
import { diffSnapshots } from "./tracking.diff.js";
import { applyTrackingAlertDiff } from "./tracking-alerts.js";
export class TrackingService {
    db;
    provider = resolveTrackingProvider();
    constructor(db) {
        this.db = db;
    }
    async linkTracking(shipmentId, input, actor) {
        const ws = await this.loadShipment(shipmentId);
        const sw = ws.shipmentWorkspace;
        await this.db.shipmentWorkspace.update({
            where: { workspaceId: shipmentId },
            data: {
                containerNumber: input.containerNumber ?? sw.containerNumber,
                bookingNumber: input.bookingNumber ?? sw.bookingNumber,
                bookingRef: input.bookingNumber ?? sw.bookingRef,
                vesselName: input.vesselReference ?? sw.vesselName,
                referenceNumber: input.referenceNumber ?? sw.referenceNumber,
                trackingLinkedAt: new Date(),
                lastTrackingSyncError: null,
            },
        });
        await this.appendTrackingEvent(shipmentId, {
            eventType: "shipment.tracking.linked",
            title: "Maritime tracking linked",
            description: `Tracking linked by ${actor.email}`,
            occurredAt: new Date(),
            rawPayload: input,
        });
        await this.appendTimeline(shipmentId, "shipment.tracking.linked", {
            linkedBy: actor.id,
            ...input,
        }, actor.id);
        const sync = await this.syncShipment(shipmentId);
        if (!sync.synced && sync.error) {
            throw new AppError(502, "TRACKING_SYNC_FAILED", { message: sync.error });
        }
        return this.getTracking(shipmentId);
    }
    async syncShipment(shipmentId) {
        const ws = await this.loadShipment(shipmentId);
        const sw = ws.shipmentWorkspace;
        if (!sw.trackingLinkedAt) {
            return { shipmentId, synced: false, snapshot: null, eventsCreated: 0, alertsCreated: 0, error: "NOT_LINKED" };
        }
        const prevRow = await this.db.shipmentTrackingSnapshot.findFirst({
            where: { shipmentId },
            orderBy: { syncedAt: "desc" },
        });
        const prev = prevRow ? rowToProvider(prevRow) : null;
        const syncGeneration = await this.db.shipmentTrackingSnapshot.count({ where: { shipmentId } });
        const ctx = {
            shipmentId,
            externalRef: ws.externalRef,
            containerNumber: sw.containerNumber,
            bookingNumber: sw.bookingNumber ?? sw.bookingRef,
            vesselName: sw.vesselName,
            referenceNumber: sw.referenceNumber,
            originPort: sw.originPort,
            destinationPort: sw.destinationPort,
            syncGeneration,
        };
        try {
            const snap = await this.provider.fetchTracking(ctx);
            const row = await this.db.shipmentTrackingSnapshot.create({
                data: snapshotToCreate(shipmentId, snap),
            });
            const diff = diffSnapshots(prev, snap);
            let eventsCreated = 0;
            const providerEvents = await this.provider.fetchEvents(ctx, snap);
            for (const pe of providerEvents) {
                const externalEventId = pe.rawPayload?.externalEventId ?? null;
                if (externalEventId) {
                    const claimed = await claimProcessedEvent(this.db, {
                        source: "tracking:maritime",
                        eventId: `${shipmentId}:${externalEventId}`,
                        workspaceId: shipmentId,
                        action: pe.eventType,
                    });
                    if (!claimed)
                        continue;
                }
                else {
                    const dup = await this.db.shipmentTrackingEvent.findFirst({
                        where: { shipmentId, eventType: pe.eventType, occurredAt: pe.occurredAt },
                    });
                    if (dup)
                        continue;
                }
                await this.appendTrackingEvent(shipmentId, pe);
                await this.appendTimeline(shipmentId, pe.eventType, pe.rawPayload ?? {}, null);
                eventsCreated++;
            }
            if (diff.departed) {
                await this.emitSocket(shipmentId, "departed", snap);
            }
            if (diff.delayDetected) {
                const { broadcastShipmentTrackingDelay } = await import("../control-tower/control-tower.socket.js");
                await broadcastShipmentTrackingDelay(this.db, shipmentId, snap.delayFlag);
            }
            if (diff.arrived) {
                socketBus.emitToWorkspace(shipmentId, SocketEvents.SHIPMENT_TRACKING_ARRIVED, {
                    workspaceId: shipmentId,
                    occurredAt: snap.lastPositionAt.toISOString(),
                });
            }
            const alertsCreated = await applyTrackingAlertDiff(this.db, shipmentId, ws.externalRef, diff);
            await this.db.shipmentWorkspace.update({
                where: { workspaceId: shipmentId },
                data: {
                    lastTrackingSyncAt: new Date(),
                    lastTrackingSyncError: null,
                    vesselName: snap.vesselName ?? sw.vesselName,
                    voyageNumber: snap.voyage ?? sw.voyageNumber,
                    carrierName: snap.carrier ?? sw.carrierName,
                },
            });
            socketBus.emitToWorkspace(shipmentId, SocketEvents.SHIPMENT_TRACKING_UPDATED, {
                workspaceId: shipmentId,
                snapshotId: row.id,
            });
            return {
                shipmentId,
                synced: true,
                snapshot: mapSnapshot(row),
                eventsCreated,
                alertsCreated,
            };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await this.db.shipmentWorkspace.update({
                where: { workspaceId: shipmentId },
                data: { lastTrackingSyncError: msg },
            });
            return { shipmentId, synced: false, snapshot: null, eventsCreated: 0, alertsCreated: 0, error: msg };
        }
    }
    async getTracking(shipmentId) {
        const ws = await this.loadShipment(shipmentId);
        const sw = ws.shipmentWorkspace;
        const latest = await this.db.shipmentTrackingSnapshot.findFirst({
            where: { shipmentId },
            orderBy: { syncedAt: "desc" },
        });
        const events = await this.db.shipmentTrackingEvent.findMany({
            where: { shipmentId },
            orderBy: { occurredAt: "desc" },
            take: 50,
        });
        return {
            shipmentId,
            linked: !!sw.trackingLinkedAt,
            provider: latest?.provider ?? null,
            latestSnapshot: latest ? mapSnapshot(latest) : null,
            events: events.map(mapEvent).reverse(),
            referenceNumber: sw.referenceNumber,
            containerNumber: sw.containerNumber,
            bookingNumber: sw.bookingNumber ?? sw.bookingRef,
            vesselName: sw.vesselName,
        };
    }
    async getOpsSummary() {
        const linked = await this.db.shipmentWorkspace.findMany({
            where: { trackingLinkedAt: { not: null } },
            include: { workspace: { select: { id: true, externalRef: true } } },
            take: 200,
        });
        if (linked.length === 0) {
            return { delayed: [], etaDrift: [], trackingFailures: [], recentlyArrived: [] };
        }
        const shipmentIds = linked.map((sw) => sw.workspaceId);
        const snaps = await this.db.$queryRaw `
      SELECT DISTINCT ON (shipment_id)
        shipment_id,
        tracking_status,
        delay_flag,
        eta,
        vessel_name
      FROM shipment_tracking_snapshots
      WHERE shipment_id = ANY(${shipmentIds}::uuid[])
      ORDER BY shipment_id, synced_at DESC
    `;
        const snapByShipment = new Map(snaps.map((s) => [s.shipment_id, s]));
        const rows = linked.map((sw) => {
            const snap = snapByShipment.get(sw.workspaceId);
            return {
                shipmentId: sw.workspaceId,
                externalRef: sw.workspace.externalRef,
                trackingStatus: (snap?.tracking_status ?? null),
                delayFlag: (snap?.delay_flag ?? null),
                eta: snap?.eta?.toISOString() ?? null,
                vesselName: snap?.vessel_name ?? null,
                lastSyncedAt: sw.lastTrackingSyncAt?.toISOString() ?? null,
                syncFailed: !!sw.lastTrackingSyncError,
            };
        });
        return {
            delayed: rows.filter((r) => r.delayFlag === "MINOR" || r.delayFlag === "MAJOR"),
            etaDrift: rows.filter((r) => r.trackingStatus === "IN_TRANSIT" || r.trackingStatus === "DELAYED"),
            trackingFailures: rows.filter((r) => r.syncFailed),
            recentlyArrived: rows.filter((r) => r.trackingStatus === "ARRIVED_PORT" || r.trackingStatus === "COMPLETED").slice(0, 20),
        };
    }
    async syncAllLinked() {
        const linked = await this.db.shipmentWorkspace.findMany({
            where: {
                trackingLinkedAt: { not: null },
                workspace: { state: { notIn: ["CANCELLED", "COMPLETED"] } },
            },
            select: { workspaceId: true },
            take: 100,
        });
        let ok = 0;
        for (const { workspaceId } of linked) {
            const r = await this.syncShipment(workspaceId);
            if (r.synced)
                ok++;
        }
        return ok;
    }
    async loadShipment(shipmentId) {
        const ws = await this.db.workspace.findUnique({
            where: { id: shipmentId },
            include: { shipmentWorkspace: true },
        });
        if (!ws || ws.type !== "SHIPMENT")
            throw new AppError(404, "SHIPMENT_NOT_FOUND");
        return ws;
    }
    async appendTrackingEvent(shipmentId, e) {
        await this.db.shipmentTrackingEvent.create({
            data: {
                shipmentId,
                eventType: e.eventType,
                title: e.title,
                description: e.description,
                occurredAt: e.occurredAt,
                rawPayload: (e.rawPayload ?? {}),
            },
        });
    }
    async appendTimeline(shipmentId, eventType, payload, actorUserId) {
        const row = await this.db.timelineEvent.create({
            data: {
                workspaceId: shipmentId,
                eventType,
                actorUserId,
                payload: payload,
            },
        });
        const eventDto = {
            id: row.id,
            eventType,
            actorUserId,
            createdAt: row.createdAt.toISOString(),
            payload,
        };
        socketBus.scheduleEmit(() => {
            socketBus.emitToWorkspace(shipmentId, SocketEvents.SHIPMENT_TIMELINE_APPENDED, {
                workspaceId: shipmentId,
                event: eventDto,
            });
            socketBus.emitToWorkspace(shipmentId, "timeline:new", {
                workspaceId: shipmentId,
                event: eventDto,
            });
        });
    }
    async emitSocket(_shipmentId, _kind, _snap) {
        // depart uses tracking.updated
    }
}
function snapshotToCreate(shipmentId, s) {
    return {
        shipmentId,
        provider: s.provider,
        vesselName: s.vesselName,
        imo: s.imo,
        mmsi: s.mmsi,
        carrier: s.carrier,
        voyage: s.voyage,
        pol: s.pol,
        pod: s.pod,
        etd: s.etd,
        eta: s.eta,
        lastPositionAt: s.lastPositionAt,
        trackingStatus: s.trackingStatus,
        delayFlag: s.delayFlag,
        syncedAt: new Date(),
    };
}
function rowToProvider(row) {
    return {
        provider: row.provider,
        vesselName: row.vesselName,
        imo: row.imo,
        mmsi: row.mmsi,
        carrier: row.carrier,
        voyage: row.voyage,
        pol: row.pol ?? "",
        pod: row.pod ?? "",
        etd: row.etd ?? new Date(),
        eta: row.eta ?? new Date(),
        lastPositionAt: row.lastPositionAt ?? new Date(),
        trackingStatus: row.trackingStatus,
        delayFlag: row.delayFlag,
    };
}
function mapSnapshot(row) {
    return {
        id: row.id,
        shipmentId: row.shipmentId,
        provider: row.provider,
        vesselName: row.vesselName,
        imo: row.imo,
        mmsi: row.mmsi,
        carrier: row.carrier,
        voyage: row.voyage,
        pol: row.pol,
        pod: row.pod,
        etd: row.etd?.toISOString() ?? null,
        eta: row.eta?.toISOString() ?? null,
        lastPositionAt: row.lastPositionAt?.toISOString() ?? null,
        trackingStatus: row.trackingStatus,
        delayFlag: row.delayFlag,
        syncedAt: row.syncedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
    };
}
function mapEvent(row) {
    return {
        id: row.id,
        shipmentId: row.shipmentId,
        eventType: row.eventType,
        title: row.title,
        description: row.description,
        occurredAt: row.occurredAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
    };
}
//# sourceMappingURL=tracking.service.js.map
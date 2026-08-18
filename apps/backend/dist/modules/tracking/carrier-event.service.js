import { CARRIER_EVENT_TO_SHIPMENT_ACTION } from "@dmx/contracts/logistics-events";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
export function isCarrierAutoTransitionEnabled() {
    return env.CARRIER_AUTO_TRANSITION_ENABLED === true;
}
export function normalizeCarrierEvent(provider, body) {
    const eventType = String(body.eventType ?? body.type ?? "").toUpperCase();
    if (!eventType)
        return null;
    const rawId = body.eventId ?? body.id;
    if (rawId === undefined || rawId === null || String(rawId).trim() === "")
        return null;
    const externalEventId = String(rawId).trim();
    const shipmentId = body.shipmentId ? String(body.shipmentId) : undefined;
    const confidence = (String(body.confidence ?? "high").toLowerCase());
    return {
        provider,
        externalEventId,
        eventType,
        shipmentId,
        occurredAt: String(body.occurredAt ?? new Date().toISOString()),
        confidence,
        rawPayload: body,
    };
}
export class CarrierEventService {
    db;
    constructor(db) {
        this.db = db;
    }
    async ingest(event) {
        const row = await this.db.carrierEventRecord.upsert({
            where: {
                provider_externalEventId: {
                    provider: event.provider,
                    externalEventId: event.externalEventId,
                },
            },
            create: {
                provider: event.provider,
                externalEventId: event.externalEventId,
                eventType: event.eventType,
                shipmentId: event.shipmentId ?? null,
                confidence: event.confidence,
                status: "pending",
                rawPayload: event.rawPayload,
            },
            update: {},
        });
        if (event.confidence === "low") {
            await this.recordTimelineOnly(event);
            await this.db.carrierEventRecord.update({ where: { id: row.id }, data: { status: "timeline_only" } });
            return { status: "timeline_only" };
        }
        if (event.confidence === "medium") {
            await this.enqueueReview(event, row.id);
            await this.db.carrierEventRecord.update({ where: { id: row.id }, data: { status: "review" } });
            return { status: "review" };
        }
        if (!isCarrierAutoTransitionEnabled() || !event.shipmentId) {
            return { status: "logged" };
        }
        const action = CARRIER_EVENT_TO_SHIPMENT_ACTION[event.eventType];
        if (!action)
            return { status: "unknown_event" };
        const { OrderShipmentOrchestrator } = await import("../orchestration/order-shipment-orchestrator.service.js");
        await new OrderShipmentOrchestrator(this.db).onCarrierEvent({
            shipmentId: event.shipmentId,
            action: action,
            eventId: `carrier:${event.provider}:${event.externalEventId}`,
            source: "carrier",
        });
        await this.db.carrierEventRecord.update({ where: { id: row.id }, data: { status: "applied" } });
        return { status: "applied", applied: true };
    }
    async recordTimelineOnly(event) {
        if (!event.shipmentId)
            return;
        await this.db.timelineEvent.create({
            data: {
                workspaceId: event.shipmentId,
                eventType: "carrier.event.observed",
                actorUserId: null,
                payload: {
                    provider: event.provider,
                    eventType: event.eventType,
                    confidence: event.confidence,
                },
            },
        });
    }
    async enqueueReview(event, recordId) {
        if (!event.shipmentId)
            return;
        logger.info({ recordId, event }, "Carrier event queued for manual review");
        await this.db.timelineEvent.create({
            data: {
                workspaceId: event.shipmentId,
                eventType: "carrier.event.review_required",
                actorUserId: null,
                payload: { recordId, eventType: event.eventType, provider: event.provider },
            },
        });
    }
}
//# sourceMappingURL=carrier-event.service.js.map
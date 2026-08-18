import { TradeLineageService } from "../trade-lineage/trade-lineage.service.js";
const SYSTEM_USER = "00000000-0000-0000-0000-000000000001";
export async function spawnShipmentFromOrder(tx, input) {
    const extRef = `SHP-${input.orderExternalRef}`;
    const existing = await tx.workspace.findUnique({ where: { externalRef: extRef } });
    if (existing) {
        // Ensure remaining PO lines are allocated even when the workspace already exists.
        const lineage = new TradeLineageService(tx);
        await lineage.allocateRemainingLinesForShipment(tx, {
            orderWorkspaceId: input.orderWorkspaceId,
            shipmentWorkspaceId: existing.id,
            actorUserId: input.actorUserId,
            linkSource: "SPAWN",
        });
        return { shipmentWorkspaceId: existing.id, externalRef: extRef };
    }
    const shpWs = await tx.workspace.create({
        data: {
            externalRef: extRef,
            type: "SHIPMENT",
            state: "SHIPMENT_CREATED",
            currency: input.currency,
            spawnedFromId: input.orderWorkspaceId,
            createdById: input.buyerUserId,
            participants: {
                create: [
                    { userId: input.buyerUserId, participantRole: "OWNER" },
                    { userId: input.supplierUserId, participantRole: "COUNTERPARTY" },
                ],
            },
        },
    });
    await tx.shipmentWorkspace.create({
        data: {
            workspaceId: shpWs.id,
            orderWorkspaceId: input.orderWorkspaceId,
            orderRef: input.orderExternalRef,
            poRef: input.poRef ?? null,
            contractRef: input.contractRef,
            currency: input.currency,
            buyerUserId: input.buyerUserId,
            supplierUserId: input.supplierUserId,
            originPort: input.originPort,
            destinationPort: input.destinationPort,
        },
    });
    // Sprint 31 — header link + line allocations for PO qty remaining.
    const lineage = new TradeLineageService(tx);
    await lineage.allocateRemainingLinesForShipment(tx, {
        orderWorkspaceId: input.orderWorkspaceId,
        shipmentWorkspaceId: shpWs.id,
        actorUserId: input.actorUserId,
        linkSource: "SPAWN",
    });
    await tx.timelineEvent.create({
        data: {
            workspaceId: shpWs.id,
            eventType: "shipment.created",
            actorUserId: input.actorUserId,
            payload: {
                orderWorkspaceId: input.orderWorkspaceId,
                orderRef: input.orderExternalRef,
            },
        },
    });
    await tx.timelineEvent.create({
        data: {
            workspaceId: input.orderWorkspaceId,
            eventType: "shipment.spawned",
            actorUserId: input.actorUserId,
            payload: {
                shipmentWorkspaceId: shpWs.id,
                shipmentExternalRef: extRef,
            },
        },
    });
    await tx.auditLog.create({
        data: {
            workspaceId: input.orderWorkspaceId,
            actorUserId: SYSTEM_USER,
            actorEmail: "system@demaxtore.local",
            actorRole: "SYSTEM",
            action: "spawn_shipment",
            fromState: "FREIGHT_REQUESTED",
            toState: "FREIGHT_REQUESTED",
            payload: { shipmentWorkspaceId: shpWs.id, shipmentExternalRef: extRef },
        },
    });
    return { shipmentWorkspaceId: shpWs.id, externalRef: extRef };
}
/** Copy selected freight offer metadata onto shipment workspace + tracking snapshot. */
export async function enrichFromFreightOffer(tx, shipmentWorkspaceId, offer) {
    const shp = await tx.shipmentWorkspace.findUnique({ where: { workspaceId: shipmentWorkspaceId } });
    if (!shp)
        return;
    await tx.shipmentWorkspace.update({
        where: { workspaceId: shipmentWorkspaceId },
        data: {
            carrierName: offer.carrierName,
            vesselName: offer.vesselName ?? undefined,
            originPort: offer.freightRequest.pol,
            destinationPort: offer.freightRequest.pod,
            bookingRef: offer.providerName,
            bookingStatus: shp.bookingStatus ?? "REQUESTED",
            bookingSource: shp.bookingSource ?? "SYSTEM",
            bookingRequestedAt: shp.bookingRequestedAt ?? new Date(),
            freightOfferId: offer.id,
            freightRequestId: offer.freightRequest.id ?? shp.freightRequestId,
            etd: offer.etd ?? shp.etd,
            eta: offer.eta ?? shp.eta,
        },
    });
    await tx.shipmentTrackingSnapshot.create({
        data: {
            shipmentId: shipmentWorkspaceId,
            provider: "freightiq",
            vesselName: offer.vesselName,
            carrier: offer.carrierName,
            pol: offer.freightRequest.pol,
            pod: offer.freightRequest.pod,
            etd: offer.etd,
            eta: offer.eta,
            trackingStatus: "BOOKED",
            delayFlag: "ON_TIME",
            syncedAt: new Date(),
        },
    });
}
/** Idempotent backfill when shipment already exists but selection lacks link. */
export async function backfillFreightSelectionForOrder(tx, orderWorkspaceId, shipmentWorkspaceId) {
    const selection = await tx.freightSelection.findFirst({
        where: {
            freightRequest: { orderId: orderWorkspaceId },
            shipmentWorkspaceId: null,
        },
        include: {
            offer: { include: { freightRequest: true } },
        },
    });
    if (!selection?.offer)
        return;
    await tx.freightSelection.update({
        where: { id: selection.id },
        data: { shipmentWorkspaceId },
    });
    await enrichFromFreightOffer(tx, shipmentWorkspaceId, {
        id: selection.offer.id,
        carrierName: selection.offer.carrierName,
        providerName: selection.offer.providerName,
        vesselName: selection.offer.vesselName,
        etd: selection.offer.etd,
        eta: selection.offer.eta,
        freightRequest: selection.offer.freightRequest,
    });
    await tx.freightRequest.update({
        where: { id: selection.freightRequestId },
        data: { status: "CONVERTED_TO_SHIPMENT" },
    });
}
//# sourceMappingURL=shipment.spawn.js.map
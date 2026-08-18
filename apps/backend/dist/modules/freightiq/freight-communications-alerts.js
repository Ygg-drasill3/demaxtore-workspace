import { AlertKey } from "@dmx/contracts/control-tower";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";
const H_24 = 24 * 3_600_000;
const H_72 = 72 * 3_600_000;
const H_96 = 96 * 3_600_000;
/** Sprint 5B — additive freight communication alerts. */
export async function scanFreightCommunicationAlerts(db) {
    let n = 0;
    const now = new Date();
    const noComm = await db.freightRequest.findMany({
        where: {
            status: { in: ["REQUESTED", "QUOTING"] },
            createdAt: { lte: new Date(now.getTime() - H_24) },
            communications: { none: {} },
        },
        include: { order: { select: { externalRef: true } } },
        take: 50,
    });
    for (const fr of noComm) {
        if (await upsertControlTowerAlert(db, {
            workspaceId: fr.orderId,
            alertKey: AlertKey.FREIGHT_NO_COMMUNICATION_24H,
            severity: "WARNING",
            category: "FREIGHT",
            workspaceType: "ORDER",
            title: "Freight request — no communication sent",
            description: `Order ${fr.order.externalRef} freight request open >24h with no forwarder outreach.`,
        }))
            n++;
    }
    const noResponse = await db.freightRequestCommunication.findMany({
        where: {
            status: "SENT",
            respondedAt: null,
            sentAt: { lte: new Date(now.getTime() - H_72) },
        },
        include: {
            freightRequest: { include: { order: { select: { id: true, externalRef: true } } } },
        },
        take: 50,
    });
    for (const c of noResponse) {
        if (await upsertControlTowerAlert(db, {
            workspaceId: c.freightRequest.order.id,
            alertKey: AlertKey.FREIGHT_NO_RESPONSE_72H,
            severity: "WARNING",
            category: "FREIGHT",
            workspaceType: "ORDER",
            title: "Forwarder communication — no response",
            description: `No response from forwarder on ${c.freightRequest.order.externalRef} (>72h).`,
        }))
            n++;
    }
    const noOffer96 = await db.freightRequest.findMany({
        where: {
            status: { in: ["REQUESTED", "QUOTING"] },
            createdAt: { lte: new Date(now.getTime() - H_96) },
        },
        include: {
            order: { select: { externalRef: true } },
            offers: { where: { status: { in: ["ACTIVE", "REVISED", "SELECTED"] } } },
        },
        take: 50,
    });
    for (const fr of noOffer96) {
        if (fr.offers.length > 0)
            continue;
        if (await upsertControlTowerAlert(db, {
            workspaceId: fr.orderId,
            alertKey: AlertKey.FREIGHT_NO_OFFER_96H,
            severity: "CRITICAL",
            category: "FREIGHT",
            workspaceType: "ORDER",
            title: "Freight request without offers",
            description: `Order ${fr.order.externalRef} has no freight offers after 96h.`,
        }))
            n++;
    }
    const expiredBeforeSelect = await db.freightOffer.findMany({
        where: {
            status: { in: ["ACTIVE", "EXPIRED"] },
            validUntil: { lte: now },
            freightRequest: {
                selection: null,
                status: { in: ["REQUESTED", "QUOTING", "QUOTED"] },
            },
        },
        include: { freightRequest: { include: { order: { select: { id: true, externalRef: true } } } } },
        take: 50,
    });
    for (const o of expiredBeforeSelect) {
        if (o.status === "ACTIVE") {
            await db.freightOffer.update({ where: { id: o.id }, data: { status: "EXPIRED" } });
        }
        if (await upsertControlTowerAlert(db, {
            workspaceId: o.freightRequest.order.id,
            alertKey: AlertKey.FREIGHT_OFFER_EXPIRED_BEFORE_SELECTION,
            severity: "WARNING",
            category: "FREIGHT",
            workspaceType: "ORDER",
            title: "Freight offer expired before selection",
            description: `Offer from ${o.providerName} on ${o.freightRequest.order.externalRef} expired before buyer selection.`,
        }))
            n++;
    }
    return n;
}
//# sourceMappingURL=freight-communications-alerts.js.map
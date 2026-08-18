import { AlertKey } from "@dmx/contracts/control-tower";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../../realtime/socket-bus.js";
import { upsertControlTowerAlert } from "../../tracking/tracking-alerts.js";
import { resolveFreightRoute } from "./freight-route.util.js";
import { FreightMarginPolicyService } from "./freight-margin-policy.service.js";
/** Sprint 6B — commercial margin / route alerts (additive). */
export async function scanFreightCommercialAlerts(db) {
    let n = 0;
    const policySvc = new FreightMarginPolicyService(db);
    const offers = await db.freightOffer.findMany({
        where: { status: { in: ["ACTIVE", "REVISED", "SELECTED"] } },
        include: { freightRequest: { include: { order: { select: { id: true, externalRef: true } } } } },
        take: 100,
    });
    for (const o of offers) {
        const orderId = o.freightRequest.order.id;
        const ref = o.freightRequest.order.externalRef;
        const margin = Number(o.freightiqMarginUsd);
        const internal = o.internalCostUsd != null ? Number(o.internalCostUsd) : null;
        const resolved = resolveFreightRoute(o.freightRequest.pol, o.freightRequest.pod);
        const suggestion = await policySvc.suggestMargin(o.freightRequest.pol, o.freightRequest.pod);
        const minThreshold = suggestion.minMarginUsd > 0 ? suggestion.minMarginUsd : 50;
        if (internal == null && margin === 0) {
            if (await upsertControlTowerAlert(db, {
                workspaceId: orderId,
                alertKey: AlertKey.FREIGHT_MARGIN_MISSING,
                severity: "WARNING",
                category: "FREIGHT",
                workspaceType: "ORDER",
                title: "Freight margin missing",
                description: `Order ${ref}: offer ${o.providerName} has no margin configured.`,
            })) {
                n++;
                await auditCommercialAlert(db, orderId, AlertKey.FREIGHT_MARGIN_MISSING, o.id);
                socketBus.emitToRole("ADMIN", SocketEvents.FREIGHT_MARGIN_ALERT, { orderId, offerId: o.id, kind: "missing" });
            }
            continue;
        }
        if (margin < 0) {
            if (await upsertControlTowerAlert(db, {
                workspaceId: orderId,
                alertKey: AlertKey.FREIGHT_MARGIN_NEGATIVE,
                severity: "CRITICAL",
                category: "FREIGHT",
                workspaceType: "ORDER",
                title: "Negative freight margin",
                description: `Order ${ref}: ${resolved.lane} margin ${margin} USD.`,
            })) {
                n++;
                await auditCommercialAlert(db, orderId, AlertKey.FREIGHT_MARGIN_NEGATIVE, o.id);
                socketBus.emitToRole("ADMIN", SocketEvents.FREIGHT_MARGIN_ALERT, { orderId, offerId: o.id, kind: "negative" });
            }
        }
        else if (margin >= 0 && margin < minThreshold) {
            if (await upsertControlTowerAlert(db, {
                workspaceId: orderId,
                alertKey: AlertKey.FREIGHT_MARGIN_LOW,
                severity: "WARNING",
                category: "FREIGHT",
                workspaceType: "ORDER",
                title: "Low freight margin",
                description: `Order ${ref}: margin ${margin} USD below threshold ${minThreshold}.`,
            })) {
                n++;
                await auditCommercialAlert(db, orderId, AlertKey.FREIGHT_MARGIN_LOW, o.id);
                socketBus.emitToRole("ADMIN", SocketEvents.FREIGHT_MARGIN_ALERT, { orderId, offerId: o.id, kind: "low" });
            }
        }
        if (suggestion.policyId && margin > suggestion.maxMarginUsd) {
            if (await upsertControlTowerAlert(db, {
                workspaceId: orderId,
                alertKey: AlertKey.FREIGHT_MARGIN_OVERRIDE,
                severity: "INFO",
                category: "FREIGHT",
                workspaceType: "ORDER",
                title: "High margin override",
                description: `Order ${ref}: margin ${margin} exceeds policy max ${suggestion.maxMarginUsd}.`,
            })) {
                n++;
                await auditCommercialAlert(db, orderId, AlertKey.FREIGHT_MARGIN_OVERRIDE, o.id);
                socketBus.emitToRole("ADMIN", SocketEvents.FREIGHT_MARGIN_ALERT, { orderId, offerId: o.id, kind: "override" });
            }
        }
    }
    const ledgerRows = await db.freightRevenueLedger.findMany({
        where: { status: { in: ["PENDING", "REALIZED"] } },
        select: { id: true, freightOfferId: true, freightiqMarginUsd: true },
        take: 200,
    });
    if (!ledgerRows.length)
        return n;
    const ledgerOffers = await db.freightOffer.findMany({
        where: { id: { in: ledgerRows.map((r) => r.freightOfferId) } },
        include: {
            freightRequest: {
                include: { order: { select: { id: true, externalRef: true } } },
            },
        },
    });
    const offerById = new Map(ledgerOffers.map((o) => [o.id, o]));
    const ledger = ledgerRows
        .map((row) => ({ ...row, offer: offerById.get(row.freightOfferId) }))
        .filter((row) => row.offer?.freightRequest);
    const routeMargin = new Map();
    for (const row of ledger) {
        if (!row.offer?.freightRequest)
            continue;
        const fr = row.offer.freightRequest;
        const resolved = resolveFreightRoute(fr.pol, fr.pod);
        const slot = routeMargin.get(resolved.route) ?? { margin: 0, count: 0 };
        slot.margin += Number(row.freightiqMarginUsd);
        slot.count += 1;
        routeMargin.set(resolved.route, slot);
    }
    const globalAvg = [...routeMargin.values()].reduce((s, v) => s + v.margin, 0) /
        Math.max([...routeMargin.values()].reduce((s, v) => s + v.count, 0), 1);
    for (const [route, v] of routeMargin) {
        const avg = v.count ? v.margin / v.count : 0;
        if (globalAvg > 0 && avg < globalAvg * 0.35 && v.count >= 2) {
            const sample = ledger.find((r) => {
                if (!r.offer?.freightRequest)
                    return false;
                const res = resolveFreightRoute(r.offer.freightRequest.pol, r.offer.freightRequest.pod);
                return res.route === route;
            });
            if (!sample?.offer?.freightRequest)
                continue;
            const orderId = sample.offer.freightRequest.order.id;
            if (await upsertControlTowerAlert(db, {
                workspaceId: orderId,
                alertKey: AlertKey.FREIGHT_ROUTE_UNDERPERFORMING,
                severity: "WARNING",
                category: "FREIGHT",
                workspaceType: "ORDER",
                title: "Underperforming freight route",
                description: `Route ${route} avg margin ${avg.toFixed(0)} below network average.`,
            })) {
                n++;
                socketBus.emitToRole("ADMIN", SocketEvents.FREIGHT_ROUTE_UPDATED, { route, avgMarginUsd: avg });
            }
        }
    }
    return n;
}
async function auditCommercialAlert(db, workspaceId, alertKey, offerId) {
    const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { state: true } });
    await db.auditLog.create({
        data: {
            workspaceId,
            actorUserId: "00000000-0000-0000-0000-000000000001",
            actorEmail: "system@demaxtore.local",
            actorRole: "SYSTEM",
            action: "commercial_alert.generated",
            fromState: ws?.state ?? undefined,
            toState: ws?.state ?? "UNKNOWN",
            payload: { alertKey, offerId },
        },
    }).catch(() => undefined);
}
//# sourceMappingURL=freight-commercial-alerts.js.map
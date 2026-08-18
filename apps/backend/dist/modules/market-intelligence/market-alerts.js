import { AlertKey } from "@dmx/contracts/control-tower";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";
import { MarketService } from "./market.service.js";
export async function scanMarketAlerts(db) {
    let n = 0;
    const market = new MarketService(db);
    const categories = await market.getCategories();
    for (const c of categories.filter((x) => x.trend === "growing").slice(0, 10)) {
        const anchor = await db.workspace.findFirst({
            where: { type: "RFQ", rfqDetails: { productCategory: c.category } },
            select: { id: true },
        });
        if (!anchor)
            continue;
        if (await upsertControlTowerAlert(db, {
            workspaceId: anchor.id,
            alertKey: AlertKey.MARKET_CATEGORY_GROWING,
            severity: "INFO",
            category: "SYSTEM",
            workspaceType: "RFQ",
            title: "Growing product category",
            description: `${c.category} RFQs growing ${c.growthPercent}% (score ${c.opportunityScore}).`,
        })) {
            n++;
            socketBus.emitToRole("ADMIN", SocketEvents.MARKET_ALERT_GENERATED, { kind: "category.growing" });
        }
    }
    for (const c of categories.filter((x) => x.trend === "declining").slice(0, 10)) {
        const anchor = await db.workspace.findFirst({
            where: { type: "RFQ", rfqDetails: { productCategory: c.category } },
            select: { id: true },
        });
        if (!anchor)
            continue;
        if (await upsertControlTowerAlert(db, {
            workspaceId: anchor.id,
            alertKey: AlertKey.MARKET_CATEGORY_DECLINING,
            severity: "WARNING",
            category: "SYSTEM",
            workspaceType: "RFQ",
            title: "Declining product category",
            description: `${c.category} demand down ${Math.abs(c.growthPercent)}%.`,
        }))
            n++;
    }
    const routes = await market.getRoutes();
    for (const r of routes.filter((x) => x.opportunityScore >= 85).slice(0, 5)) {
        const fr = await db.freightRequest.findFirst({
            where: { pol: { contains: r.route.split("→")[0]?.slice(0, 3) ?? "" } },
            select: { orderId: true },
        });
        const ws = fr?.orderId ?? (await db.workspace.findFirst({ where: { type: "ORDER" }, select: { id: true } }))?.id;
        if (!ws)
            continue;
        if (await upsertControlTowerAlert(db, {
            workspaceId: ws,
            alertKey: AlertKey.MARKET_ROUTE_OPPORTUNITY,
            severity: "INFO",
            category: "FREIGHT",
            workspaceType: "ORDER",
            title: "Route opportunity",
            description: `${r.lane} score ${r.opportunityScore} — prioritize capacity.`,
        }))
            n++;
    }
    const gaps = await market.getSupplyGaps();
    for (const g of gaps.filter((x) => x.opportunityScore >= 80).slice(0, 5)) {
        const anchor = await db.workspace.findFirst({
            where: { type: "RFQ", rfqDetails: { productCategory: g.category } },
            select: { id: true },
        });
        if (!anchor)
            continue;
        if (await upsertControlTowerAlert(db, {
            workspaceId: anchor.id,
            alertKey: AlertKey.MARKET_SUPPLY_GAP,
            severity: "WARNING",
            category: "SYSTEM",
            workspaceType: "RFQ",
            title: "Supply gap detected",
            description: `${g.category}${g.country ? ` → ${g.country}` : ""}: recruit suppliers (score ${g.opportunityScore}).`,
        }))
            n++;
    }
    const buyers = await market.getBuyerOpportunities();
    for (const b of buyers.filter((x) => x.opportunityScore >= 75).slice(0, 5)) {
        const anchor = await db.workspace.findFirst({
            where: { type: "RFQ", createdBy: { organisationId: b.organisationId } },
            select: { id: true },
        });
        if (!anchor)
            continue;
        if (await upsertControlTowerAlert(db, {
            workspaceId: anchor.id,
            alertKey: AlertKey.MARKET_UNSERVED_DEMAND,
            severity: "WARNING",
            category: "ACCOUNT",
            workspaceType: "RFQ",
            title: "Unserved buyer demand",
            description: `${b.organisationName}: ${b.issue} — est. ${b.potentialFreightiqRevenueUsd} USD FreightIQ.`,
        }))
            n++;
    }
    const forwarders = await market.getForwarderOpportunities();
    for (const f of forwarders.filter((x) => x.classification === "Underutilized").slice(0, 5)) {
        const offer = await db.freightOffer.findFirst({
            where: { forwarderContactId: f.forwarderId },
            include: { freightRequest: true },
        });
        const ws = offer?.freightRequest.orderId;
        if (!ws)
            continue;
        if (await upsertControlTowerAlert(db, {
            workspaceId: ws,
            alertKey: AlertKey.MARKET_FORWARDER_UNDERUTILIZED,
            severity: "INFO",
            category: "FREIGHT",
            workspaceType: "ORDER",
            title: "Forwarder underutilized",
            description: `${f.forwarderName} has low offer/selection volume.`,
        }))
            n++;
    }
    return n;
}
//# sourceMappingURL=market-alerts.js.map
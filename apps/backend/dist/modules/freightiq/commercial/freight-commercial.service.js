import { SetFreightMarginPayload } from "@dmx/contracts/freight-commercial.zod";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../../realtime/socket-bus.js";
import { AppError } from "../../../utils/httpErrors.js";
import { canViewOfferCommercial } from "./freight-commercial.policy.js";
import { commercialFromOffer, computeDisplayPrice, displayPriceForOffer, resolveIntakeCommercial, } from "./freight-commercial.util.js";
import { findLedgerWithOffers } from "./freight-ledger.query.js";
import { FreightMarginPolicyService } from "./freight-margin-policy.service.js";
export class FreightCommercialService {
    db;
    constructor(db) {
        this.db = db;
    }
    resolveIntakeCommercial(input) {
        try {
            return resolveIntakeCommercial(input);
        }
        catch {
            throw new AppError(400, "INVALID_COMMERCIAL_INPUT");
        }
    }
    applyRoleToSummary(summary, actor) {
        const admin = canViewOfferCommercial(actor);
        return {
            ...summary,
            offers: summary.offers.map((o) => this.sanitizeOffer(o, admin)),
            commercialSummary: summary.commercialSummary ?? null,
            marginIntakeHint: admin ? summary.marginIntakeHint ?? null : null,
        };
    }
    sanitizeOffer(offer, includeCommercial) {
        if (includeCommercial)
            return offer;
        const { commercial: _c, ...rest } = offer;
        return rest;
    }
    mapDbOfferForRole(o, actor) {
        const display = displayPriceForOffer(o);
        const base = {
            id: o.id,
            freightRequestId: o.freightRequestId,
            providerName: o.providerName,
            carrierName: o.carrierName,
            price: display,
            currency: o.currency,
            transitDays: o.transitDays,
            validUntil: o.validUntil.toISOString(),
            remarks: o.remarks,
            status: o.status,
            createdAt: o.createdAt.toISOString(),
            updatedAt: o.updatedAt.toISOString(),
            forwarderContactId: o.forwarderContactId,
            forwarderCompanyName: o.forwarderContact?.companyName ?? o.providerName,
            offerSource: o.offerSource,
            vesselName: o.vesselName,
            etd: o.etd?.toISOString() ?? null,
            eta: o.eta?.toISOString() ?? null,
            cutOff: o.cutOff?.toISOString() ?? null,
        };
        if (!canViewOfferCommercial(actor))
            return base;
        return { ...base, commercial: commercialFromOffer(o) };
    }
    async buildCommercialSummary(orderId, summary) {
        const ow = await this.db.orderWorkspace.findUnique({
            where: { workspaceId: orderId },
            select: { totalValue: true, currency: true },
        });
        if (!ow)
            return null;
        const fob = Number(ow.totalValue);
        let displayFreight = null;
        if (summary.selection) {
            const sel = summary.offers.find((o) => o.id === summary.selection.offerId);
            displayFreight = sel?.price ?? null;
        }
        else if (summary.offers.length) {
            displayFreight = Math.min(...summary.offers.map((o) => o.price));
        }
        const estimatedCif = displayFreight != null ? fob + displayFreight : null;
        return {
            orderId,
            currency: ow.currency,
            fobValueUsd: fob,
            displayFreightUsd: displayFreight,
            estimatedCifUsd: estimatedCif,
        };
    }
    async setOfferMargin(offerId, actor, raw, ctx) {
        const input = SetFreightMarginPayload.parse(raw);
        const offer = await this.db.freightOffer.findUnique({
            where: { id: offerId },
            include: { freightRequest: true },
        });
        if (!offer)
            throw new AppError(404, "OFFER_NOT_FOUND");
        if (offer.marginLockedAt)
            throw new AppError(409, "MARGIN_LOCKED");
        const displayPriceUsd = computeDisplayPrice(input.internalCostUsd, input.freightiqMarginUsd);
        const orderId = offer.freightRequest.orderId;
        const isUpdate = offer.internalCostUsd != null;
        const policySvc = new FreightMarginPolicyService(this.db);
        const suggestion = await policySvc.suggestMargin(offer.freightRequest.pol, offer.freightRequest.pod);
        await this.db.$transaction(async (tx) => {
            await policySvc.recordMarginOverride(tx, {
                orderId,
                actor,
                offerId,
                suggestedUsd: suggestion.suggestedMarginUsd,
                appliedUsd: input.freightiqMarginUsd,
                policyName: suggestion.policyName,
            }, ctx);
            await tx.freightOffer.update({
                where: { id: offerId },
                data: {
                    internalCostUsd: input.internalCostUsd,
                    freightiqMarginUsd: input.freightiqMarginUsd,
                    displayPriceUsd,
                    price: displayPriceUsd,
                },
            });
            const ws = await tx.workspace.findUniqueOrThrow({ where: { id: orderId }, select: { state: true } });
            const action = isUpdate ? "freight.margin.updated" : "freight.margin.set";
            await tx.auditLog.create({
                data: {
                    workspaceId: orderId,
                    actorUserId: actor.id,
                    actorEmail: actor.email,
                    actorRole: actor.role,
                    action,
                    fromState: ws.state,
                    toState: ws.state,
                    payload: { offerId, ...input, displayPriceUsd },
                    ipAddress: ctx?.ip,
                    userAgent: ctx?.userAgent,
                },
            });
            await tx.timelineEvent.create({
                data: {
                    workspaceId: orderId,
                    eventType: action,
                    actorUserId: actor.id,
                    payload: { offerId, displayPriceUsd },
                },
            });
        });
        socketBus.scheduleEmit(() => {
            socketBus.emitToRole("ADMIN", SocketEvents.FREIGHT_MARGIN_UPDATED, { orderId, offerId });
            socketBus.emitToWorkspace(orderId, SocketEvents.FREIGHT_COMMERCIAL_UPDATED, { orderId, offerId });
        });
    }
    async createLedgerOnSelection(tx, params) {
        const offer = await tx.freightOffer.findUniqueOrThrow({ where: { id: params.offerId } });
        const commercial = commercialFromOffer(offer);
        await tx.freightOffer.update({
            where: { id: params.offerId },
            data: {
                marginLockedAt: new Date(),
                marginLockedBy: params.actor.id,
            },
        });
        const existing = await tx.freightRevenueLedger.findFirst({
            where: { freightOfferId: params.offerId, status: { in: ["PENDING", "REALIZED"] } },
        });
        if (existing)
            return existing.id;
        const entry = await tx.freightRevenueLedger.create({
            data: {
                shipmentId: params.shipmentWorkspaceId,
                orderId: params.orderId,
                freightOfferId: params.offerId,
                forwarderCostUsd: commercial.internalCostUsd,
                freightiqMarginUsd: commercial.freightiqMarginUsd,
                displayPriceUsd: commercial.displayPriceUsd,
                currency: offer.currency,
                status: "PENDING",
            },
        });
        return entry.id;
    }
    async realizeRevenueForShipment(shipmentId, actor) {
        const shipment = await this.db.workspace.findUnique({
            where: { id: shipmentId },
            select: { spawnedFromId: true },
        });
        const orderId = shipment?.spawnedFromId ?? null;
        const entries = await this.db.freightRevenueLedger.findMany({
            where: {
                status: "PENDING",
                OR: [
                    { shipmentId },
                    ...(orderId ? [{ orderId, shipmentId: null }] : []),
                ],
            },
        });
        if (!entries.length)
            return 0;
        let realized = 0;
        for (const entry of entries) {
            await this.db.$transaction(async (tx) => {
                await tx.freightRevenueLedger.update({
                    where: { id: entry.id },
                    data: {
                        status: "REALIZED",
                        realizedAt: new Date(),
                        shipmentId: entry.shipmentId ?? shipmentId,
                    },
                });
                const ws = await tx.workspace.findUniqueOrThrow({
                    where: { id: entry.orderId },
                    select: { state: true },
                });
                await tx.auditLog.create({
                    data: {
                        workspaceId: entry.orderId,
                        actorUserId: actor?.id ?? "00000000-0000-0000-0000-000000000001",
                        actorEmail: actor?.email ?? "system@demaxtore.local",
                        actorRole: actor?.role ?? "SYSTEM",
                        action: "freight.revenue.realized",
                        fromState: ws.state,
                        toState: ws.state,
                        payload: {
                            ledgerId: entry.id,
                            shipmentId,
                            freightiqMarginUsd: Number(entry.freightiqMarginUsd),
                        },
                    },
                });
                await tx.timelineEvent.create({
                    data: {
                        workspaceId: entry.orderId,
                        eventType: "freight.revenue.realized",
                        actorUserId: actor?.id ?? "00000000-0000-0000-0000-000000000001",
                        payload: { ledgerId: entry.id, shipmentId },
                    },
                });
            });
            realized += 1;
            socketBus.scheduleEmit(() => {
                socketBus.emitToRole("ADMIN", SocketEvents.FREIGHT_REVENUE_REALIZED, {
                    orderId: entry.orderId,
                    shipmentId,
                    ledgerId: entry.id,
                });
            });
        }
        return realized;
    }
    async getMetrics() {
        const [volume, selected, pendingAgg, realizedAgg, ledgerRows] = await Promise.all([
            this.db.freightOffer.count({ where: { status: { in: ["ACTIVE", "REVISED", "SELECTED"] } } }),
            this.db.freightSelection.count(),
            this.db.freightRevenueLedger.aggregate({
                where: { status: "PENDING" },
                _sum: { freightiqMarginUsd: true },
            }),
            this.db.freightRevenueLedger.aggregate({
                where: { status: "REALIZED" },
                _sum: { freightiqMarginUsd: true },
            }),
            findLedgerWithOffers(this.db, {
                where: { status: { in: ["PENDING", "REALIZED"] } },
                take: 500,
                orderBy: { createdAt: "desc" },
                offerInclude: {
                    freightRequest: { select: { pol: true, pod: true, order: { select: { externalRef: true } } } },
                    forwarderContact: { select: { companyName: true } },
                },
            }),
        ]);
        const routeMap = new Map();
        const forwarderMap = new Map();
        let marginSum = 0;
        let marginCount = 0;
        for (const row of ledgerRows) {
            const m = Number(row.freightiqMarginUsd);
            marginSum += m;
            marginCount += 1;
            const fr = row.offer.freightRequest;
            const route = `${fr.pol}→${fr.pod}`;
            const r = routeMap.get(route) ?? { count: 0, marginUsd: 0 };
            r.count += 1;
            r.marginUsd += m;
            routeMap.set(route, r);
            const fwd = row.offer.forwarderContact?.companyName ?? row.offer.providerName;
            const f = forwarderMap.get(fwd) ?? { count: 0, marginUsd: 0 };
            f.count += 1;
            f.marginUsd += m;
            forwarderMap.set(fwd, f);
        }
        const topRoutes = [...routeMap.entries()]
            .map(([route, v]) => ({ route, ...v }))
            .sort((a, b) => b.marginUsd - a.marginUsd)
            .slice(0, 5);
        const topForwarders = [...forwarderMap.entries()]
            .map(([forwarder, v]) => ({ forwarder, ...v }))
            .sort((a, b) => b.marginUsd - a.marginUsd)
            .slice(0, 5);
        return {
            freightVolume: volume,
            selectedFreightOffers: selected,
            revenuePendingUsd: Number(pendingAgg._sum.freightiqMarginUsd ?? 0),
            revenueRealizedUsd: Number(realizedAgg._sum.freightiqMarginUsd ?? 0),
            averageMarginUsd: marginCount ? marginSum / marginCount : 0,
            topRoutes,
            topForwarders,
        };
    }
    async getReport() {
        const metrics = await this.getMetrics();
        const rows = await findLedgerWithOffers(this.db, {
            orderBy: { createdAt: "desc" },
            take: 200,
            offerInclude: {
                freightRequest: {
                    select: { pol: true, pod: true, order: { select: { externalRef: true } } },
                },
                forwarderContact: { select: { companyName: true } },
            },
        });
        const mapEntry = (r) => ({
            id: r.id,
            shipmentId: r.shipmentId,
            orderId: r.orderId,
            freightOfferId: r.freightOfferId,
            forwarderCostUsd: Number(r.forwarderCostUsd),
            freightiqMarginUsd: Number(r.freightiqMarginUsd),
            displayPriceUsd: Number(r.displayPriceUsd),
            currency: r.currency,
            status: r.status,
            realizedAt: r.realizedAt?.toISOString() ?? null,
            createdAt: r.createdAt.toISOString(),
        });
        const pendingRevenue = rows.filter((r) => r.status === "PENDING").map(mapEntry);
        const realizedRevenue = rows.filter((r) => r.status === "REALIZED").map(mapEntry);
        const monthMap = new Map();
        const routeRev = new Map();
        const fwdRev = new Map();
        for (const r of rows) {
            const m = Number(r.freightiqMarginUsd);
            const month = r.createdAt.toISOString().slice(0, 7);
            const mo = monthMap.get(month) ?? { realizedUsd: 0, pendingUsd: 0 };
            if (r.status === "REALIZED")
                mo.realizedUsd += m;
            else if (r.status === "PENDING")
                mo.pendingUsd += m;
            monthMap.set(month, mo);
            const fr = r.offer.freightRequest;
            const route = `${fr.pol}→${fr.pod}`;
            const rr = routeRev.get(route) ?? { realizedUsd: 0, pendingUsd: 0 };
            if (r.status === "REALIZED")
                rr.realizedUsd += m;
            else
                rr.pendingUsd += m;
            routeRev.set(route, rr);
            const fwd = r.offer.forwarderContact?.companyName ?? r.offer.providerName;
            const frw = fwdRev.get(fwd) ?? { realizedUsd: 0, pendingUsd: 0 };
            if (r.status === "REALIZED")
                frw.realizedUsd += m;
            else
                frw.pendingUsd += m;
            fwdRev.set(fwd, frw);
        }
        const marginPerContainer = rows
            .filter((r) => r.shipmentId)
            .slice(0, 20)
            .map((r) => ({
            shipmentId: r.shipmentId,
            orderRef: r.offer.freightRequest.order.externalRef,
            marginUsd: Number(r.freightiqMarginUsd),
        }));
        const topShipments = [...rows]
            .filter((r) => r.shipmentId)
            .sort((a, b) => Number(b.freightiqMarginUsd) - Number(a.freightiqMarginUsd))
            .slice(0, 10)
            .map((r) => ({
            shipmentId: r.shipmentId,
            orderId: r.orderId,
            marginUsd: Number(r.freightiqMarginUsd),
            status: r.status,
        }));
        return {
            metrics,
            pendingRevenue,
            realizedRevenue,
            revenueByMonth: [...monthMap.entries()].map(([month, v]) => ({ month, ...v })),
            revenueByRoute: [...routeRev.entries()].map(([route, v]) => ({ route, ...v })),
            revenueByForwarder: [...fwdRev.entries()].map(([forwarder, v]) => ({ forwarder, ...v })),
            marginPerContainer,
            topShipments,
        };
    }
}
//# sourceMappingURL=freight-commercial.service.js.map
import type { PrismaClient } from "@prisma/client";
import { cached } from "../../lib/response-cache.js";
import type {
  BuyerOpportunity,
  CategoryOpportunity,
  DemandHotspot,
  ForwarderOpportunity,
  GrowthRecommendation,
  MarketInsight,
  MarketTrend,
  RouteOpportunity,
  SupplyGap,
} from "@dmx/contracts/market-intelligence";
import { resolveFreightRoute } from "../freightiq/commercial/freight-route.util.js";
import { findLedgerWithOffers } from "../freightiq/commercial/freight-ledger.query.js";
import {
  categoryTrend,
  classifyForwarder,
  demandScore,
  growthPercent,
  routeOpportunityScore,
  supplyGapScore,
} from "./market.analytics.js";
import { marketAudit } from "./market-audit.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { SocketEvents } from "@dmx/contracts/socket-events";

const AVG_ORDER = 5000;
const AVG_FREIGHT = 250;

export class MarketService {
  constructor(private readonly db: PrismaClient) {}

  async getTrends(): Promise<MarketTrend[]> {
    const now = new Date();
    const out: MarketTrend[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      const prior = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
      const rfqCount = await this.db.workspace.count({
        where: { type: "RFQ", createdAt: { gte: d, lt: end } },
      });
      const orderCount = await this.db.workspace.count({
        where: { type: "ORDER", createdAt: { gte: d, lt: end } },
      });
      const shipmentCount = await this.db.workspace.count({
        where: { type: "SHIPMENT", createdAt: { gte: d, lt: end } },
      });
      const priorRfqs = await this.db.workspace.count({
        where: { type: "RFQ", createdAt: { gte: prior, lt: d } },
      });
      const periodOrders = await this.db.workspace.findMany({
        where: { type: "ORDER", createdAt: { gte: d, lt: end } },
        select: { id: true },
      });
      const rev = periodOrders.length
        ? await this.db.orderWorkspace.aggregate({
            where: { workspaceId: { in: periodOrders.map((o) => o.id) } },
            _sum: { totalValue: true },
          })
        : { _sum: { totalValue: null } };
      const freight = await this.db.freightRevenueLedger.aggregate({
        where: { createdAt: { gte: d, lt: end }, status: { in: ["PENDING", "REALIZED"] } },
        _sum: { freightiqMarginUsd: true },
      });
      out.push({
        period: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
        rfqCount,
        orderCount,
        shipmentCount,
        revenueUsd: Number(rev._sum.totalValue ?? 0),
        freightiqRevenueUsd: Number(freight._sum.freightiqMarginUsd ?? 0),
        growthPercent: growthPercent(rfqCount, priorRfqs),
      });
    }
    await marketAudit(this.db, "market.report.generated", { report: "trends" });
    return out;
  }

  async getCategories(): Promise<CategoryOpportunity[]> {
    const rfqs = await this.db.rfqDetails.findMany({
      select: { workspaceId: true, productCategory: true, workspace: { select: { createdAt: true } } },
      take: 3000,
    });
    const now = new Date();
    const recentCut = new Date(now.getTime() - 90 * 86_400_000);
    const priorCut = new Date(now.getTime() - 180 * 86_400_000);

    const byCat = new Map<string, { ids: string[]; recent: number; prior: number }>();
    for (const r of rfqs) {
      const cat = r.productCategory || "Uncategorized";
      const slot = byCat.get(cat) ?? { ids: [], recent: 0, prior: 0 };
      slot.ids.push(r.workspaceId);
      if (r.workspace.createdAt >= recentCut) slot.recent += 1;
      else if (r.workspace.createdAt >= priorCut) slot.prior += 1;
      byCat.set(cat, slot);
    }

    const results: CategoryOpportunity[] = [];
    for (const [category, { ids, recent, prior }] of byCat) {
      const quotes = await this.db.quotation.count({
        where: { workspaceId: { in: ids }, status: { not: "WITHDRAWN" } },
      });
      const orders = ids.length
        ? await this.db.workspace.count({ where: { type: "ORDER", spawnedFromId: { in: ids } } })
        : 0;
      const orderIds = ids.length
        ? (
            await this.db.workspace.findMany({
              where: { type: "ORDER", spawnedFromId: { in: ids } },
              select: { id: true },
            })
          ).map((o) => o.id)
        : [];
      const shipments = orderIds.length
        ? await this.db.workspace.count({ where: { type: "SHIPMENT", spawnedFromId: { in: orderIds } } })
        : 0;
      const rev = orderIds.length
        ? await this.db.orderWorkspace.aggregate({
            where: { workspaceId: { in: orderIds } },
            _sum: { totalValue: true },
          })
        : { _sum: { totalValue: null } };
      const freight = orderIds.length
        ? await this.db.freightRevenueLedger.aggregate({
            where: { orderId: { in: orderIds } },
            _sum: { freightiqMarginUsd: true },
          })
        : { _sum: { freightiqMarginUsd: null } };
      const conv = ids.length ? orders / ids.length : 0;
      const g = growthPercent(recent, prior);
      const opp = Math.min(
        100,
        Math.round(g * 0.4 + conv * 30 + Math.min(30, ids.length * 3) + (quotes < ids.length ? 15 : 0)),
      );
      results.push({
        category,
        rfqVolume: ids.length,
        quotationVolume: quotes,
        orderVolume: orders,
        shipmentVolume: shipments,
        revenueUsd: Number(rev._sum.totalValue ?? 0),
        freightiqRevenueUsd: Number(freight._sum.freightiqMarginUsd ?? 0),
        conversionRate: Math.round(conv * 1000) / 1000,
        growthPercent: g,
        trend: categoryTrend(g),
        opportunityScore: opp,
      });
    }
    return results.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }

  async getCountries(): Promise<DemandHotspot[]> {
    const details = await this.db.rfqDetails.findMany({
      select: {
        workspaceId: true,
        targetMarket: true,
        workspace: { select: { createdAt: true } },
      },
      take: 3000,
    });
    const now = new Date();
    const recentCut = new Date(now.getTime() - 90 * 86_400_000);
    const priorCut = new Date(now.getTime() - 180 * 86_400_000);

    const byCountry = new Map<string, { ids: string[]; recent: number; prior: number }>();
    for (const d of details) {
      const country = normalizeCountry(d.targetMarket);
      const slot = byCountry.get(country) ?? { ids: [], recent: 0, prior: 0 };
      slot.ids.push(d.workspaceId);
      if (d.workspace.createdAt >= recentCut) slot.recent += 1;
      else if (d.workspace.createdAt >= priorCut) slot.prior += 1;
      byCountry.set(country, slot);
    }

    const results: DemandHotspot[] = [];
    for (const [country, { ids, recent, prior }] of byCountry) {
      const orders = ids.length
        ? await this.db.workspace.count({ where: { type: "ORDER", spawnedFromId: { in: ids } } })
        : 0;
      const orderIds = ids.length
        ? (
            await this.db.workspace.findMany({
              where: { type: "ORDER", spawnedFromId: { in: ids } },
              select: { id: true },
            })
          ).map((o) => o.id)
        : [];
      const shipments = orderIds.length
        ? await this.db.workspace.count({ where: { type: "SHIPMENT", spawnedFromId: { in: orderIds } } })
        : 0;
      const rev = orderIds.length
        ? await this.db.orderWorkspace.aggregate({
            where: { workspaceId: { in: orderIds } },
            _sum: { totalValue: true },
          })
        : { _sum: { totalValue: null } };
      const freight = orderIds.length
        ? await this.db.freightRevenueLedger.aggregate({
            where: { orderId: { in: orderIds } },
            _sum: { freightiqMarginUsd: true },
          })
        : { _sum: { freightiqMarginUsd: null } };
      const g = growthPercent(recent, prior);
      results.push({
        country,
        demandScore: demandScore({ rfqs: ids.length, orders, growth: g }),
        rfqCount: ids.length,
        orderCount: orders,
        shipmentCount: shipments,
        revenueUsd: Number(rev._sum.totalValue ?? 0),
        freightiqRevenueUsd: Number(freight._sum.freightiqMarginUsd ?? 0),
        growthPercent: g,
      });
    }
    return results.sort((a, b) => b.demandScore - a.demandScore);
  }

  async getRoutes(): Promise<RouteOpportunity[]> {
    const requests = await this.db.freightRequest.findMany({
      select: { orderId: true, pol: true, pod: true, createdAt: true },
      take: 2000,
    });
    const now = Date.now();
    const recent = new Date(now - 90 * 86_400_000);
    const prior = new Date(now - 180 * 86_400_000);

    const routeMap = new Map<
      string,
      { lane: string; orderIds: Set<string>; recent: number; prior: number }
    >();
    for (const fr of requests) {
      const res = resolveFreightRoute(fr.pol, fr.pod);
      const slot = routeMap.get(res.route) ?? {
        lane: res.lane,
        orderIds: new Set(),
        recent: 0,
        prior: 0,
      };
      slot.orderIds.add(fr.orderId);
      if (fr.createdAt >= recent) slot.recent += 1;
      else if (fr.createdAt >= prior) slot.prior += 1;
      routeMap.set(res.route, slot);
    }

    const results: RouteOpportunity[] = [];
    for (const [route, { lane, orderIds, recent, prior }] of routeMap) {
      const oids = [...orderIds];
      const margin = oids.length
        ? await this.db.freightRevenueLedger.aggregate({
            where: { orderId: { in: oids } },
            _sum: { freightiqMarginUsd: true },
          })
        : { _sum: { freightiqMarginUsd: null } };
      const rev = oids.length
        ? await this.db.orderWorkspace.aggregate({
            where: { workspaceId: { in: oids } },
            _sum: { totalValue: true },
          })
        : { _sum: { totalValue: null } };
      const shipments = oids.length
        ? await this.db.workspace.count({ where: { type: "SHIPMENT", spawnedFromId: { in: oids } } })
        : 0;
      const g = growthPercent(recent, prior);
      const marginUsd = Number(margin._sum.freightiqMarginUsd ?? 0);
      const revenueUsd = Number(rev._sum.totalValue ?? 0);
      results.push({
        route,
        lane,
        revenueUsd,
        marginUsd,
        shipmentCount: shipments,
        buyerDemand: oids.length,
        growthPercent: g,
        opportunityScore: routeOpportunityScore({
          revenue: revenueUsd,
          margin: marginUsd,
          shipments,
          demand: oids.length,
          growth: g,
        }),
      });
    }
    return results.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }

  async getSupplyGaps(): Promise<SupplyGap[]> {
    const categories = await this.getCategories();
    const countries = await this.getCountries();
    const gaps: SupplyGap[] = [];

    for (const c of categories.filter((x) => x.rfqVolume >= 2)) {
      const conv = c.conversionRate;
      const score = supplyGapScore({
        demandRfqs: c.rfqVolume,
        supplierQuotes: c.quotationVolume,
        suppliersInvited: c.quotationVolume + 1,
        conversion: conv,
      });
      if (score < 50) continue;
      const topCountry = countries[0]?.country ?? null;
      gaps.push({
        category: c.category,
        country: topCountry,
        demandLevel: c.rfqVolume >= 5 ? "high" : "medium",
        supplierParticipation: c.quotationVolume,
        quotationCount: c.quotationVolume,
        conversionRate: conv,
        opportunityScore: score,
        recruitmentPriority: score >= 80 ? "urgent" : "normal",
      });
    }
    return gaps.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }

  async getBuyerOpportunities(): Promise<BuyerOpportunity[]> {
    const buyers = await this.db.user.findMany({
      where: { role: "BUYER", organisationId: { not: null } },
      include: { organisation: true },
    });
    const byOrg = new Map<string, typeof buyers>();
    for (const b of buyers) {
      const oid = b.organisationId!;
      const list = byOrg.get(oid) ?? [];
      list.push(b);
      byOrg.set(oid, list);
    }

    const results: BuyerOpportunity[] = [];
    for (const [orgId, users] of byOrg) {
      const userIds = users.map((u) => u.id);
      const rfqs = await this.db.workspace.findMany({
        where: { type: "RFQ", createdById: { in: userIds }, state: { not: "RFQ_DRAFT" } },
        include: { rfqDetails: { select: { productCategory: true, targetMarket: true } } },
        take: 50,
      });
      for (const rfq of rfqs) {
        const quotes = await this.db.quotation.count({
          where: { workspaceId: rfq.id, status: { not: "WITHDRAWN" } },
        });
        const order = await this.db.workspace.findFirst({
          where: { type: "ORDER", spawnedFromId: rfq.id },
        });
        if (quotes > 0 && order) continue;
        const issue =
          quotes === 0 ? "no_quotation" : order ? "no_shipment" : "no_conversion";
        if (issue === "no_conversion" && !order) {
          results.push({
            organisationId: orgId,
            organisationName: users[0].organisation!.name,
            category: rfq.rfqDetails?.productCategory ?? null,
            country: normalizeCountry(rfq.rfqDetails?.targetMarket ?? ""),
            rfqCount: 1,
            quotationCount: quotes,
            issue,
            potentialRevenueUsd: AVG_ORDER,
            potentialFreightiqRevenueUsd: AVG_FREIGHT,
            potentialShipments: 1,
            opportunityScore: quotes === 0 ? 90 : 70,
          });
        } else if (quotes === 0) {
          results.push({
            organisationId: orgId,
            organisationName: users[0].organisation!.name,
            category: rfq.rfqDetails?.productCategory ?? null,
            country: normalizeCountry(rfq.rfqDetails?.targetMarket ?? ""),
            rfqCount: 1,
            quotationCount: 0,
            issue: "no_quotation",
            potentialRevenueUsd: AVG_ORDER,
            potentialFreightiqRevenueUsd: AVG_FREIGHT,
            potentialShipments: 1,
            opportunityScore: 85,
          });
        }
      }
    }
    return results.sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 50);
  }

  async getForwarderOpportunities(): Promise<ForwarderOpportunity[]> {
    const offers = await this.db.freightOffer.findMany({
      where: { forwarderContactId: { not: null } },
      include: {
        forwarderContact: true,
        selection: true,
        freightRequest: { select: { pol: true, pod: true } },
      },
      take: 2000,
    });
    const byFwd = new Map<
      string,
      {
        id: string;
        name: string;
        offers: number;
        selections: number;
        routes: Set<string>;
        margin: number;
      }
    >();
    for (const o of offers) {
      const id = o.forwarderContactId!;
      const name = o.forwarderContact?.companyName ?? o.providerName;
      const slot = byFwd.get(id) ?? {
        id,
        name,
        offers: 0,
        selections: 0,
        routes: new Set(),
        margin: 0,
      };
      slot.offers += 1;
      if (o.selection) slot.selections += 1;
      if (o.freightRequest) {
        slot.routes.add(resolveFreightRoute(o.freightRequest.pol, o.freightRequest.pod).route);
      }
      byFwd.set(id, slot);
    }

    const ledger = await findLedgerWithOffers(this.db, {
      where: { status: { in: ["PENDING", "REALIZED"] } },
      offerInclude: {},
    });
    for (const row of ledger) {
      const fid = row.offer.forwarderContactId;
      if (!fid) continue;
      const slot = byFwd.get(fid);
      if (slot) slot.margin += Number(row.freightiqMarginUsd);
    }

    const results: ForwarderOpportunity[] = [];
    for (const f of byFwd.values()) {
      const selectionRate = f.offers ? f.selections / f.offers : 0;
      const winRate = selectionRate;
      const growthScore = Math.min(
        100,
        Math.round(selectionRate * 50 + f.routes.size * 8 + f.margin / 50),
      );
      results.push({
        forwarderId: f.id,
        forwarderName: f.name,
        offerVolume: f.offers,
        selectionRate: Math.round(selectionRate * 1000) / 1000,
        routeCoverage: f.routes.size,
        revenueContributionUsd: f.margin,
        winRate,
        growthScore,
        classification: classifyForwarder({
          offers: f.offers,
          selections: f.selections,
          revenue: f.margin,
          routes: f.routes.size,
        }),
      });
    }
    return results.sort((a, b) => b.growthScore - a.growthScore);
  }

  async getRecommendations(): Promise<GrowthRecommendation[]> {
    const [categories, routes, buyers, gaps, forwarders] = await Promise.all([
      this.getCategories(),
      this.getRoutes(),
      this.getBuyerOpportunities(),
      this.getSupplyGaps(),
      this.getForwarderOpportunities(),
    ]);

    const recs: GrowthRecommendation[] = [];
    let n = 0;

    const topGap = gaps[0];
    if (topGap) {
      recs.push({
        id: `rec-${++n}`,
        priority: "high",
        action: `Recruit more ${topGap.category} suppliers`,
        reason: `Demand ${topGap.demandLevel} with low supplier participation (score ${topGap.opportunityScore}).`,
        entityType: "category",
        entityRef: topGap.category,
      });
    }

    const topRoute = routes[0];
    if (topRoute && topRoute.opportunityScore >= 70) {
      recs.push({
        id: `rec-${++n}`,
        priority: "high",
        action: `Focus on ${topRoute.lane}`,
        reason: `High volume and FreightIQ margin (score ${topRoute.opportunityScore}).`,
        entityType: "route",
        entityRef: topRoute.route,
      });
    }

    const growing = categories.find((c) => c.trend === "growing");
    if (growing) {
      recs.push({
        id: `rec-${++n}`,
        priority: "medium",
        action: `Expand ${growing.category} supplier base`,
        reason: `Category growing ${growing.growthPercent}% with conversion ${(growing.conversionRate * 100).toFixed(0)}%.`,
        entityType: "category",
        entityRef: growing.category,
      });
    }

    const buyer = buyers[0];
    if (buyer) {
      recs.push({
        id: `rec-${++n}`,
        priority: "high",
        action: `Re-engage ${buyer.organisationName}`,
        reason: `Repeated RFQs (${buyer.issue}) without conversion.`,
        entityType: "buyer",
        entityRef: buyer.organisationId,
      });
    }

    const under = forwarders.filter((f) => f.classification === "Underutilized")[0];
    if (under) {
      recs.push({
        id: `rec-${++n}`,
        priority: "low",
        action: `Activate forwarder ${under.forwarderName}`,
        reason: `Underutilized partner with route coverage potential.`,
        entityType: "forwarder",
        entityRef: under.forwarderId ?? under.forwarderName,
      });
    }

    await marketAudit(this.db, "market.recommendation.generated", { count: recs.length });
    return recs;
  }

  async getOpportunities(): Promise<MarketInsight["topOpportunities"]> {
    const insight = await this.buildInsight(false);
    return insight.topOpportunities;
  }

  async getInsight(): Promise<MarketInsight> {
    return cached("market:insights", 10 * 60_000, () => this.buildInsight(true));
  }

  private async buildInsight(emitSocket: boolean): Promise<MarketInsight> {
    const [
      trends,
      demandHotspots,
      supplyGaps,
      categoryOpportunities,
      routeOpportunities,
      buyerOpportunities,
      forwarderOpportunities,
      recommendations,
    ] = await Promise.all([
      this.getTrends(),
      this.getCountries(),
      this.getSupplyGaps(),
      this.getCategories(),
      this.getRoutes(),
      this.getBuyerOpportunities(),
      this.getForwarderOpportunities(),
      this.getRecommendations(),
    ]);

    const topOpportunities = [
      ...categoryOpportunities.slice(0, 3).map((c) => ({
        type: "category",
        ref: c.category,
        score: c.opportunityScore,
        summary: `${c.category}: ${c.trend} trend, ${c.rfqVolume} RFQs`,
      })),
      ...routeOpportunities.slice(0, 3).map((r) => ({
        type: "route",
        ref: r.lane,
        score: r.opportunityScore,
        summary: `${r.lane}: ${r.marginUsd} FreightIQ margin`,
      })),
      ...supplyGaps.slice(0, 2).map((g) => ({
        type: "supply_gap",
        ref: `${g.category}→${g.country ?? "global"}`,
        score: g.opportunityScore,
        summary: `Recruit ${g.category} suppliers`,
      })),
      ...buyerOpportunities.slice(0, 2).map((b) => ({
        type: "buyer",
        ref: b.organisationName,
        score: b.opportunityScore,
        summary: `Unserved: ${b.issue}`,
      })),
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (emitSocket) {
      socketBus.scheduleEmit(() => {
        socketBus.emitToRole("ADMIN", SocketEvents.MARKET_INSIGHT_UPDATED, {
          at: new Date().toISOString(),
        });
        socketBus.emitToRole("ADMIN", SocketEvents.MARKET_OPPORTUNITY_UPDATED, {
          count: topOpportunities.length,
        });
      });
    }

    return {
      trends,
      demandHotspots,
      supplyGaps,
      categoryOpportunities,
      routeOpportunities,
      buyerOpportunities,
      forwarderOpportunities,
      recommendations,
      topOpportunities,
      generatedAt: new Date().toISOString(),
    };
  }
}

function normalizeCountry(raw: string): string {
  const t = raw.trim();
  if (!t) return "Unknown";
  const upper = t.toUpperCase();
  const map: Record<string, string> = {
    UAE: "UAE",
    "UNITED ARAB EMIRATES": "UAE",
    SA: "Saudi Arabia",
    "SAUDI ARABIA": "Saudi Arabia",
    NG: "Nigeria",
    NIGERIA: "Nigeria",
    UK: "UK",
    "UNITED KINGDOM": "UK",
    USA: "USA",
    US: "USA",
    "UNITED STATES": "USA",
  };
  return map[upper] ?? t.split(",")[0].trim();
}

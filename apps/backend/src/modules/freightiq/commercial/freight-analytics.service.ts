import type { PrismaClient } from "@prisma/client";
import type {
  ForwarderProfitability,
  FreightCommercialInsight,
  MarginDistributionBucket,
  RouteProfitability,
} from "@dmx/contracts/freight-analytics";
import { FreightCommercialService } from "./freight-commercial.service.js";
import { findLedgerWithOffers } from "./freight-ledger.query.js";
import { resolveFreightRoute } from "./freight-route.util.js";

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export class FreightAnalyticsService {
  private readonly commercial: FreightCommercialService;

  constructor(private readonly db: PrismaClient) {
    this.commercial = new FreightCommercialService(db);
  }

  async getInsight(): Promise<FreightCommercialInsight> {
    const metrics = await this.commercial.getMetrics();
    const report = await this.commercial.getReport();
    const now = new Date();
    const thisMonth = monthKey(now);
    const lastMonth = monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));

    const ledger = await findLedgerWithOffers(this.db, {
      where: { status: { in: ["PENDING", "REALIZED"] } },
      take: 2000,
      offerInclude: {
        freightRequest: { select: { pol: true, pod: true } },
        forwarderContact: { select: { id: true, companyName: true } },
      },
    });

    const routeAgg = new Map<
      string,
      { lane: string; countryFrom: string; countryTo: string; count: number; revenue: number; margin: number }
    >();
    const countryAgg = new Map<string, { revenue: number; margin: number }>();
    const forwarderLedger = new Map<string, { revenue: number; margin: number; count: number }>();
    const marginBuckets: MarginDistributionBucket[] = [
      { label: "Negative", count: 0, marginUsd: 0 },
      { label: "Zero", count: 0, marginUsd: 0 },
      { label: "Low (<100)", count: 0, marginUsd: 0 },
      { label: "Standard (100-300)", count: 0, marginUsd: 0 },
      { label: "High (>300)", count: 0, marginUsd: 0 },
    ];

    let containers = 0;
    let marginSum = 0;
    let revenueThisMonth = 0;
    let revenueLastMonth = 0;

    for (const row of ledger) {
      const m = Number(row.freightiqMarginUsd);
      const display = Number(row.displayPriceUsd);
      marginSum += m;
      if (row.shipmentId) containers += 1;
      const created = row.createdAt;
      const mk = monthKey(created);
      if (mk === thisMonth) revenueThisMonth += m;
      if (mk === lastMonth) revenueLastMonth += m;

      const fr = row.offer.freightRequest;
      const resolved = resolveFreightRoute(fr.pol, fr.pod);
      const ra = routeAgg.get(resolved.route) ?? {
        lane: resolved.lane,
        countryFrom: resolved.countryFrom,
        countryTo: resolved.countryTo,
        count: 0,
        revenue: 0,
        margin: 0,
      };
      ra.count += 1;
      ra.revenue += display;
      ra.margin += m;
      routeAgg.set(resolved.route, ra);

      for (const c of [resolved.countryFrom, resolved.countryTo]) {
        const ca = countryAgg.get(c) ?? { revenue: 0, margin: 0 };
        ca.revenue += display;
        ca.margin += m;
        countryAgg.set(c, ca);
      }

      const fwdName = row.offer.forwarderContact?.companyName ?? row.offer.providerName;
      const fl = forwarderLedger.get(fwdName) ?? { revenue: 0, margin: 0, count: 0 };
      fl.revenue += display;
      fl.margin += m;
      fl.count += 1;
      forwarderLedger.set(fwdName, fl);

      if (m < 0) {
        marginBuckets[0].count += 1;
        marginBuckets[0].marginUsd += m;
      } else if (m === 0) {
        marginBuckets[1].count += 1;
      } else if (m < 100) {
        marginBuckets[2].count += 1;
        marginBuckets[2].marginUsd += m;
      } else if (m <= 300) {
        marginBuckets[3].count += 1;
        marginBuckets[3].marginUsd += m;
      } else {
        marginBuckets[4].count += 1;
        marginBuckets[4].marginUsd += m;
      }
    }

    const revenueByRoute: RouteProfitability[] = [...routeAgg.entries()].map(([route, v]) => ({
      route,
      lane: v.lane,
      countryFrom: v.countryFrom,
      countryTo: v.countryTo,
      shipmentCount: v.count,
      revenueUsd: v.revenue,
      marginUsd: v.margin,
      averageMarginUsd: v.count ? v.margin / v.count : 0,
      revenuePerContainer: v.count ? v.margin / v.count : 0,
    }));

    const sortedRoutes = [...revenueByRoute].sort((a, b) => b.marginUsd - a.marginUsd);
    const topRoutes = sortedRoutes.slice(0, 5);
    const bottomRoutes = [...sortedRoutes].reverse().slice(0, 5);

    const forwarderScorecards = await this.buildForwarderScorecards();

    const revenueByMonth = report.revenueByMonth.map((r) => ({
      period: r.month,
      revenueUsd: r.realizedUsd + r.pendingUsd,
      marginUsd: r.realizedUsd + r.pendingUsd,
      pendingUsd: r.pendingUsd,
      containerCount: 0,
    }));

    await this.persistSnapshots(thisMonth, revenueByRoute, forwarderScorecards);

    return {
      revenueThisMonth,
      revenueLastMonth,
      pendingRevenue: metrics.revenuePendingUsd,
      realizedRevenue: metrics.revenueRealizedUsd,
      averageMargin: metrics.averageMarginUsd,
      revenuePerContainer: containers ? marginSum / containers : marginSum / Math.max(ledger.length, 1),
      topRoutes,
      bottomRoutes,
      topForwarders: forwarderScorecards.slice(0, 5),
      marginDistribution: marginBuckets,
      revenueByRoute,
      revenueByForwarder: [...forwarderLedger.entries()].map(([forwarder, v]) => ({
        forwarder,
        revenueUsd: v.revenue,
        marginUsd: v.margin,
      })),
      revenueByCountry: [...countryAgg.entries()].map(([country, v]) => ({
        country,
        revenueUsd: v.revenue,
        marginUsd: v.margin,
      })),
      revenueByMonth,
      marginByRoute: revenueByRoute,
      marginByForwarder: [...forwarderLedger.entries()].map(([forwarder, v]) => ({
        forwarder,
        marginUsd: v.margin,
        count: v.count,
      })),
      containerCountByRoute: revenueByRoute.map((r) => ({ route: r.route, count: r.shipmentCount })),
      forwarderScorecards,
    };
  }

  async buildForwarderScorecards(): Promise<ForwarderProfitability[]> {
    const offers = await this.db.freightOffer.findMany({
      where: { forwarderContactId: { not: null } },
      include: {
        forwarderContact: true,
        freightRequest: { select: { orderId: true } },
        selection: true,
      },
      take: 3000,
    });

    const ledger = await findLedgerWithOffers(this.db, {
      where: { status: { in: ["PENDING", "REALIZED"] } },
      offerInclude: {},
    });

    const byForwarder = new Map<
      string,
      {
        id: string | null;
        name: string;
        offers: number;
        selections: number;
        revenue: number;
        marginSum: number;
        marginCount: number;
        transitSum: number;
        transitCount: number;
        etaDriftSum: number;
        etaDriftCount: number;
        delays: number;
      }
    >();

    for (const o of offers) {
      const id = o.forwarderContactId;
      const name = o.forwarderContact?.companyName ?? o.providerName;
      const key = id ?? name;
      const slot = byForwarder.get(key) ?? {
        id,
        name,
        offers: 0,
        selections: 0,
        revenue: 0,
        marginSum: 0,
        marginCount: 0,
        transitSum: 0,
        transitCount: 0,
        etaDriftSum: 0,
        etaDriftCount: 0,
        delays: 0,
      };
      slot.offers += 1;
      if (o.selection) slot.selections += 1;
      slot.transitSum += o.transitDays;
      slot.transitCount += 1;
      if (o.eta && o.etd) {
        const planned = (o.eta.getTime() - o.etd.getTime()) / 86_400_000;
        const drift = Math.abs(planned - o.transitDays);
        slot.etaDriftSum += drift;
        slot.etaDriftCount += 1;
        if (drift > 2) slot.delays += 1;
      }
      byForwarder.set(key, slot);
    }

    for (const row of ledger) {
      const id = row.offer.forwarderContactId;
      const name = row.offer.providerName;
      const key = id ?? name;
      const slot = byForwarder.get(key) ?? {
        id,
        name,
        offers: 0,
        selections: 0,
        revenue: 0,
        marginSum: 0,
        marginCount: 0,
        transitSum: 0,
        transitCount: 0,
        etaDriftSum: 0,
        etaDriftCount: 0,
        delays: 0,
      };
      slot.revenue += Number(row.freightiqMarginUsd);
      slot.marginSum += Number(row.freightiqMarginUsd);
      slot.marginCount += 1;
      byForwarder.set(key, slot);
    }

    return [...byForwarder.values()]
      .map((f) => ({
        forwarderId: f.id,
        forwarderName: f.name,
        offerCount: f.offers,
        selectionCount: f.selections,
        winRate: f.offers ? f.selections / f.offers : 0,
        revenueGeneratedUsd: f.revenue,
        averageMarginUsd: f.marginCount ? f.marginSum / f.marginCount : 0,
        averageTransitDays: f.transitCount ? f.transitSum / f.transitCount : 0,
        averageEtaDriftDays: f.etaDriftCount ? f.etaDriftSum / f.etaDriftCount : 0,
        delayRate: f.offers ? f.delays / f.offers : 0,
      }))
      .sort((a, b) => b.revenueGeneratedUsd - a.revenueGeneratedUsd);
  }

  async exportCsv(reportType: string): Promise<string> {
    const insight = await this.getInsight();
    const lines: string[] = [];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

    switch (reportType) {
      case "revenue-by-route":
        lines.push("route,lane,revenue_usd,margin_usd,shipments");
        for (const r of insight.revenueByRoute) {
          lines.push([r.route, r.lane, r.revenueUsd, r.marginUsd, r.shipmentCount].map(esc).join(","));
        }
        break;
      case "revenue-by-forwarder":
        lines.push("forwarder,revenue_usd,margin_usd");
        for (const r of insight.revenueByForwarder) {
          lines.push([r.forwarder, r.revenueUsd, r.marginUsd].map(esc).join(","));
        }
        break;
      case "revenue-by-country":
        lines.push("country,revenue_usd,margin_usd");
        for (const r of insight.revenueByCountry) {
          lines.push([r.country, r.revenueUsd, r.marginUsd].map(esc).join(","));
        }
        break;
      case "revenue-by-month":
        lines.push("period,revenue_usd,margin_usd,pending_usd");
        for (const r of insight.revenueByMonth) {
          lines.push([r.period, r.revenueUsd, r.marginUsd, r.pendingUsd].map(esc).join(","));
        }
        break;
      case "margin-by-route":
        lines.push("route,margin_usd,avg_margin_usd");
        for (const r of insight.marginByRoute) {
          lines.push([r.route, r.marginUsd, r.averageMarginUsd].map(esc).join(","));
        }
        break;
      case "margin-by-forwarder":
        lines.push("forwarder,margin_usd,count");
        for (const r of insight.marginByForwarder) {
          lines.push([r.forwarder, r.marginUsd, r.count].map(esc).join(","));
        }
        break;
      case "containers-by-route":
        lines.push("route,container_count");
        for (const r of insight.containerCountByRoute) {
          lines.push([r.route, r.count].map(esc).join(","));
        }
        break;
      default:
        lines.push("metric,value");
        lines.push(["revenue_per_container", insight.revenuePerContainer].map(esc).join(","));
    }
    return lines.join("\n");
  }

  private async persistSnapshots(
    period: string,
    routes: RouteProfitability[],
    forwarders: ForwarderProfitability[],
  ) {
    const batch = [
      ...routes.slice(0, 20).map((r) => ({
        period,
        route: r.route,
        forwarder: "_aggregate",
        shipmentCount: r.shipmentCount,
        revenue: r.revenueUsd,
        margin: r.marginUsd,
      })),
      ...forwarders.slice(0, 20).map((f) => ({
        period,
        route: "_aggregate",
        forwarder: f.forwarderName,
        shipmentCount: f.selectionCount,
        revenue: f.revenueGeneratedUsd,
        margin: f.averageMarginUsd * Math.max(f.selectionCount, 1),
      })),
    ];
    for (const row of batch) {
      await this.db.freightCommercialSnapshot.create({ data: row }).catch(() => undefined);
    }
  }
}

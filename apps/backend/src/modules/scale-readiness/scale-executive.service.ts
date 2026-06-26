import type { PrismaClient } from "@prisma/client";
import type { ExecutiveDashboard } from "@dmx/contracts/scale-readiness";
import { ScalePortfolioService } from "./scale-portfolio.service.js";
import { ScaleForecastService } from "./scale-forecast.service.js";
import { FreightAnalyticsService } from "../freightiq/commercial/freight-analytics.service.js";

const RFQ_OPEN = { notIn: ["CANCELLED", "EXPIRED", "CLOSED_NO_AWARD", "PO_ISSUED"] };
const ORDER_OPEN = { notIn: ["COMPLETED", "CANCELLED", "DISPUTED"] };
const SHIPMENT_OPEN = { notIn: ["DELIVERED", "CANCELLED"] };

export class ScaleExecutiveService {
  private readonly portfolio: ScalePortfolioService;
  private readonly forecast: ScaleForecastService;
  private readonly freightAnalytics: FreightAnalyticsService;

  constructor(private readonly db: PrismaClient) {
    this.portfolio = new ScalePortfolioService(db);
    this.forecast = new ScaleForecastService(db);
    this.freightAnalytics = new FreightAnalyticsService(db);
  }

  async getExecutiveDashboard(): Promise<ExecutiveDashboard> {
    const [buyers, suppliers, openRfqs, openOrders, openShipments, f30, f60, f90, insight] =
      await Promise.all([
        this.portfolio.listBuyerHealth(),
        this.portfolio.listSupplierHealth(),
        this.db.workspace.count({ where: { type: "RFQ", state: RFQ_OPEN } }),
        this.db.workspace.count({ where: { type: "ORDER", state: ORDER_OPEN } }),
        this.db.workspace.count({ where: { type: "SHIPMENT", state: SHIPMENT_OPEN } }),
        this.forecast.getForecast(30),
        this.forecast.getForecast(60),
        this.forecast.getForecast(90),
        this.freightAnalytics.getInsight(),
      ]);

    const activeBuyers = buyers.filter((b) => b.activity.daysSinceActivity <= 30).length;
    const activeSuppliers = suppliers.filter((s) => s.activity.daysSinceActivity <= 30).length;

    return {
      activeBuyers,
      activeSuppliers,
      openRfqs,
      openOrders,
      openShipments,
      revenueForecast30d: f30,
      revenueForecast60d: f60,
      revenueForecast90d: f90,
      topCustomers: buyers.slice(0, 10),
      topSuppliers: suppliers.slice(0, 10),
      topRoutes: insight.topRoutes.map((r) => ({ route: r.route, marginUsd: r.marginUsd })),
      topForwarders: insight.topForwarders.map((f) => ({
        forwarder: f.forwarderName,
        revenueUsd: f.revenueGeneratedUsd,
      })),
    };
  }
}

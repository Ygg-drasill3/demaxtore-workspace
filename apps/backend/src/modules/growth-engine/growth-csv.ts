import type { GrowthService } from "./growth.service.js";
import { growthAudit } from "./growth-audit.js";

const esc = (v: string | number | boolean) => `"${String(v).replace(/"/g, '""')}"`;

export async function exportGrowthCsv(
  reportType: string,
  growth: GrowthService,
  db: import("@prisma/client").PrismaClient,
): Promise<string> {
  const lines: string[] = [];
  switch (reportType) {
    case "buyers": {
      const rows = await growth.getBuyerActivation();
      lines.push("organisation,classification,activation_score,rfqs,orders,shipments");
      for (const b of rows) {
        lines.push(
          [b.organisationName, b.classification, b.activationScore, b.rfqsCreated, b.ordersCreated, b.shipmentsCompleted]
            .map(esc)
            .join(","),
        );
      }
      break;
    }
    case "suppliers": {
      const rows = await growth.getSupplierPerformance();
      lines.push("organisation,classification,growth_score,quotes,win_rate,freightiq_revenue");
      for (const s of rows) {
        lines.push(
          [s.organisationName, s.classification, s.growthScore, s.quotationsSubmitted, s.winRate, s.freightiqRevenueUsd]
            .map(esc)
            .join(","),
        );
      }
      break;
    }
    case "funnel": {
      const f = await growth.getFunnel();
      lines.push("stage,label,count,conversion_pct,dropoff_pct");
      for (const s of f.stages) {
        lines.push([s.stage, s.label, s.count, s.conversionPercent, s.dropoffPercent].map(esc).join(","));
      }
      break;
    }
    case "categories": {
      const rows = await growth.getCategoryIntelligence();
      lines.push("category,rfqs,orders,shipments,revenue,freightiq_revenue");
      for (const c of rows) {
        lines.push(
          [c.category, c.rfqCount, c.orderCount, c.shipmentCount, c.revenueUsd, c.freightiqRevenueUsd].map(esc).join(","),
        );
      }
      break;
    }
    case "routes": {
      const rows = await growth.getRouteIntelligence();
      lines.push("route,lane,rfqs,orders,shipments,revenue,freightiq_revenue");
      for (const r of rows) {
        lines.push(
          [r.route, r.lane, r.rfqCount, r.orderCount, r.shipmentCount, r.revenueUsd, r.freightiqRevenueUsd]
            .map(esc)
            .join(","),
        );
      }
      break;
    }
    case "lost-opportunities": {
      const lost = await growth.getLostOpportunities();
      lines.push("type,workspace_ref,description,est_revenue,est_freightiq");
      for (const i of lost.items) {
        lines.push(
          [i.type, i.workspaceRef, i.description, i.estimatedLostRevenueUsd, i.estimatedLostFreightiqRevenueUsd]
            .map(esc)
            .join(","),
        );
      }
      break;
    }
    case "repeat-customers": {
      const rows = await growth.getRepeatCustomers();
      lines.push("horizon_days,first_time,repeat,repeat_rate,repeat_shipment_rate,repeat_revenue");
      for (const r of rows) {
        lines.push(
          [r.horizonDays, r.firstTimeBuyers, r.repeatBuyers, r.repeatRate, r.repeatShipmentRate, r.repeatRevenueUsd]
            .map(esc)
            .join(","),
        );
      }
      break;
    }
    default:
      lines.push("error", esc("unknown_report"));
  }
  await growthAudit(db, "growth.export.generated", { reportType });
  return lines.join("\n");
}

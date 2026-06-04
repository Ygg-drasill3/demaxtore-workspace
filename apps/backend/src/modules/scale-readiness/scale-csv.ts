import { formatDaysSinceActivity } from "@dmx/contracts/activity-days";
import type { ScalePortfolioService } from "./scale-portfolio.service.js";
import type { ScalePipelineService } from "./scale-pipeline.service.js";
import type { ScaleForecastService } from "./scale-forecast.service.js";
import type { ScaleWorkloadService } from "./scale-workload.service.js";

const esc = (v: string | number | boolean) => `"${String(v).replace(/"/g, '""')}"`;

export async function exportScaleCsv(
  reportType: string,
  deps: {
    portfolio: ScalePortfolioService;
    pipeline: ScalePipelineService;
    forecast: ScaleForecastService;
    workload: ScaleWorkloadService;
  },
): Promise<string> {
  const lines: string[] = [];
  switch (reportType) {
    case "customers": {
      const buyers = await deps.portfolio.listBuyerHealth();
      lines.push("organisation,rfq_count,order_count,revenue_usd,commercial_score,days_since_activity");
      for (const b of buyers) {
        lines.push(
          [b.organisationName, b.rfqCount, b.orderCount, b.revenueGeneratedUsd, b.commercialScore, formatDaysSinceActivity(b.activity.daysSinceActivity)]
            .map(esc)
            .join(","),
        );
      }
      break;
    }
    case "suppliers": {
      const suppliers = await deps.portfolio.listSupplierHealth();
      lines.push("organisation,invitations,orders,revenue_usd,commercial_score,days_since_activity");
      for (const s of suppliers) {
        lines.push(
          [s.organisationName, s.rfqInvitations, s.orderCount, s.revenueAttributedUsd, s.commercialScore, formatDaysSinceActivity(s.activity.daysSinceActivity)]
            .map(esc)
            .join(","),
        );
      }
      break;
    }
    case "forecast": {
      lines.push("horizon_days,expected_revenue_usd,expected_containers,expected_orders,expected_shipments");
      for (const d of [30, 60, 90] as const) {
        const f = await deps.forecast.getForecast(d);
        lines.push(
          [f.horizonDays, f.expectedFreightiqRevenueUsd, f.expectedContainerCount, f.expectedOrders, f.expectedShipments]
            .map(esc)
            .join(","),
        );
      }
      break;
    }
    case "pipeline": {
      const p = await deps.pipeline.getPipelineHealth();
      lines.push("workspace_ref,type,state,health_score,stalled,issues");
      for (const i of p.items) {
        lines.push(
          [i.workspaceRef, i.workspaceType, i.state, i.healthScore, i.stalled, i.issues.join(";")]
            .map(esc)
            .join(","),
        );
      }
      break;
    }
    case "operations-load": {
      const w = await deps.workload.getOperatorWorkload();
      lines.push("operator,email,rfqs,orders,shipments,alerts,documents,total_load,overloaded");
      for (const o of w) {
        lines.push(
          [o.displayName, o.email, o.activeRfqs, o.activeOrders, o.activeShipments, o.openAlerts, o.openDocuments, o.totalLoad, o.overloaded]
            .map(esc)
            .join(","),
        );
      }
      break;
    }
    default:
      lines.push("error", esc("unknown_report_type"));
  }
  return lines.join("\n");
}

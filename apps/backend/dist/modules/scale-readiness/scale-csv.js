import { formatDaysSinceActivity } from "@dmx/contracts/activity-days";
const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
export async function exportScaleCsv(reportType, deps) {
    const lines = [];
    switch (reportType) {
        case "customers": {
            const buyers = await deps.portfolio.listBuyerHealth();
            lines.push("organisation,rfq_count,order_count,revenue_usd,commercial_score,days_since_activity");
            for (const b of buyers) {
                lines.push([b.organisationName, b.rfqCount, b.orderCount, b.revenueGeneratedUsd, b.commercialScore, formatDaysSinceActivity(b.activity.daysSinceActivity)]
                    .map(esc)
                    .join(","));
            }
            break;
        }
        case "suppliers": {
            const suppliers = await deps.portfolio.listSupplierHealth();
            lines.push("organisation,invitations,orders,revenue_usd,commercial_score,days_since_activity");
            for (const s of suppliers) {
                lines.push([s.organisationName, s.rfqInvitations, s.orderCount, s.revenueAttributedUsd, s.commercialScore, formatDaysSinceActivity(s.activity.daysSinceActivity)]
                    .map(esc)
                    .join(","));
            }
            break;
        }
        case "forecast": {
            lines.push("horizon_days,expected_revenue_usd,expected_containers,expected_orders,expected_shipments");
            for (const d of [30, 60, 90]) {
                const f = await deps.forecast.getForecast(d);
                lines.push([f.horizonDays, f.expectedFreightiqRevenueUsd, f.expectedContainerCount, f.expectedOrders, f.expectedShipments]
                    .map(esc)
                    .join(","));
            }
            break;
        }
        case "pipeline": {
            const p = await deps.pipeline.getPipelineHealth();
            lines.push("workspace_ref,type,state,health_score,stalled,issues");
            for (const i of p.items) {
                lines.push([i.workspaceRef, i.workspaceType, i.state, i.healthScore, i.stalled, i.issues.join(";")]
                    .map(esc)
                    .join(","));
            }
            break;
        }
        case "operations-load": {
            const w = await deps.workload.getOperatorWorkload();
            lines.push("operator,email,rfqs,orders,shipments,alerts,documents,total_load,overloaded");
            for (const o of w) {
                lines.push([o.displayName, o.email, o.activeRfqs, o.activeOrders, o.activeShipments, o.openAlerts, o.openDocuments, o.totalLoad, o.overloaded]
                    .map(esc)
                    .join(","));
            }
            break;
        }
        default:
            lines.push("error", esc("unknown_report_type"));
    }
    return lines.join("\n");
}
//# sourceMappingURL=scale-csv.js.map
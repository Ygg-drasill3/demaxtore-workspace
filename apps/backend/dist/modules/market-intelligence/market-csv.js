import { marketAudit } from "./market-audit.js";
const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
export async function exportMarketCsv(reportType, market, db) {
    const lines = [];
    switch (reportType) {
        case "categories": {
            const rows = await market.getCategories();
            lines.push("category,rfqs,quotes,orders,opportunity_score,trend");
            for (const r of rows) {
                lines.push([r.category, r.rfqVolume, r.quotationVolume, r.orderVolume, r.opportunityScore, r.trend].map(esc).join(","));
            }
            break;
        }
        case "countries": {
            const rows = await market.getCountries();
            lines.push("country,demand_score,rfqs,orders,freightiq_revenue");
            for (const r of rows) {
                lines.push([r.country, r.demandScore, r.rfqCount, r.orderCount, r.freightiqRevenueUsd].map(esc).join(","));
            }
            break;
        }
        case "routes": {
            const rows = await market.getRoutes();
            lines.push("route,lane,score,revenue,margin,shipments");
            for (const r of rows) {
                lines.push([r.route, r.lane, r.opportunityScore, r.revenueUsd, r.marginUsd, r.shipmentCount].map(esc).join(","));
            }
            break;
        }
        case "suppliers":
        case "opportunities": {
            const rows = await market.getSupplyGaps();
            lines.push("category,country,score,demand,participation");
            for (const r of rows) {
                lines.push([r.category, r.country ?? "", r.opportunityScore, r.demandLevel, r.supplierParticipation].map(esc).join(","));
            }
            break;
        }
        case "buyers": {
            const rows = await market.getBuyerOpportunities();
            lines.push("organisation,issue,score,potential_revenue,potential_freightiq");
            for (const r of rows) {
                lines.push([r.organisationName, r.issue, r.opportunityScore, r.potentialRevenueUsd, r.potentialFreightiqRevenueUsd].map(esc).join(","));
            }
            break;
        }
        case "forwarders": {
            const rows = await market.getForwarderOpportunities();
            lines.push("forwarder,classification,offers,win_rate,growth_score");
            for (const r of rows) {
                lines.push([r.forwarderName, r.classification, r.offerVolume, r.winRate, r.growthScore].map(esc).join(","));
            }
            break;
        }
        case "recommendations": {
            const rows = await market.getRecommendations();
            lines.push("priority,action,reason,entity");
            for (const r of rows) {
                lines.push([r.priority, r.action, r.reason, r.entityRef].map(esc).join(","));
            }
            break;
        }
        default:
            lines.push("error", esc("unknown_report"));
    }
    await marketAudit(db, "market.export.generated", { reportType });
    return lines.join("\n");
}
//# sourceMappingURL=market-csv.js.map
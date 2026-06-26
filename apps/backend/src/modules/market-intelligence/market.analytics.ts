import type { OpportunityScore } from "@dmx/contracts/market-intelligence";

export function opportunityScore(value: number, max = 100): OpportunityScore {
  const score = Math.max(0, Math.min(max, Math.round(value)));
  const label =
    score >= 85 ? "critical" : score >= 70 ? "high" : score >= 45 ? "medium" : "low";
  return { score, label, factors: [] };
}

export function growthPercent(current: number, prior: number): number {
  if (prior <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

export function classifyForwarder(params: {
  offers: number;
  selections: number;
  revenue: number;
  routes: number;
}): "Underutilized" | "Emerging" | "Core Partner" | "Strategic Partner" {
  if (params.offers === 0) return "Underutilized";
  const win = params.offers > 0 ? params.selections / params.offers : 0;
  if (params.revenue >= 2000 && win >= 0.2 && params.routes >= 3) return "Strategic Partner";
  if (params.selections >= 2 || params.revenue >= 500) return "Core Partner";
  if (params.offers >= 2) return "Emerging";
  return "Underutilized";
}

export function categoryTrend(growthPct: number): "growing" | "declining" | "stable" {
  if (growthPct >= 15) return "growing";
  if (growthPct <= -10) return "declining";
  return "stable";
}

export function supplyGapScore(params: {
  demandRfqs: number;
  supplierQuotes: number;
  suppliersInvited: number;
  conversion: number;
}): number {
  let s = 0;
  s += Math.min(40, params.demandRfqs * 8);
  if (params.suppliersInvited > 0) {
    const participation = params.supplierQuotes / params.suppliersInvited;
    s += Math.min(35, (1 - participation) * 40);
  } else if (params.demandRfqs > 0) s += 35;
  s += Math.min(25, (1 - params.conversion) * 25);
  return Math.min(100, Math.round(s));
}

export function routeOpportunityScore(params: {
  revenue: number;
  margin: number;
  shipments: number;
  demand: number;
  growth: number;
}): number {
  let s = 0;
  s += Math.min(30, params.revenue / 500);
  s += Math.min(25, params.margin / 200);
  s += Math.min(20, params.shipments * 4);
  s += Math.min(15, params.demand * 3);
  s += Math.min(10, Math.max(0, params.growth) / 10);
  return Math.min(100, Math.round(s));
}

export function demandScore(params: {
  rfqs: number;
  orders: number;
  growth: number;
}): number {
  let s = Math.min(50, params.rfqs * 5 + params.orders * 8);
  s += Math.min(30, Math.max(0, params.growth));
  s += params.orders > 0 ? 20 : 0;
  return Math.min(100, Math.round(s));
}

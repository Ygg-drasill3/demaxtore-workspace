import { api } from "@/lib/api";
import type { FreightPortfolio, FreightSummary } from "@dmx/contracts/freightiq";
import type { FreightOpsOverview } from "@dmx/contracts/freightiq";
import type {
  ForwarderContact,
  ForwarderDirectory,
  FreightRequestEmailTemplate,
} from "@dmx/contracts/freight-communications";
import type {
  FreightCommercialMetrics,
  FreightCommercialReport,
} from "@dmx/contracts/freight-commercial";
import type {
  FreightCommercialInsight,
  ForwarderProfitability,
  MarginPolicy,
  MarginPolicySuggestion,
} from "@dmx/contracts/freight-analytics";
import type { FreightShipper, FreightShipperDirectory } from "@dmx/contracts/freight-shippers";

const orderBase = (orderId: string) => `/freightiq/orders/${orderId}`;

export const freightiqApi = {
  myPortfolio: () =>
    api.get<FreightPortfolio>("/freightiq/my-portfolio").then((r) => r.data),

  summary: (orderId: string) =>
    api.get<FreightSummary>(orderBase(orderId)).then((r) => r.data),

  action: (orderId: string, action: string, payload: Record<string, unknown> = {}) =>
    api.post<FreightSummary>(`${orderBase(orderId)}/actions/${action}`, { payload }).then((r) => r.data),

  communicationAction: (orderId: string, action: string, payload: Record<string, unknown> = {}) =>
    api.post<FreightSummary>(`${orderBase(orderId)}/communications/${action}`, { payload }).then((r) => r.data),

  emailTemplate: (orderId: string, requestedReplyDate: string) =>
    api.get<FreightRequestEmailTemplate>(`${orderBase(orderId)}/email-template`, {
      params: { requestedReplyDate },
    }).then((r) => r.data),

  opsOverview: () =>
    api.get<FreightOpsOverview>("/freightiq/operations/overview").then((r) => r.data),

  listForwarders: (q?: string) =>
    api.get<ForwarderDirectory>("/freightiq/forwarders", { params: q ? { q } : {} }).then((r) => r.data),

  createForwarder: (body: Record<string, unknown>) =>
    api.post<ForwarderContact>("/freightiq/forwarders", body).then((r) => r.data),

  updateForwarder: (id: string, body: Record<string, unknown>) =>
    api.patch<ForwarderContact>(`/freightiq/forwarders/${id}`, body).then((r) => r.data),

  deactivateForwarder: (id: string) =>
    api.post<ForwarderContact>(`/freightiq/forwarders/${id}/deactivate`).then((r) => r.data),

  listShippers: (q?: string) =>
    api.get<FreightShipperDirectory>("/freightiq/shippers", { params: q ? { q } : {} }).then((r) => r.data),

  createShipper: (body: { name: string; scacCode?: string; country?: string; notes?: string }) =>
    api.post<FreightShipper>("/freightiq/shippers", body).then((r) => r.data),

  deleteShipper: (id: string) =>
    api.delete(`/freightiq/shippers/${id}`).then((r) => r.data),

  commercialMetrics: () =>
    api.get<FreightCommercialMetrics>("/freightiq/commercial/metrics").then((r) => r.data),

  commercialReport: () =>
    api.get<FreightCommercialReport>("/freightiq/commercial/report").then((r) => r.data),

  commercialInsight: () =>
    api.get<FreightCommercialInsight>("/freightiq/commercial/analytics/insight").then((r) => r.data),

  forwarderScorecard: () =>
    api.get<ForwarderProfitability[]>("/freightiq/commercial/analytics/forwarders/scorecard").then((r) => r.data),

  suggestMargin: (pol: string, pod: string) =>
    api.get<MarginPolicySuggestion>("/freightiq/commercial/analytics/margin/suggest", {
      params: { pol, pod },
    }).then((r) => r.data),

  listMarginPolicies: () =>
    api.get<MarginPolicy[]>("/freightiq/commercial/analytics/margin/policies").then((r) => r.data),

  createMarginPolicy: (body: Record<string, unknown>) =>
    api.post<MarginPolicy>("/freightiq/commercial/analytics/margin/policies", body).then((r) => r.data),

  exportCommercialCsv: (reportType: string) =>
    api.get<string>(`/freightiq/commercial/analytics/export/${reportType}.csv`, {
      responseType: "text",
    }).then((r) => r.data),

  setOfferMargin: (offerId: string, payload: { internalCostUsd: number; freightiqMarginUsd: number }) =>
    api.post(`/freightiq/commercial/offers/${offerId}/margin`, { payload }).then((r) => r.data),
};

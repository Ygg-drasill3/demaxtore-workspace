import { api } from "@/lib/api";
import type {
  AnalyticsExportFormat,
  AnalyticsExportScope,
  AnalyticsTimePreset,
  OperationalAnalyticsSummaryDto,
  SupplierKpiListDto,
} from "@dmx/contracts/operational-analytics";

export type AnalyticsFilterParams = {
  preset?: AnalyticsTimePreset;
  from?: string;
  to?: string;
};

function toQuery(params: AnalyticsFilterParams & Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const analyticsApi = {
  summary: (params: AnalyticsFilterParams = {}) =>
    api
      .get(`/analytics/summary${toQuery(params)}`)
      .then((r) => r.data as OperationalAnalyticsSummaryDto),

  suppliers: (params: AnalyticsFilterParams = {}) =>
    api
      .get(`/analytics/suppliers${toQuery(params)}`)
      .then((r) => r.data as SupplierKpiListDto),

  exportUrl: (
    params: AnalyticsFilterParams & {
      format?: AnalyticsExportFormat;
      scope?: AnalyticsExportScope;
    },
  ) => `/api/analytics/export${toQuery(params)}`,

  downloadExport: async (
    params: AnalyticsFilterParams & {
      format?: AnalyticsExportFormat;
      scope?: AnalyticsExportScope;
    },
  ) => {
    const res = await api.get(`/analytics/export${toQuery(params)}`, {
      responseType: "blob",
    });
    const disposition = String(res.headers["content-disposition"] ?? "");
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] ?? `operational-analytics.${params.format ?? "csv"}`;
    const blob = new Blob([res.data], {
      type: String(res.headers["content-type"] ?? "application/octet-stream"),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

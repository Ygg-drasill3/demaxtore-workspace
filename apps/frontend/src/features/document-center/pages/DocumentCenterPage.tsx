import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, Download, Eye } from "lucide-react";
import type { DocumentCenterQuery, DocumentCenterSource, DocumentCenterStatus } from "@dmx/contracts/document-center";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";
import { downloadAuthenticatedDocument } from "@/lib/authenticated-file";
import { rfqApi } from "@/features/rfq/lib/rfq.api";
import { documentCenterApi } from "../lib/document-center.api";

const STATUSES: DocumentCenterStatus[] = [
  "Missing", "Uploaded", "Under Review", "Approved", "Rejected", "Revision Requested", "Expired",
];

const SOURCES: DocumentCenterSource[] = ["RFQ", "TRADE", "ORDER", "SHIPMENT"];

const STATUS_STYLES: Record<string, string> = {
  Approved: "bg-emerald-50 text-emerald-800",
  "Under Review": "bg-blue-50 text-blue-800",
  Uploaded: "bg-zinc-100 text-zinc-700",
  Rejected: "bg-red-50 text-red-800",
  "Revision Requested": "bg-amber-50 text-amber-800",
  Missing: "bg-orange-50 text-orange-800",
  Expired: "bg-zinc-50 text-zinc-500",
};

function Kpi({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div data-testid={testId} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="font-display text-2xl font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}

export default function DocumentCenterPage() {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DocumentCenterStatus | "">("");
  const [source, setSource] = useState<DocumentCenterSource | "">("");
  const [rfqId, setRfqId] = useState("");
  const [page, setPage] = useState(0);
  const limit = 25;

  const { data: rfqOptions } = useQuery({
    queryKey: ["rfq", "list-for-doc-filter"],
    queryFn: () => rfqApi.list({ limit: 100 }) as Promise<{ items?: Array<{ id: string; externalRef?: string; title?: string }>; workspaces?: Array<{ id: string; externalRef?: string; title?: string }> }>,
  });

  const rfqList = useMemo(() => {
    const raw = rfqOptions?.items ?? rfqOptions?.workspaces ?? (Array.isArray(rfqOptions) ? rfqOptions : []);
    return raw as Array<{ id: string; externalRef?: string; title?: string }>;
  }, [rfqOptions]);

  const params = useMemo((): Partial<DocumentCenterQuery> => ({
    limit,
    offset: page * limit,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
    ...(rfqId ? { rfqId } : {}),
  }), [search, status, source, rfqId, page]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["document-center", params],
    queryFn: () => documentCenterApi.list(params),
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return (
      <div data-testid="document-center-error" className="max-w-3xl mx-auto p-8 text-center">
        <p className="text-red-600">Could not load document center.</p>
        <button type="button" className="dmx-btn-secondary mt-3" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div data-testid="document-center" className="max-w-[1600px] mx-auto space-y-6 pb-10 animate-fade-in">
      <header className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-ink-950 via-[#0f1528] to-ink-800 text-white p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/10 grid place-items-center"><FileText className="h-6 w-6" /></div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">Unified Document Center</div>
            <h1 className="font-display text-3xl font-semibold mt-1">{t("documents.panel.title")}</h1>
          </div>
        </div>
      </header>

      <section data-testid="dc-kpis" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi testId="dc-kpi-total" label="Total Documents" value={data.kpis.totalDocuments} />
        <Kpi testId="dc-kpi-missing" label="Missing" value={data.kpis.missingDocuments} />
        <Kpi testId="dc-kpi-pending" label="Pending Review" value={data.kpis.pendingReview} />
        <Kpi testId="dc-kpi-rejected" label="Rejected" value={data.kpis.rejectedDocuments} />
        <Kpi testId="dc-kpi-approved" label="Approved" value={data.kpis.approvedDocuments} />
        <Kpi testId="dc-kpi-expiring" label="Expiring Soon" value={data.kpis.expiringSoon} />
      </section>

      <section data-testid="dc-filters" className="dmx-card p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            data-testid="dc-search"
            type="search"
            placeholder="Search documents, trade ID, RFQ ref…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full rounded-lg border border-zinc-200 pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          data-testid="dc-filter-source"
          value={source}
          onChange={(e) => { setSource(e.target.value as DocumentCenterSource | ""); setPage(0); if (e.target.value !== "RFQ") setRfqId(""); }}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          aria-label={t("documents.dc.filterSource")}
        >
          <option value="">{t("documents.dc.allSources")}</option>
          {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          data-testid="dc-filter-rfq"
          value={rfqId}
          onChange={(e) => { setRfqId(e.target.value); setPage(0); if (e.target.value) setSource("RFQ"); }}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm min-w-[160px]"
          aria-label={t("documents.dc.filterRfq")}
        >
          <option value="">{t("documents.dc.allRfqs")}</option>
          {rfqList.map((r) => (
            <option key={r.id} value={r.id}>{r.externalRef ?? r.title ?? r.id.slice(0, 8)}</option>
          ))}
        </select>
        <select
          data-testid="dc-filter-status"
          value={status}
          onChange={(e) => { setStatus(e.target.value as DocumentCenterStatus | ""); setPage(0); }}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </section>

      <section className="dmx-card overflow-hidden">
        <div className="overflow-x-auto">
          <table data-testid="dc-table" className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-zinc-500 bg-zinc-50/80">
              <tr>
                <th className="text-left px-4 py-3">Document</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-left px-4 py-3">Entity</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Uploaded</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr><td colSpan={7} data-testid="dc-empty" className="px-4 py-12 text-center text-zinc-500">No documents match your filters.</td></tr>
              ) : (
                data.items.map((row) => (
                  <tr key={row.id} data-testid={`dc-row-${row.id}`} className="border-t border-zinc-100 hover:bg-zinc-50/60">
                    <td className="px-4 py-3">
                      <Link to={`/documents/${encodeURIComponent(row.id)}`} className="font-medium text-accent-900 hover:underline">
                        {row.documentName}
                      </Link>
                      <div className="text-xs text-zinc-500">v{row.version}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{row.category}</td>
                    <td className="px-4 py-3 text-xs">{row.source}</td>
                    <td className="px-4 py-3 text-xs">{row.relatedEntityRef || row.relatedEntityType}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_STYLES[row.status] ?? "bg-zinc-100")}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums">
                      {row.uploadedAt ? new Date(row.uploadedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/documents/${encodeURIComponent(row.id)}`} className="text-xs text-accent-900 hover:underline inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {t("documents.preview")}
                        </Link>
                        {row.downloadUrl && (
                          <button
                            type="button"
                            className="text-xs text-accent-900 hover:underline inline-flex items-center gap-1"
                            onClick={() => void downloadAuthenticatedDocument(row.downloadUrl!, row.documentName)}
                          >
                            <Download className="h-3 w-3" /> {t("documents.download")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data.total > limit && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-zinc-100 text-sm">
            <span className="text-zinc-500">{data.total} documents</span>
            <div className="flex gap-2">
              <button type="button" className="dmx-btn-secondary text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button type="button" className="dmx-btn-secondary text-xs" disabled={(page + 1) * limit >= data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

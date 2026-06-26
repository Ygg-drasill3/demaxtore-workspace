// apps/frontend/src/features/rfq/pages/RfqListPage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useRfqList, rfqQueryKeys } from "../hooks";
import { rfqApi } from "../lib/rfq.api";
import { useAuth } from "@/store/auth.store";
import { RfqStateBadge } from "../components/RfqStateBadge";
import { Plus, Search, FileText, Trash2, RotateCcw, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useT } from "@/i18n/useT";
import { toast } from "@/store/toast.store";
import { cn } from "@/lib/utils";

const STATE_FILTERS = ["ALL","RFQ_DRAFT","RFQ_SUBMITTED","SUPPLIERS_ASSIGNED","RFQ_OPEN","QUOTATIONS_CLOSED","UNDER_EVALUATION","SUPPLIER_SELECTED","PROFORMA_REQUESTED","PROFORMA_APPROVED","PO_ISSUED","CLOSED","CANCELLED","EXPIRED","CLOSED_NO_AWARD"];

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatActivity(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatShortDate(iso);
}

function deadlineTone(deadlineAt: string | null | undefined): string {
  if (!deadlineAt) return "text-zinc-500";
  const days = (new Date(deadlineAt).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "text-red-600 font-medium";
  if (days <= 3) return "text-amber-700 font-medium";
  return "text-zinc-600";
}

export default function RfqListPage() {
  const { t } = useT();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const isBuyer = user?.role === "BUYER";
  const isSupplier = user?.role === "SUPPLIER";
  const isSalesControl = user?.role === "SALES_CONTROL";
  const isAdmin = user?.role === "ADMIN";
  const [state, setState] = useState<string>("ALL");
  const [view, setView] = useState<"active" | "trash">("active");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"newest"|"oldest"|"deadline">("newest");
  const isFiltered = state !== "ALL" || !!q.trim();
  const listView = isAdmin ? view : "active";
  const { data, isLoading, isError, refetch } = useRfqList({
    state: state === "ALL" ? undefined : state,
    q: q || undefined,
    sort,
    view: listView,
  });
  const rows: any[] = data?.items ?? data ?? [];

  const refreshLists = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["rfq", "list"] }),
      qc.invalidateQueries({ queryKey: ["rfq"] }),
    ]);
  };

  const handleTrash = async (id: string, title: string) => {
    if (!window.confirm(`Move "${title}" to trash?`)) return;
    await rfqApi.moveToTrash(id);
    toast.success("RFQ moved to trash");
    await refreshLists();
  };

  const handleRestore = async (id: string) => {
    await rfqApi.restore(id);
    toast.success("RFQ restored");
    await refreshLists();
  };

  return (
    <div data-testid="rfq-list-page" className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">{t("rfq.list.eyebrow")}</span>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">{t("rfq.list.title")}</h1>
        </div>
        {isBuyer && (
          <Link to="/buyer/rfq/new" data-testid="rfq-list-create-btn" className="dmx-btn-primary">
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            {t("rfq.list.create")}
          </Link>
        )}
      </header>

      {isError && (
        <div className="dmx-card p-4 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{t("rfq.list.error")}</span>
          <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>{t("common.retry")}</button>
        </div>
      )}

      <div className="dmx-card p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input data-testid="rfq-list-search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={t("rfq.list.search")} className="h-10 w-full pl-9 pr-3 rounded-md border border-zinc-200 text-sm" />
        </div>
        <select data-testid="rfq-list-state-filter" value={state} onChange={(e) => setState(e.target.value)}
          className="h-10 px-3 rounded-md border border-zinc-200 text-sm">
          {STATE_FILTERS.map(s => <option key={s} value={s}>{s === "ALL" ? t("common.all") : s.replace(/_/g," ")}</option>)}
        </select>
        <select data-testid="rfq-list-sort" value={sort} onChange={(e) => setSort(e.target.value as any)}
          className="h-10 px-3 rounded-md border border-zinc-200 text-sm">
          <option value="newest">{t("rfq.list.sort.newest")}</option>
          <option value="oldest">{t("rfq.list.sort.oldest")}</option>
          <option value="deadline">{t("rfq.list.sort.deadline")}</option>
        </select>
        {isAdmin ? (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className={`h-10 rounded-md border px-3 text-sm ${view === "active" ? "border-accent-900 bg-accent-50 text-accent-900" : "border-zinc-200"}`}
              onClick={() => setView("active")}
            >
              Active
            </button>
            <button
              type="button"
              data-testid="rfq-list-trash-toggle"
              className={`h-10 rounded-md border px-3 text-sm ${view === "trash" ? "border-accent-900 bg-accent-50 text-accent-900" : "border-zinc-200"}`}
              onClick={() => setView("trash")}
            >
              Trash
            </button>
          </div>
        ) : null}
      </div>

      {!isLoading && rows.length === 0 ? (
        <EmptyState
          testId="rfq-list-empty"
          icon={<FileText className="h-5 w-5" />}
          title={isFiltered ? t("rfq.list.empty.filtered.title") : t("rfq.list.empty.title")}
          body={
            isFiltered
              ? t("rfq.list.empty.filtered.body")
              : isSupplier
                ? t("rfq.list.empty.supplier")
                : isSalesControl
                  ? t("salesControl.rfqEmpty")
                  : t("rfq.list.empty.buyer")
          }
          action={
            isFiltered ? (
              <button type="button" className="dmx-btn-secondary text-sm" onClick={() => { setQ(""); setState("ALL"); }}>
                {t("rfq.list.empty.clearFilters")}
              </button>
            ) : isBuyer ? (
              <Link to="/buyer/rfq/new" className="dmx-btn-primary text-sm">{t("rfq.list.empty.create")}</Link>
            ) : undefined
          }
        />
      ) : (
      <div className="dmx-card overflow-hidden">
        <div className="overflow-x-auto dmx-thin-scroll">
          <table className="w-full min-w-[720px] text-sm table-fixed">
            <colgroup>
              <col className="w-[38%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-zinc-50/90 text-[11px] uppercase tracking-[0.08em] text-zinc-500 border-b border-zinc-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">{t("rfq.list.table.title")}</th>
                <th className="text-left px-4 py-3 font-semibold">{t("rfq.list.table.state")}</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">{t("rfq.list.table.deadline")}</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">{t("rfq.list.table.activity")}</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">{t("rfq.list.table.created")}</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-zinc-500">
                  {t("common.loading")}
                </td>
              </tr>
            ) : rows.map((r) => {
              const meta = [
                r.productCategory,
                r.currency,
                r.lineItemCount != null ? `${r.lineItemCount} ${t("rfq.list.table.items").toLowerCase()}` : null,
              ].filter(Boolean).join(" · ");

              return (
              <tr
                key={r.id}
                data-testid={`rfq-list-row-${r.id}`}
                className="group transition-colors hover:bg-zinc-50/80"
              >
                <td className="px-5 py-3.5 align-middle">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="shrink-0 mt-0.5 inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 font-mono text-[11px] font-medium text-zinc-700 whitespace-nowrap"
                      title={r.externalRef}
                    >
                      {r.externalRef}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/workspace/rfq/${r.id}`}
                        className="block font-medium text-zinc-900 truncate group-hover:text-accent-900 transition-colors"
                        title={r.title}
                        onMouseEnter={() => {
                          void qc.prefetchQuery({
                            queryKey: rfqQueryKeys.one(r.id),
                            queryFn: () => rfqApi.get(r.id),
                          });
                        }}
                      >
                        {r.title}
                      </Link>
                      {meta ? (
                        <p className="mt-0.5 text-xs text-zinc-500 truncate" title={meta}>{meta}</p>
                      ) : null}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500 sm:hidden">
                        {r.deadlineAt ? (
                          <span className={deadlineTone(r.deadlineAt)}>
                            Due {formatShortDate(r.deadlineAt)}
                          </span>
                        ) : null}
                        <span title={new Date(r.lastActivityAt).toLocaleString()}>
                          {formatActivity(r.lastActivityAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                  <RfqStateBadge state={r.state} />
                </td>
                <td className={cn("px-4 py-3.5 align-middle whitespace-nowrap tabular-nums hidden sm:table-cell", deadlineTone(r.deadlineAt))}>
                  {r.deadlineAt ? formatShortDate(r.deadlineAt) : "—"}
                </td>
                <td
                  className="px-4 py-3.5 align-middle whitespace-nowrap text-zinc-500 hidden md:table-cell"
                  title={new Date(r.lastActivityAt).toLocaleString()}
                >
                  {formatActivity(r.lastActivityAt)}
                </td>
                <td className="px-4 py-3.5 align-middle whitespace-nowrap text-zinc-500 tabular-nums hidden lg:table-cell">
                  {formatShortDate(r.createdAt)}
                </td>
                <td className="px-5 py-3.5 align-middle">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/workspace/rfq/${r.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent-900 hover:bg-accent-50 opacity-0 group-hover:opacity-100 focus:opacity-100 sm:opacity-100 transition-opacity"
                    >
                      Open
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    {isAdmin ? (
                      view === "trash" ? (
                        <button
                          type="button"
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                          onClick={() => void handleRestore(r.id)}
                          title="Restore RFQ"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          onClick={() => void handleTrash(r.id, r.title)}
                          title="Move RFQ to trash"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )
                    ) : null}
                  </div>
                </td>
              </tr>
            );
            })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

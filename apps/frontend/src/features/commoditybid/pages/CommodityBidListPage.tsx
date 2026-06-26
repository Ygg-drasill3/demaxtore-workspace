import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, ExternalLink, Gavel } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { commoditybidApi } from "../lib/commoditybid.api";
import { useAuth } from "@/store/auth.store";
import { useT } from "@/i18n/useT";

type CbRow = {
  id: string;
  externalRef: string;
  title: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  auctionStartsAt: string | null;
  auctionEndsAt: string | null;
  invitationCount: number;
};

const STATE_FILTERS = [
  "ALL", "BID_DRAFT", "SCHEDULED", "INVITING_SUPPLIERS", "READY_TO_START", "LIVE", "CLOSED",
  "WINNER_IDENTIFIED", "AWAITING_BUYER_APPROVAL", "APPROVED", "ORDERS_SPAWNED", "CANCELLED",
];

export default function CommodityBidListPage() {
  const { t } = useT();
  const user = useAuth((s) => s.user);
  const location = useLocation();
  const rolePrefix = location.pathname.split("/")[1] ?? "buyer";
  const isBuyer = user?.role === "BUYER";
  const [state, setState] = useState("ALL");
  const [q, setQ] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["commoditybid-list", state],
    queryFn: () => commoditybidApi.list({
      limit: 50,
      ...(state !== "ALL" ? { state } : {}),
    }),
  });

  const rows = ((data?.items ?? []) as CbRow[]).filter((r) => {
    if (!q.trim()) return true;
    const hay = `${r.externalRef} ${r.title} ${r.state}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const isFiltered = state !== "ALL" || !!q.trim();
  const panelPath = `/${rolePrefix}/commoditybid/panel`;
  const createPath = isBuyer ? "/buyer/commoditybid/new" : `/${rolePrefix}/commoditybid/new`;

  return (
    <div data-testid="commoditybid-list-page" className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">{t("cb.list.eyebrow")}</span>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">{t("cb.list.title")}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t("cb.list.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={panelPath} className="dmx-btn-secondary text-sm" data-testid="cb-list-external-panel">
            <ExternalLink className="h-4 w-4" /> {t("cb.list.external")}
          </Link>
          {isBuyer && (
            <Link to={createPath} data-testid="cb-list-create-btn" className="dmx-btn-primary">
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              {t("cb.list.create")}
            </Link>
          )}
        </div>
      </header>

      {isError && (
        <div className="dmx-card p-4 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{t("cb.list.error")}</span>
          <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>{t("common.retry")}</button>
        </div>
      )}

      <div className="dmx-card p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            data-testid="cb-list-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("cb.list.search")}
            className="h-10 w-full pl-9 pr-3 rounded-md border border-zinc-200 text-sm"
          />
        </div>
        <select
          data-testid="cb-list-state-filter"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="h-10 px-3 rounded-md border border-zinc-200 text-sm"
        >
          {STATE_FILTERS.map((s) => (
            <option key={s} value={s}>{s === "ALL" ? t("cb.list.filter.all") : s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {!isLoading && rows.length === 0 ? (
        <EmptyState
          testId="cb-list-empty"
          icon={<Gavel className="h-5 w-5" />}
          title={isFiltered ? t("cb.list.empty.filtered") : t("cb.list.empty.title")}
          body={
            isFiltered
              ? t("cb.list.empty.filtered.body")
              : isBuyer
                ? t("cb.list.empty.buyer")
                : t("cb.list.empty.supplier")
          }
          action={
            isFiltered ? (
              <button type="button" className="dmx-btn-secondary text-sm" onClick={() => { setQ(""); setState("ALL"); }}>
                {t("cb.list.empty.clear")}
              </button>
            ) : isBuyer ? (
              <Link to={createPath} className="dmx-btn-primary text-sm">{t("cb.list.create")}</Link>
            ) : undefined
          }
        />
      ) : (
      <div className="dmx-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3">{t("cb.list.table.ref")}</th>
              <th className="text-left px-4 py-3">{t("cb.list.table.title")}</th>
              <th className="text-left px-4 py-3">{t("cb.list.table.state")}</th>
              <th className="text-left px-4 py-3">{t("cb.list.table.window")}</th>
              <th className="text-left px-4 py-3">{t("cb.list.table.invitations")}</th>
              <th className="text-left px-4 py-3">{t("cb.list.table.updated")}</th>
              <th className="text-right px-4 py-3">{t("cb.list.table.action")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500">{t("common.loading")}</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} data-testid={`cb-list-row-${r.id}`} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                <td className="px-4 py-3 font-mono text-xs">{r.externalRef}</td>
                <td className="px-4 py-3">
                  <Link to={`/workspace/commoditybid/${r.id}`} className="text-zinc-900 font-medium hover:underline">
                    {r.title || t("cb.list.untitled")}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.state.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {r.auctionStartsAt
                    ? `${new Date(r.auctionStartsAt).toLocaleString()} – ${r.auctionEndsAt ? new Date(r.auctionEndsAt).toLocaleString() : "—"}`
                    : "—"}
                </td>
                <td className="px-4 py-3 tabular-nums">{r.invitationCount}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(r.updatedAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/workspace/commoditybid/${r.id}`}
                    data-testid={`cb-open-${r.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-900 hover:underline"
                  >
                    {t("cb.list.openWorkspace")} <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

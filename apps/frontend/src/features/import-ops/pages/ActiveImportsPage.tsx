import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, PackageSearch, Search } from "lucide-react";
import { useT } from "@/i18n/useT";
import { shipmentPortfolioApi } from "@/features/shipment/lib/shipment-portfolio.api";
import { customsApi } from "@/features/customs/lib/customs.api";
import { inlandApi } from "@/features/inland/lib/inland.api";
import { toCustomerStage, customerStatusLabel } from "@dmx/contracts/turkey-import-stage";

/** Turkey Importer — My Imports portfolio. Unified from existing shipment/customs/inland APIs. */
const FILTERS = [
  { id: "all", label: "All" },
  { id: "action", label: "Action required" },
  { id: "transit", label: "In transit" },
  { id: "customs", label: "In customs" },
  { id: "delivery", label: "In delivery" },
  { id: "completed", label: "Completed" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

export default function ActiveImportsPage() {
  const { t } = useT();
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");

  const { data: portfolio, isLoading: shipLoading } = useQuery({
    queryKey: ["shipment-portfolio", "active-imports"],
    queryFn: () => shipmentPortfolioApi.getPortfolio({ limit: 50 }),
  });
  const { data: customs } = useQuery({
    queryKey: ["customs", "list", "active-imports"],
    queryFn: () => customsApi.list({ page: 1, pageSize: 50 }),
  });
  const { data: inland } = useQuery({
    queryKey: ["inland", "list", "active-imports"],
    queryFn: () => inlandApi.list({ page: 1, pageSize: 50 }),
  });

  const shipments = portfolio?.items ?? [];
  const customsByShipment = new Map(
    (customs?.items ?? []).map((c) => [c.shipmentWorkspaceId, c]),
  );
  const inlandByShipment = new Map(
    (inland?.items ?? []).map((d) => [d.shipmentWorkspaceId, d]),
  );

  const rows = useMemo(() => {
    return shipments.map((s) => {
      const cc = customsByShipment.get(s.shipmentId);
      const inlandDel = inlandByShipment.get(s.shipmentId);
      const stage = toCustomerStage({
        shipmentState: s.fsmState,
        customsStatus: cc?.status,
        inlandStatus: inlandDel?.status,
        hasOpenException: (s.exceptionCount ?? 0) > 0,
      });
      return { s, cc, inlandDel, stage };
    });
  }, [shipments, customs, inland]);

  const filtered = rows.filter(({ s, stage }) => {
    if (search && !`${s.shipmentNumber} ${s.supplierName} ${s.origin} ${s.destination}`.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    switch (filter) {
      case "action": return stage.actionRequired;
      case "transit": return stage.stage === "In Transit";
      case "customs": return stage.stage === "Customs";
      case "delivery": return stage.stage === "Delivery";
      case "completed": return stage.stage === "Completed";
      default: return true;
    }
  });

  return (
    <div data-testid="active-imports-page" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{t("s43.imports.eyebrow", "Import Operations")}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("s43.imports.title", "My imports")}</h1>
          <p className="text-sm text-zinc-600 mt-1 max-w-2xl">
            {t("s43.imports.subtitle", "Freight, customs, delivery and landed cost for every import — in one place.")}
          </p>
        </div>
        <Link to="/buyer/imports/new" data-testid="active-imports-start-new" className="dmx-btn-primary inline-flex items-center gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          {t("s43.imports.startNew", "Start import")}
        </Link>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5" data-testid="active-imports-filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              data-testid={`active-imports-filter-${f.id}`}
              onClick={() => setFilter(f.id)}
              className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                filter === f.id ? "bg-ink-900 text-white border-ink-900" : "bg-white text-zinc-600 border-paper-200 hover:border-paper-300"
              }`}
            >
              {t(`s43.imports.filter.${f.id}`, f.label)}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            data-testid="active-imports-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("s43.imports.search", "Search supplier or import")}
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-accent-900/20 w-full sm:w-64"
          />
        </div>
      </div>

      {shipLoading && <p className="text-sm text-zinc-500">{t("common.loading", "Loading…")}</p>}

      {!shipLoading && filtered.length === 0 && (
        <div className="dmx-card p-10 text-center space-y-4" data-testid="active-imports-empty">
          <PackageSearch className="h-10 w-10 text-zinc-300 mx-auto" />
          <p className="text-sm text-zinc-600">{t("s43.imports.empty", "No imports match. Start an import to request freight and track customs.")}</p>
          <Link to="/buyer/imports/new" className="dmx-btn-primary inline-flex">{t("s43.imports.startNew", "Start import")}</Link>
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="space-y-4" data-testid="active-imports-list">
          {filtered.map(({ s, cc, inlandDel, stage }) => (
            <li key={s.shipmentId} className="dmx-card p-5 space-y-4" data-testid={`active-import-${s.shipmentId}`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold text-ink-900 truncate">{s.shipmentNumber}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    {s.origin && s.destination ? `${s.origin} → ${s.destination}` : "—"}
                    {s.supplierName ? ` · ${s.supplierName}` : ""}
                  </p>
                </div>
                <span
                  data-testid={`active-import-stage-${s.shipmentId}`}
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium shrink-0 ${
                    stage.actionRequired ? "bg-red-50 text-red-700" : "bg-paper-100 text-ink-800"
                  }`}
                >
                  {customerStatusLabel({
                    shipmentState: s.fsmState,
                    customsStatus: cc?.status,
                    inlandStatus: inlandDel?.status,
                    hasOpenException: (s.exceptionCount ?? 0) > 0,
                  })}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <StageChip label={t("s43.imports.stageEta", "ETA")} value={s.eta ? new Date(s.eta).toLocaleDateString() : "—"} />
                <StageChip label={t("s43.imports.stageCustoms", "Customs")} value={cc?.status?.replace(/_/g, " ") ?? t("s43.imports.notStarted", "Not started")} />
                <StageChip label={t("s43.imports.stageDelivery", "Delivery")} value={inlandDel?.status?.replace(/_/g, " ") ?? t("s43.imports.notStarted", "Not started")} />
                <StageChip label={t("s43.imports.stageNext", "Next")} value={nextActionLabel(stage.stage, cc?.status, inlandDel?.status, t)} />
              </div>

              <div className="flex flex-wrap gap-4 pt-1 border-t border-paper-100">
                <Link
                  to={`/buyer/imports/${s.shipmentId}`}
                  className="text-sm font-medium text-accent-900 hover:underline"
                  data-testid={`active-import-open-${s.shipmentId}`}
                >
                  {t("s43.imports.openImport", "Open import")} →
                </Link>
                {(s.exceptionCount ?? 0) > 0 && (
                  <span className="text-xs text-red-600 font-medium self-center" data-testid={`active-import-exception-${s.shipmentId}`}>
                    {t("s43.imports.attention", "Needs attention")}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StageChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-paper-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="font-medium text-ink-800 mt-0.5 capitalize truncate">{value.toLowerCase()}</p>
    </div>
  );
}

function nextActionLabel(
  stage: string,
  customsStatus: string | undefined,
  inlandStatus: string | undefined,
  t: (key: string, fallback?: string) => string,
): string {
  if (stage === "Customs" && !customsStatus) return t("s43.imports.nextCustoms", "Request customs");
  if (customsStatus === "CLEARED" && !inlandStatus) return t("s43.imports.nextDelivery", "Arrange delivery");
  if (customsStatus && customsStatus !== "CLEARED" && customsStatus !== "CANCELLED") return t("s43.imports.nextDocs", "Documents / readiness");
  if (stage === "Completed") return t("s43.imports.nextDone", "Completed");
  return t("s43.imports.nextTrack", "Track progress");
}

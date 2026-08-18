import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, PackageSearch } from "lucide-react";
import { useT } from "@/i18n/useT";
import { shipmentPortfolioApi } from "@/features/shipment/lib/shipment-portfolio.api";
import { customsApi } from "@/features/customs/lib/customs.api";
import { inlandApi } from "@/features/inland/lib/inland.api";

/** Sprint 43 — unified active import view from existing shipment/customs/inland APIs. */
export default function ActiveImportsPage() {
  const { t } = useT();

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

  return (
    <div
      data-testid="active-imports-page"
      className="max-w-[1200px] mx-auto space-y-6 animate-fade-in pb-10"
    >
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {t("s43.imports.eyebrow", "Import Operations")}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t("s43.imports.title", "My imports")}
          </h1>
          <p className="text-sm text-zinc-600 mt-1 max-w-2xl">
            {t(
              "s43.imports.subtitle",
              "Track freight, customs, delivery, and landed cost for each shipment in one place.",
            )}
          </p>
        </div>
        <Link
          to="/buyer/imports/new"
          data-testid="active-imports-start-new"
          className="dmx-btn-primary inline-flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          {t("s43.imports.startNew", "Start import")}
        </Link>
      </header>

      {shipLoading && (
        <p className="text-sm text-zinc-500">{t("common.loading", "Loading…")}</p>
      )}

      {!shipLoading && shipments.length === 0 && (
        <div className="dmx-card p-10 text-center space-y-4" data-testid="active-imports-empty">
          <PackageSearch className="h-10 w-10 text-zinc-300 mx-auto" />
          <p className="text-sm text-zinc-600">
            {t("s43.imports.empty", "No active shipments yet. Start an import to request freight and track customs.")}
          </p>
          <Link to="/buyer/imports/new" className="dmx-btn-primary inline-flex">
            {t("s43.imports.startNew", "Start import")}
          </Link>
        </div>
      )}

      {shipments.length > 0 && (
        <ul className="space-y-4" data-testid="active-imports-list">
          {shipments.map((s) => {
            const cc = customsByShipment.get(s.shipmentId);
            const inlandDel = inlandByShipment.get(s.shipmentId);
            const stage = resolveStage(s.fsmState, cc?.status, inlandDel?.status);
            return (
              <li key={s.shipmentId} className="dmx-card p-5 space-y-4" data-testid={`active-import-${s.shipmentId}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-ink-900">
                      {s.shipmentNumber}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {s.origin && s.destination ? `${s.origin} → ${s.destination}` : "—"}
                      {s.supplierName ? ` · ${s.supplierName}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-paper-100 px-3 py-1 text-xs font-medium text-ink-800">
                    {stage}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <StageChip label={t("s43.imports.stageFreight", "Freight")} value={s.fsmState.replace(/_/g, " ")} />
                  <StageChip
                    label={t("s43.imports.stageCustoms", "Customs")}
                    value={cc?.status?.replace(/_/g, " ") ?? t("s43.imports.notStarted", "Not started")}
                  />
                  <StageChip
                    label={t("s43.imports.stageDelivery", "Delivery")}
                    value={inlandDel?.status?.replace(/_/g, " ") ?? t("s43.imports.notStarted", "Not started")}
                  />
                  <StageChip
                    label={t("s43.imports.stageNext", "Next")}
                    value={nextActionLabel(s.fsmState, cc?.status, inlandDel?.status, t)}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1 border-t border-paper-100">
                  <Link
                    to={`/workspace/shipment/${s.shipmentId}`}
                    className="text-sm font-medium text-accent-900 hover:underline"
                    data-testid={`active-import-open-${s.shipmentId}`}
                  >
                    {t("s43.imports.openShipment", "Open shipment")} →
                  </Link>
                  {cc && (
                    <Link
                      to={`/buyer/customs/${cc.id}`}
                      className="text-sm text-zinc-600 hover:underline"
                    >
                      {t("s43.imports.viewCustoms", "Customs")}
                    </Link>
                  )}
                  {inlandDel && (
                    <Link
                      to={`/buyer/inland/${inlandDel.id}`}
                      className="text-sm text-zinc-600 hover:underline"
                    >
                      {t("s43.imports.viewDelivery", "Delivery")}
                    </Link>
                  )}
                  <Link
                    to={`/buyer/landed-cost`}
                    className="text-sm text-zinc-600 hover:underline"
                  >
                    {t("s43.imports.landedCost", "Landed cost")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StageChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-paper-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="font-medium text-ink-800 mt-0.5 capitalize">{value.toLowerCase()}</p>
    </div>
  );
}

function resolveStage(
  shipmentState: string,
  customsStatus?: string,
  inlandStatus?: string,
): string {
  if (inlandStatus === "DELIVERED" || shipmentState === "COMPLETED") return "Completed";
  if (inlandStatus && inlandStatus !== "CANCELLED") return "In delivery";
  if (customsStatus === "CLEARED") return "Customs cleared";
  if (customsStatus && customsStatus !== "CANCELLED") return "In customs";
  if (["IN_TRANSIT", "LOADED_ON_VESSEL", "DEPARTED_ORIGIN_PORT", "ARRIVED_DESTINATION_PORT"].includes(shipmentState)) {
    return "In transit";
  }
  return "Freight / booking";
}

function nextActionLabel(
  shipmentState: string,
  customsStatus: string | undefined,
  inlandStatus: string | undefined,
  t: (key: string, fallback?: string) => string,
): string {
  if (!customsStatus && ["ARRIVED_DESTINATION_PORT", "IN_TRANSIT"].includes(shipmentState)) {
    return t("s43.imports.nextCustoms", "Request customs");
  }
  if (customsStatus === "CLEARED" && !inlandStatus) {
    return t("s43.imports.nextDelivery", "Arrange delivery");
  }
  if (customsStatus && customsStatus !== "CLEARED" && customsStatus !== "CANCELLED") {
    return t("s43.imports.nextDocs", "Documents / readiness");
  }
  return t("s43.imports.nextTrack", "Track progress");
}

// Sprint 10A.2 — Buyer Command Center Dashboard
// Turkey Importer branch = simplified customer command center (spec §7):
// 5-KPI strip + Attention Required + Active Imports. International branch unchanged.
import { Link } from "react-router-dom";
import { useMemo, type ReactNode } from "react";
import { useAuth } from "@/store/auth.store";
import { useT } from "@/i18n/useT";
import { isTurkeyImporterOperatingModel } from "@dmx/contracts/buyer-operating-model";
import { useBuyerCommandCenter } from "../hooks/useBuyerCommandCenter";
import { useBuyerDashboardQuick } from "../hooks/useBuyerDashboardQuick";
import { useDashboardShipments } from "../hooks/useDashboardShipments";
import { BuyerDashboardHero } from "../components/command-center/BuyerDashboardHero";
import { ImportExecutionKpiRow } from "../components/command-center/ImportExecutionKpiRow";
import { ActiveImportsWidget } from "../components/command-center/ActiveImportsWidget";
import { KpiRow } from "../components/command-center/KpiRow";
import { BookingKpiRow } from "../components/command-center/BookingKpiRow";
import { TimelineKpiRow } from "../components/command-center/TimelineKpiRow";
import { ActionInbox } from "../components/command-center/ActionInbox";
import { ActiveTradesTable } from "../components/command-center/ActiveTradesTable";
import { LiveAuctionsWidget } from "../components/command-center/LiveAuctionsWidget";
import { MyShipmentsWidget } from "../components/command-center/MyShipmentsWidget";
import { MyExceptionsWidget } from "../components/command-center/MyExceptionsWidget";
import { DocumentStatusWidget } from "../components/command-center/DocumentStatusWidget";
import { CommunicationCenter } from "../components/command-center/CommunicationCenter";
import { UpcomingEventsWidget } from "../components/command-center/UpcomingEventsWidget";
import { OnboardingSection } from "../components/command-center/OnboardingSection";
import { TradePipelineSnippet } from "../components/command-center/TradePipelineSnippet";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{children}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-paper-200 to-transparent" />
    </div>
  );
}

export default function BuyerDashboardPage() {
  const { t } = useT();
  const user = useAuth((s) => s.user);
  const turkey = isTurkeyImporterOperatingModel(user?.buyerOperatingModel);
  const { data, isLoading, isError, refetch } = useBuyerCommandCenter();
  const { data: quick, isLoading: quickLoading } = useBuyerDashboardQuick();
  const shipments = useDashboardShipments();
  const firstName = user?.displayName?.split(" ")[0] ?? "Buyer";

  // The quick fetch cannot compute shipments / messages / actions and reports 0
  // for them. Take those three from the sources that actually own the data so a
  // counter can never contradict the list rendered underneath it.
  const kpis = useMemo(() => {
    const base = quick?.kpis ?? data?.kpis;
    if (!base) return undefined;
    return {
      ...base,
      shipmentsInTransit: shipments.inTransitCount,
      unreadMessages: data?.kpis?.unreadMessages ?? base.unreadMessages,
      pendingActions: data?.requiredActions?.length ?? base.pendingActions,
    };
  }, [quick?.kpis, data?.kpis, data?.requiredActions, shipments.inTransitCount]);

  const timelineKpis = quick?.timelineKpis ?? data?.timelineKpis;
  const mode = quick?.mode ?? data?.mode ?? "standard";
  const kpiLoading = quickLoading && !quick;

  return (
    <div
      data-testid="buyer-dashboard"
      data-dashboard-mode={mode}
      data-buyer-operating-model={turkey ? "TURKEY_IMPORTER" : "INTERNATIONAL"}
      className="max-w-[1400px] mx-auto space-y-7 animate-fade-in"
    >
      <BuyerDashboardHero
        firstName={firstName}
        mode={mode}
        kpis={kpis}
        loading={kpiLoading}
        buyerOperatingModel={user?.buyerOperatingModel}
      />

      {isError && (
        <div data-testid="buyer-dashboard-error" className="dmx-card p-4 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{t("dash.buyer.error.load")}</span>
          <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>{t("common.retry")}</button>
        </div>
      )}

      {turkey ? (
        <>
          {/* Command center — 5 primary import KPIs (spec §7). */}
          <div className="space-y-4">
            <SectionLabel>{t("s43.dashboard.section.importOps", "Import operations")}</SectionLabel>
            <ImportExecutionKpiRow
              kpis={kpis}
              timelineKpis={timelineKpis}
              activeImports={shipments.isLoading ? undefined : shipments.active.length}
              loading={kpiLoading}
              max={5}
            />
          </div>

          {/* Attention required — prioritized real actions. */}
          <ActionInbox actions={data?.requiredActions} loading={isLoading} />

          {/* Active imports — open the Import Workspace directly. */}
          <ActiveImportsWidget />
        </>
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionLabel>{t("dash.buyer.section.overview")}</SectionLabel>
              <Link
                to="/buyer/control-tower"
                data-testid="buyer-control-tower-link"
                className="shrink-0 text-sm font-medium text-accent-900 hover:underline"
              >
                {t("dash.buyer.openControlTower", "Open Control Tower →")}
              </Link>
            </div>
            <KpiRow kpis={kpis} loading={kpiLoading} />
            <TimelineKpiRow kpis={timelineKpis} loading={kpiLoading} />
            <BookingKpiRow kpis={kpis} loading={kpiLoading} />
          </div>

          <TradePipelineSnippet topTrade={data?.activeTrades?.[0]} />

          <ActionInbox actions={data?.requiredActions} loading={isLoading} />

          <ActiveTradesTable rows={data?.activeTrades} loading={isLoading} />

          <div className="space-y-4">
            <SectionLabel>{t("dash.buyer.section.operations")}</SectionLabel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <LiveAuctionsWidget rows={data?.liveAuctions} loading={isLoading} />
              <MyShipmentsWidget />
            </div>
            <MyExceptionsWidget />
          </div>

          <div className="space-y-4">
            <SectionLabel>{t("dash.buyer.section.monitoring")}</SectionLabel>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <DocumentStatusWidget rows={data?.documents} loading={isLoading} />
              <CommunicationCenter rows={data?.communications} loading={isLoading} />
              <UpcomingEventsWidget events={data?.upcomingEvents} loading={isLoading} />
            </div>
          </div>
        </>
      )}

      <OnboardingSection
        mode={data?.mode ?? "standard"}
        buyerOperatingModel={user?.buyerOperatingModel}
      />
    </div>
  );
}

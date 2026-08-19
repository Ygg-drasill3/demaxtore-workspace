// Sprint 10C — Operations Command Center Dashboard
import { Link } from "react-router-dom";
import { useAuth } from "@/store/auth.store";
import { useT } from "@/i18n/useT";
import { useOperationsCommandCenter } from "../hooks/useOperationsCommandCenter";
import { OperationsKpiRow } from "../components/operations-command-center/OperationsKpiRow";
import { OperationsActionInbox } from "../components/operations-command-center/OperationsActionInbox";
import { TradeOperationsBoard } from "../components/operations-command-center/TradeOperationsBoard";
import { AuctionMonitor } from "../components/operations-command-center/AuctionMonitor";
import { FreightIqPanel } from "../components/operations-command-center/FreightIqPanel";
import { OperationsShipmentCenter } from "../components/operations-command-center/OperationsShipmentCenter";
import { DocumentControlCenter } from "../components/operations-command-center/DocumentControlCenter";
import { CommunicationMonitor } from "../components/operations-command-center/CommunicationMonitor";
import { ControlTowerPanel } from "../components/operations-command-center/ControlTowerPanel";
import { RevenuePanel } from "../components/operations-command-center/RevenuePanel";
import { TeamWorkloadPanel } from "../components/operations-command-center/TeamWorkloadPanel";
import { OperationsUpcomingEvents } from "../components/operations-command-center/OperationsUpcomingEvents";
import { PendingPhoneVerificationsWidget } from "../components/operations-command-center/PendingPhoneVerificationsWidget";

export default function AdminDashboardPage() {
  const { t } = useT();
  const user = useAuth((s) => s.user);
  const { data, isLoading } = useOperationsCommandCenter();
  const firstName = user?.displayName?.split(" ")[0] ?? "Operator";

  return (
    <div
      data-testid="operations-command-center"
      data-dashboard-mode={data?.mode ?? "executive"}
      className="max-w-[1400px] mx-auto space-y-6 animate-fade-in"
    >
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="dmx-eyebrow text-zinc-500">{t("dash.admin.eyebrow")}</span>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">
            {t("dash.supplier.hello", undefined, { name: firstName })}
          </h1>
          <p className="text-sm text-zinc-500 mt-1.5">
            {t("dash.admin.subtitle")}
          </p>
        </div>
        <Link to="/operations" data-testid="oc-open-control-tower" className="dmx-btn-secondary text-sm">
          {t("dash.admin.fullTower")}
        </Link>
      </header>

      <OperationsKpiRow kpis={data?.kpis} loading={isLoading} />
      <PendingPhoneVerificationsWidget />
      <OperationsActionInbox actions={data?.actions} loading={isLoading} />
      <ControlTowerPanel groups={data?.alertGroups} loading={isLoading} />
      <TradeOperationsBoard rows={data?.tradeBoard} loading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AuctionMonitor rows={data?.auctions} loading={isLoading} />
        <FreightIqPanel rows={data?.freight} loading={isLoading} />
      </div>

      <OperationsShipmentCenter rows={data?.shipments} loading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DocumentControlCenter rows={data?.documents} loading={isLoading} />
        <CommunicationMonitor rows={data?.communications} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <RevenuePanel revenue={data?.revenue} loading={isLoading} />
        <TeamWorkloadPanel rows={data?.workload} unassignedCount={data?.unassignedCount} loading={isLoading} />
        <OperationsUpcomingEvents events={data?.upcomingEvents} loading={isLoading} />
      </div>

      <p className="text-xs text-zinc-400 text-center">
        <Link to="/admin/rfq" className="hover:underline">{t("dash.admin.link.triage")}</Link>
        {" · "}
        <Link to="/operations/growth" className="hover:underline">{t("dash.admin.link.growth")}</Link>
        {" · "}
        <Link to="/operations/market-intelligence" className="hover:underline">{t("dash.admin.link.intel")}</Link>
      </p>
    </div>
  );
}

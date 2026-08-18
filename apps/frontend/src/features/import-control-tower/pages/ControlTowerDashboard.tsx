import { useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { useImportControlTowerDashboard } from "@/features/control-tower/hooks";
import { ControlTowerKpiRow } from "../components/ControlTowerKpiRow";
import { TradePipelineWidget } from "../components/TradePipelineWidget";
import { AttentionRequiredCard } from "../components/AttentionRequiredCard";
import { LiveActivityFeed } from "../components/LiveActivityFeed";
import { UpcomingMilestonesCard } from "../components/UpcomingMilestonesCard";
import { ShipmentVisibilityCard } from "../components/ShipmentVisibilityCard";
import { OperationalRiskCard } from "../components/OperationalRiskCard";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useT } from "@/i18n/useT";
import { MotionText, ScrollReveal, StaggerGroup } from "@/motion";

export default function ControlTowerDashboard() {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const filters = useMemo(() => {
    const p: Record<string, string> = {};
    if (search.trim()) p.q = search.trim();
    if (status) p.status = status;
    return p;
  }, [search, status]);

  const { data, isLoading, isError, refetch, isFetching } = useImportControlTowerDashboard(filters);

  if (isLoading && !data) return <PageSkeleton />;

  if (isError || !data) {
    return (
      <div data-testid="import-control-tower-error" className="max-w-3xl mx-auto p-8 text-center space-y-3">
        <p className="text-red-600">{t("importTower.error")}</p>
        <button type="button" className="dmx-btn-secondary" onClick={() => void refetch()}>{t("common.retry")}</button>
      </div>
    );
  }

  return (
    <div data-testid="import-control-tower" className="max-w-[1600px] mx-auto space-y-6 pb-10">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t("importTower.title")}</div>
          <MotionText as="h1" className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            {t("importTower.commandTitle")}
          </MotionText>
          <p className="text-sm text-zinc-500 mt-1.5">
            {t("importTower.subtitle")}
            {data.refreshedAt && (
              <span className="ml-2 text-zinc-400">
                · {t("importTower.updatedAt")} {new Date(data.refreshedAt).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              data-testid="ict-search"
              type="search"
              placeholder={t("importTower.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 rounded-lg border border-zinc-200 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            data-testid="ict-status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">{t("importTower.filter.allStatuses")}</option>
            <option value="PRODUCTION">{t("importTower.filter.production")}</option>
            <option value="TRANSIT">{t("importTower.filter.transit")}</option>
            <option value="DELIVERED">{t("importTower.filter.delivered")}</option>
          </select>
          <button
            type="button"
            data-testid="ict-refresh"
            onClick={() => void refetch()}
            className="dmx-btn-secondary inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className={cnIcon(isFetching)} /> {t("importTower.refresh")}
          </button>
        </div>
      </header>

      <StaggerGroup className="space-y-6">
        <ScrollReveal index={0}><ControlTowerKpiRow kpis={data.kpis} loading={isLoading} /></ScrollReveal>
        <ScrollReveal index={1}><TradePipelineWidget stages={data.pipeline} /></ScrollReveal>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ScrollReveal index={2}><AttentionRequiredCard items={data.attentionRequired} /></ScrollReveal>
          <ScrollReveal index={3}><LiveActivityFeed items={data.activityFeed} /></ScrollReveal>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ScrollReveal index={4}><UpcomingMilestonesCard items={data.upcomingMilestones} /></ScrollReveal>
          <ScrollReveal index={5} className="lg:col-span-2">
            <ShipmentVisibilityCard data={data.shipmentVisibility} />
          </ScrollReveal>
        </div>

        <ScrollReveal index={6}><OperationalRiskCard items={data.operationalRisks} /></ScrollReveal>
      </StaggerGroup>
    </div>
  );
}

function cnIcon(spin: boolean) {
  return `h-4 w-4 ${spin ? "animate-spin" : ""}`;
}

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";
import type { ExceptionSeverity } from "@dmx/contracts/exception-hub";
import { exceptionHubApi } from "@/features/exception-hub/lib/exception-hub.api";

const SEVERITY_DOT: Record<ExceptionSeverity, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-amber-500",
  Low: "bg-zinc-400",
};

export function MyExceptionsWidget() {
  const { t } = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["my-exceptions-widget"],
    queryFn: () => exceptionHubApi.list({ limit: 5, offset: 0, waitingForMe: true }),
  });

  const open = data?.kpis.openExceptions ?? 0;
  const critical = data?.kpis.criticalExceptions ?? 0;
  const waiting = data?.kpis.myPendingActions ?? 0;
  const resolvedWeek = data?.kpis.resolvedThisWeek ?? 0;
  const items = (data?.items ?? []).filter((e) => !["Resolved", "Closed"].includes(e.status));

  return (
    <section data-testid="my-exceptions-widget" data-guide="dashboard-alerts" className="dmx-card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3 flex items-center justify-between bg-zinc-50/80">
        <div>
          <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.exceptionHub")}</span>
          <h2 className="font-display text-lg font-semibold">{t("dash.exceptions.title")}</h2>
        </div>
        <Link to="/alerts" data-testid="my-exceptions-view-all" className="text-xs font-medium text-accent-900 hover:underline">
          {t("dash.common.openArrow")}
        </Link>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div data-testid="my-exceptions-open" className="rounded-lg border border-zinc-100 p-2">
            <div className="text-[10px] uppercase text-zinc-500">{t("dash.exceptions.open")}</div>
            <div className="font-display text-xl font-semibold tabular-nums">{isLoading ? "…" : open}</div>
          </div>
          <div data-testid="my-exceptions-critical" className="rounded-lg border border-red-100 bg-red-50/30 p-2">
            <div className="text-[10px] uppercase text-red-700">{t("dash.exceptions.critical")}</div>
            <div className="font-display text-xl font-semibold tabular-nums text-red-900">{isLoading ? "…" : critical}</div>
          </div>
          <div data-testid="my-exceptions-waiting" className="rounded-lg border border-amber-100 bg-amber-50/30 p-2">
            <div className="text-[10px] uppercase text-amber-800">{t("dash.exceptions.waitingForMe")}</div>
            <div className="font-display text-xl font-semibold tabular-nums">{isLoading ? "…" : waiting}</div>
          </div>
          <div data-testid="my-exceptions-resolved" className="rounded-lg border border-zinc-100 p-2">
            <div className="text-[10px] uppercase text-zinc-500">{t("dash.exceptions.resolvedWeek")}</div>
            <div className="font-display text-xl font-semibold tabular-nums">{isLoading ? "…" : resolvedWeek}</div>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-zinc-500">{t("dash.common.loadingExceptions")}</p>
        ) : items.length === 0 ? (
          <p data-testid="my-exceptions-empty" className="text-sm text-zinc-500">{t("dash.exceptions.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {items.slice(0, 3).map((e) => (
              <li key={e.id} data-testid={`my-exception-${e.id}`} className="rounded-lg border border-zinc-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", SEVERITY_DOT[e.severity])} />
                    <span className="font-mono text-xs truncate">{e.exceptionRef}</span>
                  </div>
                  <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                </div>
                <div className="mt-1 text-xs text-zinc-500 truncate">{e.exceptionType} · {e.tradeId}</div>
                {e.requiredAction && (
                  <div className="mt-1 text-xs text-amber-800 truncate">{e.requiredAction}</div>
                )}
                <Link
                  to={e.detailUrl}
                  data-testid={`my-exception-link-${e.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent-900 hover:underline"
                >
                  {t("dash.common.open")} <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

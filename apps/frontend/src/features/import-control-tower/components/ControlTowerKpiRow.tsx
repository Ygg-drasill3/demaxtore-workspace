import {
  Activity, Anchor, AlertTriangle, CheckCircle2, Factory, FileWarning, Ship, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImportControlTowerKpis } from "@dmx/contracts/import-control-tower";
import { useT } from "@/i18n/useT";

const KPIS = [
  { key: "activeTrades" as const, labelKey: "importTower.kpi.activeTrades", icon: Activity, tone: "accent" },
  { key: "inProduction" as const, labelKey: "importTower.kpi.inProduction", icon: Factory, tone: "blue" },
  { key: "atSea" as const, labelKey: "importTower.kpi.atSea", icon: Ship, tone: "violet" },
  { key: "deliveredThisMonth" as const, labelKey: "importTower.kpi.deliveredMonth", icon: CheckCircle2, tone: "emerald" },
  { key: "delayedTrades" as const, labelKey: "importTower.kpi.delayed", icon: AlertTriangle, tone: "rose" },
  { key: "pendingInspections" as const, labelKey: "importTower.kpi.pendingInspections", icon: ShieldAlert, tone: "amber" },
  { key: "missingDocuments" as const, labelKey: "importTower.kpi.missingDocs", icon: FileWarning, tone: "amber" },
  { key: "criticalExceptions" as const, labelKey: "importTower.kpi.criticalExceptions", icon: Anchor, tone: "rose" },
] as const;

const TONES = {
  accent: "bg-accent-50 text-accent-900",
  blue: "bg-blue-50 text-blue-800",
  violet: "bg-violet-50 text-violet-800",
  emerald: "bg-emerald-50 text-emerald-800",
  rose: "bg-rose-50 text-rose-800",
  amber: "bg-amber-50 text-amber-800",
};

export function ControlTowerKpiRow({ kpis, loading }: { kpis?: ImportControlTowerKpis; loading?: boolean }) {
  const { t } = useT();

  return (
    <section data-testid="ict-kpi-row" className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
      {KPIS.map(({ key, labelKey, icon: Icon, tone }) => (
        <div key={key} data-testid={`ict-kpi-${key}`} className="dmx-card p-4 flex flex-col gap-3 min-h-[96px]">
          <div className={cn("h-9 w-9 rounded-xl grid place-items-center", TONES[tone])}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="font-display text-2xl font-semibold tabular-nums leading-none">
              {loading ? "—" : (kpis?.[key] ?? 0)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1.5">{t(labelKey)}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

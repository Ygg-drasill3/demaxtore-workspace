import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";

export type KpiTone = "accent" | "emerald" | "amber" | "blue" | "violet" | "rose";

const TONE_STYLES: Record<KpiTone, { icon: string; ring: string }> = {
  accent: { icon: "bg-accent-50 text-accent-900", ring: "hover:ring-accent-900/15" },
  emerald: { icon: "bg-emerald-50 text-emerald-800", ring: "hover:ring-emerald-500/20" },
  amber: { icon: "bg-amber-50 text-amber-800", ring: "hover:ring-amber-500/20" },
  blue: { icon: "bg-blue-50 text-blue-800", ring: "hover:ring-blue-500/20" },
  violet: { icon: "bg-violet-50 text-violet-800", ring: "hover:ring-violet-500/20" },
  rose: { icon: "bg-rose-50 text-rose-800", ring: "hover:ring-rose-500/20" },
};

export interface KpiTileSpec {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  testId: string;
  tone: KpiTone;
  value: number;
}

function KpiTile({ tile, value }: { tile: KpiTileSpec; value: number | string }) {
  const styles = TONE_STYLES[tile.tone];
  const Icon = tile.icon;

  return (
    <Link
      to={tile.to}
      data-testid={tile.testId}
      className={cn(
        "group dmx-card dmx-card-hover p-4 flex flex-col gap-3 min-h-[96px] ring-1 ring-transparent transition-all",
        styles.ring,
        typeof value === "number" && value > 0 && "border-paper-200",
      )}
    >
      <div
        className={cn(
          "h-9 w-9 rounded-xl grid place-items-center shrink-0 transition-transform group-hover:scale-105",
          styles.icon,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-2xl font-semibold tabular-nums leading-none">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1.5 truncate">
          {tile.label}
        </div>
      </div>
    </Link>
  );
}

/**
 * Metric grid that leads with the numbers that actually need a decision. Tiles
 * sitting at zero are folded away behind one control instead of filling the
 * screen with empty counters — every metric stays reachable.
 */
export function KpiTileGrid({
  tiles,
  loading,
  testId,
  guide,
  columnsClass,
}: {
  tiles: KpiTileSpec[];
  loading?: boolean;
  testId: string;
  guide?: string;
  columnsClass: string;
}) {
  const { t } = useT();
  const [showAll, setShowAll] = useState(false);

  const active = tiles.filter((tile) => tile.value > 0);
  const idleCount = tiles.length - active.length;
  const expanded = Boolean(loading) || showAll || idleCount === 0;

  if (!expanded && active.length === 0) {
    return (
      <section
        data-testid={testId}
        data-guide={guide}
        data-kpi-state="all-clear"
        className="dmx-card flex flex-wrap items-center justify-between gap-3 px-4 py-3"
      >
        <p className="flex items-center gap-2 text-sm text-zinc-600">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <Check className="h-3.5 w-3.5" />
          </span>
          {t("dash.kpi.allClear", "Nothing pending here right now.")}
        </p>
        <button
          type="button"
          onClick={() => setShowAll(true)}
          data-testid={`${testId}-show-all`}
          className="text-xs font-medium text-accent-900 hover:underline"
        >
          {t("dash.kpi.showAll", "Show all metrics")}
        </button>
      </section>
    );
  }

  const visible = expanded ? tiles : active;

  return (
    <section data-testid={testId} data-guide={guide} className={cn("grid gap-3", columnsClass)}>
      {visible.map((tile) => (
        <KpiTile key={tile.key} tile={tile} value={loading ? "—" : tile.value} />
      ))}
      {!expanded && idleCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          data-testid={`${testId}-show-all`}
          className="dmx-card dmx-card-hover flex min-h-[96px] flex-col items-start justify-center gap-2 p-4 text-left ring-1 ring-transparent transition-all hover:ring-accent-900/15"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-paper-100 text-zinc-500">
            <Plus className="h-4 w-4" />
          </span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            {t("dash.kpi.showMore", "{count} more at zero", { count: idleCount })}
          </span>
        </button>
      )}
    </section>
  );
}

import { Link } from "react-router-dom";
import type { AttentionRequiredItem } from "@dmx/contracts/import-control-tower";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";

const PRIORITY_STYLES = {
  Critical: "border-red-200 bg-red-50/60 text-red-900",
  High: "border-amber-200 bg-amber-50/60 text-amber-900",
  Medium: "border-blue-200 bg-blue-50/40 text-blue-900",
  Low: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export function AttentionRequiredCard({ items }: { items: AttentionRequiredItem[] }) {
  const { t } = useT();
  return (
    <section data-testid="ict-attention" className="dmx-card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3 bg-zinc-50/80">
        <h2 className="text-sm font-semibold text-ink-900">{t("importTower.attention.title")}</h2>
      </div>
      <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto dmx-thin-scroll">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("importTower.attention.empty")}</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              to={item.workspaceUrl}
              data-testid={`ict-attention-${item.id}`}
              className={cn("block rounded-lg border p-3 text-sm hover:opacity-90 transition-opacity", PRIORITY_STYLES[item.priority])}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium">{item.title}</span>
                <span className="text-[10px] uppercase tracking-wider shrink-0">{item.priority}</span>
              </div>
              <div className="mt-1 text-xs opacity-80">{item.kind} · {item.tradeRef}</div>
              <p className="mt-1 text-xs opacity-70 line-clamp-2">{item.description}</p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

// apps/frontend/src/features/rfq/components/SupplierActivityStrip.tsx
//
// Sprint 2.5 — the "is anyone working on this?" signal.
// Renders ONLY when state ∈ { RFQ_OPEN, QUOTATIONS_CLOSED, UNDER_EVALUATION }.
//
import { useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { useSupplierActivitySummary, useNudgeSilentSuppliers } from "../hooks/useSupplierActivity";
import { SupplierActivityDrawer } from "./SupplierActivityDrawer";
import { formatRelative } from "@/lib/utils";
import type { RfqState } from "@dmx/contracts/rfq.fsm";

const VISIBLE_STATES = new Set<RfqState>(["RFQ_OPEN", "QUOTATIONS_CLOSED", "UNDER_EVALUATION"]);

interface Props {
  workspaceId: string;
  state:       RfqState;
}

export function SupplierActivityStrip({ workspaceId, state }: Props) {
  const visible = VISIBLE_STATES.has(state);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, isLoading } = useSupplierActivitySummary(visible ? workspaceId : undefined);
  const nudgeSilent = useNudgeSilentSuppliers(workspaceId);

  if (!visible) return null;

  return (
    <>
      <section data-testid="supplier-activity-strip" data-guide="supplier-activity" className="dmx-card p-5 sm:p-6 animate-fade-in">
        <header className="flex items-center justify-between mb-4">
          <div className="dmx-eyebrow">Supplier activity</div>
          {data && (
            <div className="text-[11px] text-zinc-500" data-testid="supplier-activity-updated">
              updated {formatRelative(data.updatedAt)}
            </div>
          )}
        </header>

        {isLoading || !data ? (
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-3">
              <Tile testId="supplier-tile-invited"  label="Invited"   value={data.invited} />
              <Tile testId="supplier-tile-viewed"   label="Viewed"    value={data.viewed} />
              <Tile testId="supplier-tile-quoted"   label="Quoted"    value={data.quoted}   tone="success" />
              <Tile testId="supplier-tile-declined" label="Declined"  value={data.declined} tone="warning" />
              <Tile testId="supplier-tile-silent"   label="Silent"    value={data.silent}   tone="danger" />
            </div>

            <p data-testid="supplier-activity-summary" className="text-xs text-zinc-600 mt-4 leading-relaxed">
              <SentenceSummary {...data} />
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                data-testid="supplier-nudge-silent"
                variant="secondary"
                size="sm"
                disabled={data.silent === 0 || nudgeSilent.isPending}
                loading={nudgeSilent.isPending}
                onClick={() => nudgeSilent.mutate()}
              >
                <BellRing className="h-3.5 w-3.5" />
                Nudge silent suppliers
              </Button>
              <Button
                data-testid="supplier-detail-open"
                variant="ghost"
                size="sm"
                onClick={() => setDrawerOpen(true)}
              >
                View per-supplier detail
              </Button>
            </div>
          </>
        )}
      </section>

      <SupplierActivityDrawer
        workspaceId={workspaceId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

interface TileProps {
  testId: string;
  label:  string;
  value:  number;
  tone?:  "default" | "success" | "warning" | "danger";
}

const TILE_TONE = {
  default: "bg-paper-50 border-paper-200 text-ink-900",
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  danger:  "bg-red-50 border-red-200 text-red-700",
} as const;

function Tile({ testId, label, value, tone = "default" }: TileProps) {
  return (
    <div data-testid={testId} className={`rounded-lg border px-3 py-2.5 text-center ${TILE_TONE[tone]}`}>
      <div className="font-display text-2xl font-semibold tabular-nums leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider mt-1.5 opacity-80">{label}</div>
    </div>
  );
}

function SentenceSummary(s: { invited: number; viewed: number; quoted: number; declined: number; silent: number }) {
  const fragments: string[] = [];
  if (s.viewed - s.quoted - s.declined > 0) fragments.push(`${s.viewed - s.quoted - s.declined} of ${s.invited} reviewing`);
  if (s.quoted   > 0) fragments.push(`${s.quoted} of ${s.invited} quoted`);
  if (s.declined > 0) fragments.push(`${s.declined} declined`);
  if (s.silent   > 0) fragments.push(`${s.silent} silent (no view yet)`);
  return <>{fragments.length ? fragments.join(" · ") : "Awaiting supplier engagement."}</>;
}

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { humanizeStatus } from "@/lib/humanize-status";
import { landedCostApi } from "../lib/landed-cost.api";

export default function LandedCostListPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["landed-cost", "list"],
    queryFn: landedCostApi.list,
  });

  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6" data-testid="landed-cost-list-page">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Landed cost</h1>
        <p className="text-sm text-zinc-600">
          Product, freight, customs and delivery costs — estimated vs actual. Missing costs stay blank, never zero.
        </p>
      </header>

      {isLoading && <p className="text-sm text-zinc-500">Loading…</p>}
      {isError && (
        <p className="text-sm text-red-600">
          Failed to load.{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </p>
      )}

      {!isLoading && items.length === 0 ? (
        <EmptyState
          testId="landed-cost-empty"
          icon={<Receipt className="h-5 w-5" />}
          title="No landed costs yet"
          body="Landed cost appears once freight or customs costs are recorded on an import."
          action={
            <Link to="/buyer/imports" className="dmx-btn-primary text-sm">
              Open My Imports
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3" data-testid="landed-cost-table">
          {items.map((c) => {
            const title = c.displayLabel?.trim() || "Landed cost";
            return (
              <li key={c.id} className="dmx-card p-4" data-testid={`landed-cost-row-${c.id}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900 truncate">{title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {humanizeStatus(c.status)} · {c.calculationCurrency}
                      {c.missingComponentCount > 0
                        ? ` · ${c.missingComponentCount} cost${c.missingComponentCount === 1 ? "" : "s"} still missing`
                        : ""}
                    </p>
                    <p className="text-sm text-ink-800 mt-2 tabular-nums">
                      Known: {c.knownSubtotal.toLocaleString()} {c.calculationCurrency}
                      {c.totalLandedCost != null
                        ? ` · Total: ${c.totalLandedCost.toLocaleString()} ${c.calculationCurrency}`
                        : " · Total pending"}
                    </p>
                  </div>
                  <Link
                    className="dmx-btn-primary text-xs shrink-0"
                    to={`/buyer/landed-cost/${c.id}`}
                    data-testid={`landed-cost-open-${c.id}`}
                  >
                    Open costs →
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

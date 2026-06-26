import { BULK_CAPACITY_WARNING_LABELS } from "@dmx/contracts/bulk-container-catalog";

export function CapacityMeter({
  currentMt,
  maxMt,
  fillPercent,
  warnings = [],
}: {
  currentMt: number;
  maxMt: number;
  fillPercent: number;
  warnings?: string[];
}) {
  const barPercent = Math.min(100, fillPercent);
  const overCapacity = warnings.includes("over_capacity");

  return (
    <div data-testid="bc-capacity-meter">
      <div className="flex justify-between text-xs text-zinc-500 mb-1">
        <span>BulkContainer Fill</span>
        <span data-testid="bc-fill-percent">{fillPercent}%</span>
      </div>
      <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${overCapacity ? "bg-red-600" : "bg-accent-900"}`}
          style={{ width: `${barPercent}%` }}
        />
      </div>
      <p className="text-sm mt-2" data-testid="bc-mt-used">
        <strong>{currentMt.toFixed(2)}</strong> of {maxMt} MT used · <strong>{Math.max(0, maxMt - currentMt).toFixed(2)}</strong> remaining
      </p>
      {warnings.length > 0 && (
        <ul className="mt-2 space-y-1">
          {warnings.map((w) => (
            <li key={w} className="text-xs text-amber-700" data-testid={`bc-warning-${w}`}>
              {BULK_CAPACITY_WARNING_LABELS[w] ?? w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

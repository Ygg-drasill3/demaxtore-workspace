import type { CarrierOptionDto } from "@dmx/contracts/freight-booking";
import { cn } from "@/lib/utils";

function fmtMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

export function CarrierComparisonTable({
  options,
  onSelect,
  selectable = false,
}: {
  options: CarrierOptionDto[];
  onSelect?: (id: string) => void;
  selectable?: boolean;
}) {
  if (options.length === 0) {
    return (
      <div data-testid="carrier-comparison-empty" className="text-sm text-zinc-500 py-4">
        No carrier options available.
      </div>
    );
  }

  return (
    <div data-testid="carrier-comparison-table" className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-zinc-500 border-b border-zinc-200">
            <th className="py-2 pr-3">Carrier / Vessel</th>
            <th className="py-2 pr-3">Transit</th>
            <th className="py-2 pr-3">ETD</th>
            <th className="py-2 pr-3">ETA</th>
            <th className="py-2 pr-3">Cut-off</th>
            <th className="py-2 pr-3">Freight</th>
            <th className="py-2 pr-3">Score</th>
            {selectable && <th className="py-2" />}
          </tr>
        </thead>
        <tbody>
          {options.map((o) => (
            <tr
              key={o.id}
              data-testid={`carrier-option-row-${o.id}`}
              className={cn(
                "border-b border-zinc-100",
                o.status === "RECOMMENDED" && "bg-emerald-50/60",
                o.status === "SELECTED" && "bg-blue-50/60",
              )}
            >
              <td className="py-2 pr-3">
                <div className="font-medium">{o.carrierName}</div>
                <div className="text-zinc-500">{o.vesselName}</div>
                {o.status === "RECOMMENDED" && (
                  <span data-testid="carrier-recommended-badge" className="text-[10px] uppercase text-emerald-700 font-semibold">
                    Recommended
                  </span>
                )}
              </td>
              <td className="py-2 pr-3" data-testid={`carrier-transit-${o.id}`}>{o.transitDays}d</td>
              <td className="py-2 pr-3">{fmtDate(o.etd)}</td>
              <td className="py-2 pr-3">{fmtDate(o.eta)}</td>
              <td className="py-2 pr-3" data-testid={`carrier-cutoff-${o.id}`}>{fmtDate(o.cutoffDate)}</td>
              <td className="py-2 pr-3" data-testid={`carrier-freight-${o.id}`}>{fmtMoney(o.freightAmount, o.currency)}</td>
              <td className="py-2 pr-3 font-semibold" data-testid={`carrier-score-${o.id}`}>{o.recommendationScore}</td>
              {selectable && (
                <td className="py-2">
                  {o.status !== "SELECTED" && o.status !== "EXPIRED" && (
                    <button
                      type="button"
                      data-testid={`carrier-select-${o.id}`}
                      className="text-blue-600 hover:underline"
                      onClick={() => onSelect?.(o.id)}
                    >
                      Select
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

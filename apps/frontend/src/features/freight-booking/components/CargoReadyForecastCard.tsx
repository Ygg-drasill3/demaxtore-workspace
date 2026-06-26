import type { CargoReadyForecastDto } from "@dmx/contracts/freight-booking";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

export function CargoReadyForecastCard({ forecast }: { forecast: CargoReadyForecastDto | null }) {
  if (!forecast) {
    return (
      <div data-testid="cargo-forecast-empty" className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
        No cargo ready forecast submitted yet.
      </div>
    );
  }

  return (
    <div data-testid="cargo-forecast-card" className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-ink-900">Cargo Ready Forecast</div>
        <span data-testid="cargo-forecast-status" className="text-[10px] uppercase tracking-wider text-zinc-500">
          {forecast.status}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-zinc-500 block">Production start</span>
          <span data-testid="cargo-forecast-start">{fmtDate(forecast.productionStartDate)}</span>
        </div>
        <div>
          <span className="text-zinc-500 block">Production finish</span>
          <span data-testid="cargo-forecast-finish">{fmtDate(forecast.estimatedProductionFinishDate)}</span>
        </div>
        <div>
          <span className="text-zinc-500 block">Cargo ready</span>
          <span data-testid="cargo-forecast-ready" className="font-semibold">{fmtDate(forecast.estimatedCargoReadyDate)}</span>
        </div>
      </div>
      <div className="text-xs text-zinc-600">
        Confidence: <span data-testid="cargo-forecast-confidence">{forecast.confidenceLevel}</span>
        {forecast.notes && <span className="block mt-1">{forecast.notes}</span>}
      </div>
    </div>
  );
}

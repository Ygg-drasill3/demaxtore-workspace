import type { CarrierOptionDto } from "@dmx/contracts/freight-booking";

function fmtMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

export function BookingRecommendationCard({
  option,
  label,
}: {
  option: CarrierOptionDto | null;
  label?: string | null;
}) {
  if (!option) return null;

  return (
    <div data-testid="booking-recommendation-card" className="rounded-lg border-2 border-emerald-300 bg-emerald-50/50 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wider text-emerald-800 font-semibold">
          {label ?? "Best Overall Option"}
        </div>
        <span data-testid="booking-recommendation-score" className="text-lg font-bold text-emerald-900">
          {option.recommendationScore}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-zinc-500 block text-xs">Carrier</span>
          <span data-testid="booking-recommended-carrier">{option.carrierName}</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs">Vessel</span>
          <span data-testid="booking-recommended-vessel">{option.vesselName}</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs">Transit</span>
          <span>{option.transitDays} days</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs">Freight</span>
          <span data-testid="booking-recommended-freight">{fmtMoney(option.freightAmount, option.currency)}</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs">ETD</span>
          <span>{fmtDate(option.etd)}</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs">Cut-off</span>
          <span data-testid="booking-recommended-cutoff">{fmtDate(option.cutoffDate)}</span>
        </div>
      </div>
    </div>
  );
}

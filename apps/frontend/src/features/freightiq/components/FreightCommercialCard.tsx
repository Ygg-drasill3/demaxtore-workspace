import type { FreightCommercialSummary } from "@dmx/contracts/freight-commercial";

interface Props {
  commercial?: FreightCommercialSummary | null;
}

export function FreightCommercialCard({ commercial }: Props) {
  if (!commercial) return null;

  return (
    <section data-testid="freightiq-commercial-card" className="dmx-card p-4">
      <span className="dmx-eyebrow text-zinc-500">Landed cost estimate</span>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-paper-50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">FOB (goods)</div>
          <div className="font-display text-lg font-semibold tabular-nums mt-0.5">
            {commercial.fobValueUsd.toLocaleString()} {commercial.currency}
          </div>
        </div>
        <div className="rounded-lg bg-paper-50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Freight</div>
          <div className="font-display text-lg font-semibold tabular-nums mt-0.5">
            {commercial.displayFreightUsd != null
              ? `${commercial.displayFreightUsd.toLocaleString()} ${commercial.currency}`
              : "—"}
          </div>
        </div>
        <div className="rounded-lg bg-accent-50 px-3 py-2 ring-1 ring-accent-900/10">
          <div className="text-[10px] uppercase tracking-wider text-accent-900/70">Est. CIF</div>
          <div className="font-display text-lg font-semibold tabular-nums mt-0.5 text-accent-900">
            {commercial.estimatedCifUsd != null
              ? `${commercial.estimatedCifUsd.toLocaleString()} ${commercial.currency}`
              : "—"}
          </div>
        </div>
      </div>
    </section>
  );
}

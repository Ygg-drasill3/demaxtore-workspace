import { useT } from "@/i18n/useT";

export function FillMeter({ used, max, percent }: { used: number; max: number; percent: number }) {
  const { t } = useT();
  const isFull = used >= max;

  return (
    <div data-testid="mc-fill-meter">
      <div className="flex justify-between text-xs text-zinc-500 mb-1">
        <span>Fill meter</span>
        <span data-testid="mc-fill-percent">{percent}%</span>
      </div>
      <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isFull ? "bg-amber-600" : "bg-accent-900"}`}
          style={{ width: `${Math.min(100, percent)}%` }}
          data-testid="mc-fill-bar"
        />
      </div>
      <p className="text-sm mt-2" data-testid="mc-pallet-capacity">
        <strong>{used}</strong> of {max} pallets used · <strong>{Math.max(0, max - used)}</strong> remaining
      </p>
      {isFull && (
        <p
          className="text-sm mt-2 font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
          data-testid="mc-capacity-full-warning"
          role="alert"
        >
          {t("mc.capacity.full")}
        </p>
      )}
    </div>
  );
}

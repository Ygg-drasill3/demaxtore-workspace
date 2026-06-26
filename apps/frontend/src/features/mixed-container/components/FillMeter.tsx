export function FillMeter({ used, max, percent }: { used: number; max: number; percent: number }) {
  return (
    <div data-testid="mc-fill-meter">
      <div className="flex justify-between text-xs text-zinc-500 mb-1">
        <span>Fill meter</span>
        <span data-testid="mc-fill-percent">{percent}%</span>
      </div>
      <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-900 rounded-full transition-all"
          style={{ width: `${Math.min(100, percent)}%` }}
          data-testid="mc-fill-bar"
        />
      </div>
      <p className="text-sm mt-2" data-testid="mc-pallet-capacity">
        <strong>{used}</strong> of {max} pallets used · <strong>{Math.max(0, max - used)}</strong> remaining
      </p>
    </div>
  );
}

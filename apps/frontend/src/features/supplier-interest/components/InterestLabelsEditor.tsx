import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

export function InterestLabelsEditor({
  labels,
  onChange,
  disabled,
  placeholder = "Type a category and press Enter…",
  testIdPrefix = "interest-label",
}: {
  labels: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  testIdPrefix?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const parts = raw
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...labels];
    for (const p of parts) {
      if (next.some((x) => x.toLocaleLowerCase("tr-TR") === p.toLocaleLowerCase("tr-TR"))) continue;
      if (next.length >= 50) break;
      next.push(p.slice(0, 120));
    }
    onChange(next);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && labels.length) {
      onChange(labels.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2" data-testid={`${testIdPrefix}-editor`}>
      <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
        {labels.map((label) => (
          <span
            key={label}
            data-testid={`${testIdPrefix}-chip`}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-800"
          >
            {label}
            <button
              type="button"
              aria-label={`Remove ${label}`}
              disabled={disabled}
              className="text-zinc-400 hover:text-zinc-700 disabled:opacity-50"
              onClick={() => onChange(labels.filter((x) => x !== label))}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        data-testid={`${testIdPrefix}-input`}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (draft.trim()) commit(draft);
        }}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm disabled:opacity-60"
      />
      <p className="text-[11px] text-zinc-400">
        Write categories freely (e.g. Makarna, Un, Yağ). Press Enter or comma to add.
      </p>
    </div>
  );
}

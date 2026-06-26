import { useState } from "react";
import { ChevronDown, ChevronUp, ListOrdered } from "lucide-react";

export function LearningGuidePanel({
  steps,
  testId,
}: {
  steps: Array<{ step: string; detail: string }>;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  if (steps.length === 0) return null;

  return (
    <div data-testid={testId} className="rounded-lg border border-zinc-200 bg-paper-50 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-ink-900 hover:bg-zinc-50"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-accent-900" />
          Step-by-step guide ({steps.length} steps)
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <ol className="px-3 pb-3 space-y-2 text-sm">
          {steps.map((s, i) => (
            <li key={s.step} className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-accent-900 text-white text-xs flex items-center justify-center font-medium">
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-ink-900">{s.step}</p>
                <p className="text-zinc-600 text-xs mt-0.5">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

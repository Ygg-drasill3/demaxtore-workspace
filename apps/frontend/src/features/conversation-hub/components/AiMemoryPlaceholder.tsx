import { Sparkles } from "lucide-react";

export default function AiMemoryPlaceholder() {
  return (
    <section
      data-testid="hub-ai-placeholder"
      className="rounded-lg border border-dashed border-zinc-200 bg-gradient-to-r from-zinc-50 to-white px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900">AI Procurement Memory™️</p>
          <p className="text-xs text-zinc-500">Coming Soon — contextual import intelligence for this workspace</p>
        </div>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 shrink-0">Coming Soon</span>
      </div>
    </section>
  );
}

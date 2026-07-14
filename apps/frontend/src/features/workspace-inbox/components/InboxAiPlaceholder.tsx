import { Sparkles } from "lucide-react";

export default function InboxAiPlaceholder() {
  return (
    <section
      data-testid="inbox-ai-placeholder"
      className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white px-5 py-4"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold tracking-tight">AI Procurement Memory™️</p>
          <p className="text-xs text-zinc-300 mt-0.5">Cross-workspace intelligence for import operations</p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 shrink-0">
          Coming Soon
        </span>
      </div>
    </section>
  );
}

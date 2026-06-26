import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatScript, type ScriptMood, type WorkspaceScript } from "@dmx/contracts/workspace-scripts";

const MOOD_STYLES: Record<ScriptMood, { bg: string; border: string; check: string; arrow: string }> = {
  active:         { bg: "bg-white",      border: "border-paper-200",     check: "text-emerald-600", arrow: "text-accent-900" },
  waiting:        { bg: "bg-paper-50",   border: "border-paper-200",     check: "text-accent-900",  arrow: "text-zinc-500" },
  action:         { bg: "bg-accent-50",  border: "border-accent-900/15", check: "text-accent-900",  arrow: "text-accent-900" },
  returned:       { bg: "bg-red-50",     border: "border-red-200",       check: "text-amber-600",   arrow: "text-red-600" },
  "terminal-plus":  { bg: "bg-emerald-50", border: "border-emerald-200",   check: "text-emerald-700", arrow: "text-emerald-700" },
  "terminal-minus": { bg: "bg-paper-50",   border: "border-paper-200",     check: "text-zinc-500",    arrow: "text-zinc-500" },
};

export interface WorkspaceWhatHappensNextCardProps {
  script?: WorkspaceScript;
  vars?: Record<string, string | number | null | undefined>;
  stateKey?: string;
  primaryLabel?: string;
  onPrimaryClick?: () => void;
  onFallbackClick?: () => void;
  loading?: boolean;
  testId?: string;
  /** Optional per-action testid for the primary CTA (e.g. "order-action-supplier_confirm_order"). */
  primaryTestId?: string;
}

export function WorkspaceWhatHappensNextCard({
  script,
  vars = {},
  stateKey,
  primaryLabel,
  onPrimaryClick,
  onFallbackClick,
  loading,
  testId = "workspace-what-happens-next",
  primaryTestId,
}: WorkspaceWhatHappensNextCardProps) {
  if (!script) {
    return (
      <div data-testid={`${testId}-fallback`} className="dmx-card p-6 bg-paper-50 border-paper-200 animate-fade-in">
        <div className="dmx-eyebrow">What happens next</div>
        <p className="text-sm text-zinc-600 mt-2">DeMaxtore is processing this update.</p>
      </div>
    );
  }

  const mood = MOOD_STYLES[script.mood];
  const past = formatScript(script.past, vars);
  const future = formatScript(script.future, vars);
  const statL = { label: script.statL.label, value: formatScript(script.statL.value, vars) };
  const statR = { label: script.statR.label, value: formatScript(script.statR.value, vars) };
  const showPrimary = script.primaryAction && onPrimaryClick;
  const showFallback = !script.primaryAction && script.fallbackPrimary && onFallbackClick;

  return (
    <section
      data-testid={testId}
      data-state={stateKey}
      data-mood={script.mood}
      className={cn("rounded-2xl border p-6 sm:p-7 animate-fade-in", mood.bg, mood.border)}
    >
      <div className="dmx-eyebrow text-zinc-500">What happens next</div>
      <div className="mt-3 space-y-2">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className={cn("h-4 w-4 mt-0.5 shrink-0", mood.check)} />
          <p data-testid="whn-past" className="text-sm text-ink-900">{past}</p>
        </div>
        <div className="flex items-start gap-2.5">
          <ArrowRight className={cn("h-4 w-4 mt-0.5 shrink-0", mood.arrow)} />
          <p data-testid="whn-future" className="text-sm text-ink-900 leading-relaxed">{future}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label={statL.label} value={statL.value} testId="whn-stat-left" />
        <Stat label={statR.label} value={statR.value} testId="whn-stat-right" />
      </div>
      {(showPrimary || showFallback) && (
        <div className="mt-5">
          {showPrimary ? (
            <Button data-testid={primaryTestId ?? "whn-primary-cta"} size="lg" className="w-full" onClick={onPrimaryClick} loading={loading}>
              {primaryLabel ?? script.primaryLabel ?? "Continue"}
            </Button>
          ) : (
            <Button
              data-testid="whn-fallback-cta"
              size="lg"
              className="w-full"
              variant={script.fallbackPrimary?.tone === "ghost" ? "ghost" : "secondary"}
              onClick={onFallbackClick}
            >
              {script.fallbackPrimary?.label}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div data-testid={testId} className="rounded-xl border border-paper-200 bg-white/80 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-sm font-medium text-ink-900 mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}

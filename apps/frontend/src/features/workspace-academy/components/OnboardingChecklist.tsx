// apps/frontend/src/features/workspace-academy/components/OnboardingChecklist.tsx
//
// Persistent role-based onboarding checklist. Floating, minimizable and
// dismissible; tasks complete only through real backend-verified events.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, ListChecks, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";
import { useAuth } from "@/store/auth.store";
import { useTelemetry } from "@/features/telemetry/useTelemetry";
import { checklistForRole } from "../lib/checklist";
import { useWorkspaceAcademy } from "../context/WorkspaceAcademyProvider";

export function OnboardingChecklist() {
  const { t } = useT();
  const { track } = useTelemetry();
  const user = useAuth((s) => s.user);
  const { state, dismissChecklist, journey, exitOnboardingJourney } = useWorkspaceAcademy();
  const [minimized, setMinimized] = useState(true);

  const items = useMemo(() => (user ? checklistForRole(user.role) : []), [user]);

  if (!user || !state || state.checklistDismissedAt || items.length === 0) return null;

  const statusOf = (taskId: string) =>
    state.tasks.find((x) => x.taskId === taskId)?.status ?? "AVAILABLE";

  const doneCount = items.filter((i) => statusOf(i.id) === "COMPLETED").length;
  const pct = Math.round((doneCount / items.length) * 100);
  if (pct === 100) return null; // fully onboarded — get out of the way

  const isLocked = (item: (typeof items)[number]) =>
    item.prerequisites.some((pre) => statusOf(pre) !== "COMPLETED");

  const toggle = () => {
    setMinimized((v) => {
      track(v ? "academy.checklist_opened" : "academy.checklist_minimized", { meta: { role: user.role } });
      return !v;
    });
  };

  return (
    <div
      data-guide="onboarding-checklist"
      data-testid="academy-checklist"
      className="fixed bottom-20 right-4 rtl:right-auto rtl:left-4 z-40 w-[300px] max-w-[calc(100vw-2rem)]"
    >
      <div className="bg-white rounded-2xl shadow-modal border border-paper-200 overflow-hidden">
        <div className="flex items-stretch">
          <button
            onClick={toggle}
            aria-expanded={!minimized}
            className="flex-1 min-w-0 flex items-center gap-2.5 px-4 py-3 hover:bg-paper-50 dmx-focus-ring"
          >
            <span className="h-8 w-8 rounded-full bg-accent-900 text-white grid place-items-center shrink-0">
              <ListChecks className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="flex-1 text-start">
              <span className="block text-xs font-semibold text-ink-900">{t("wa.checklist.title")}</span>
              <span className="block text-[10px] text-zinc-500">
                {t("wa.checklist.progress", undefined, { done: doneCount, total: items.length, pct })}
              </span>
              {user.role === "BUYER" && journey.total > 0 && (
                <span className="block text-[10px] text-accent-900/70 mt-0.5">
                  {t("wa.journey.progress", undefined, { done: journey.done, total: journey.total })}
                </span>
              )}
            </span>
            {minimized
              ? <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
              : <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => dismissChecklist()}
            aria-label={t("wa.checklist.dismiss")}
            title={t("wa.checklist.dismiss")}
            className="shrink-0 px-3 self-stretch text-zinc-400 hover:text-ink-900 hover:bg-paper-50 dmx-focus-ring"
            data-testid="academy-checklist-dismiss-header"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* progress bar */}
        <div className="h-1 bg-paper-100">
          <div
            className="h-full bg-accent-900 transition-all rtl:ml-auto"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        {!minimized && (
          <div className="max-h-[320px] overflow-y-auto dmx-thin-scroll">
            <ul className="py-1">
              {items.map((item) => {
                const status = statusOf(item.id);
                const locked = status !== "COMPLETED" && isLocked(item);
                return (
                  <li key={item.id} className="px-3 py-1.5">
                    <div className={cn("flex items-start gap-2.5", locked && "opacity-50")}>
                      {status === "COMPLETED" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                      ) : locked ? (
                        <Lock className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <Circle className="h-4 w-4 text-zinc-300 mt-0.5 shrink-0" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        {item.route && !locked && status !== "COMPLETED" ? (
                          <Link to={item.route} className="text-xs text-ink-900 hover:text-accent-900 hover:underline">
                            {t(item.titleKey)}
                          </Link>
                        ) : (
                          <span className={cn("text-xs", status === "COMPLETED" ? "text-zinc-400 line-through" : "text-ink-900")}>
                            {t(item.titleKey)}
                          </span>
                        )}
                        {locked && item.lockedHintKey && (
                          <div className="text-[10px] text-zinc-400 mt-0.5">{t(item.lockedHintKey)}</div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="px-4 py-2 border-t border-paper-200 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => exitOnboardingJourney()}
                className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600 dmx-focus-ring rounded"
                data-testid="academy-exit-journey"
              >
                {t("wa.journey.exit")}
              </button>
              <button
                onClick={() => dismissChecklist()}
                className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600 dmx-focus-ring rounded"
                data-testid="academy-checklist-dismiss"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                {t("wa.checklist.dismiss")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

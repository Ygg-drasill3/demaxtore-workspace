// apps/frontend/src/features/workspace-academy/components/ProcessOverview.tsx
//
// Interactive 13-stage overview of the DeMaxtore commercial flow, plus the
// connected workspace chain. Each stage links to its Academy article.
import { useState } from "react";
import { Link } from "react-router-dom";
import { m } from "framer-motion";
import {
  FilePlus, GitBranch, Users, Scale, BadgeCheck, FileCheck, FileSignature,
  Factory, SearchCheck, Container, CalendarCheck, Ship, PackageCheck,
  ChevronRight, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";
import { useReducedMotion } from "@/motion";
import { springMicro } from "@/motion/tokens";
import { PROCESS_STAGES, WORKSPACE_CHAIN } from "../lib/process-overview";
import { articleById } from "../lib/articles";

const ICONS: Record<string, LucideIcon> = {
  FilePlus, GitBranch, Users, Scale, BadgeCheck, FileCheck, FileSignature,
  Factory, SearchCheck, Container, CalendarCheck, Ship, PackageCheck,
};

export function WorkspaceChain({
  compact = false,
  animated = false,
}: {
  compact?: boolean;
  /** Stagger chips so the chain “builds” left → right. */
  animated?: boolean;
}) {
  const { t } = useT();
  const reduced = useReducedMotion();
  const motionOn = animated && !reduced;

  return (
    <div
      data-testid="academy-workspace-chain"
      className={cn("flex flex-wrap items-center gap-1.5", compact ? "text-[11px]" : "text-xs")}
      aria-label={t("wa.chain.aria")}
    >
      {WORKSPACE_CHAIN.map((node, i) => (
        <m.span
          key={node.id}
          className="inline-flex items-center gap-1.5"
          initial={motionOn ? { opacity: 0, y: 8, scale: 0.92 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...springMicro, delay: motionOn ? i * 0.08 : 0 }}
        >
          <span className={cn(
            "px-2.5 py-1 rounded-full font-medium border",
            node.id === "trade"
              ? "bg-accent-900 text-white border-accent-900"
              : "bg-white text-ink-800 border-paper-200",
          )}>
            {t(node.labelKey)}
          </span>
          {i < WORKSPACE_CHAIN.length - 1 && (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400 rtl:rotate-180" aria-hidden="true" />
          )}
        </m.span>
      ))}
    </div>
  );
}

export function ProcessOverview({ onArticleOpen }: { onArticleOpen?: (articleId: string) => void }) {
  const { t } = useT();
  const [active, setActive] = useState<string>(PROCESS_STAGES[0]!.id);
  const stage = PROCESS_STAGES.find((s) => s.id === active) ?? PROCESS_STAGES[0]!;
  const article = stage.articleId ? articleById(stage.articleId) : undefined;

  return (
    <div data-testid="academy-process-overview" className="space-y-5">
      {/* Stage rail — horizontal scroll on mobile */}
      <ol className="flex gap-2 overflow-x-auto pb-2 dmx-thin-scroll" role="tablist" aria-label={t("wa.process.aria")}>
        {PROCESS_STAGES.map((s, i) => {
          const Icon = ICONS[s.icon] ?? FilePlus;
          const isActive = s.id === active;
          return (
            <li key={s.id} className="shrink-0">
              <button
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(s.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 w-[86px] px-2 py-2.5 rounded-xl border text-center transition-colors dmx-focus-ring",
                  isActive
                    ? "bg-ink-950 text-white border-ink-950"
                    : "bg-white text-ink-800 border-paper-200 hover:bg-paper-50",
                )}
              >
                <span className={cn(
                  "h-8 w-8 rounded-full grid place-items-center",
                  isActive ? "bg-white/10" : "bg-paper-100",
                )}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-[10px] font-medium leading-tight">
                  {i + 1}. {t(s.titleKey)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Active stage detail */}
      <div className="dmx-card p-5 space-y-3" role="tabpanel">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-base font-semibold tracking-tight">{t(stage.titleKey)}</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-paper-100 text-zinc-600 font-medium">
            {t("wa.process.workspace")}: {t(stage.workspaceKey)}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-paper-100 text-zinc-600 font-medium">
            {t("wa.process.actor")}: {t(stage.roleKey)}
          </span>
        </div>
        <p className="text-sm text-zinc-600 leading-relaxed">{t(stage.descKey)}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {article && (
            onArticleOpen ? (
              <button
                onClick={() => onArticleOpen(article.id)}
                className="text-xs font-medium text-accent-900 hover:underline dmx-focus-ring rounded"
              >
                {t("wa.process.readArticle")} →
              </button>
            ) : (
              <Link
                to={`/help/articles/${article.id}`}
                className="text-xs font-medium text-accent-900 hover:underline dmx-focus-ring rounded"
              >
                {t("wa.process.readArticle")} →
              </Link>
            )
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          {t("wa.chain.title")}
        </div>
        <WorkspaceChain animated />
        <p className="text-xs text-zinc-500 max-w-2xl leading-relaxed">{t("wa.chain.explain")}</p>
      </div>
    </div>
  );
}

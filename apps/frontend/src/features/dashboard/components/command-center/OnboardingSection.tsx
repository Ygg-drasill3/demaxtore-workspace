import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useT } from "@/i18n/useT";
import { GuidedOnboardingCard } from "@/features/onboarding/components/GuidedOnboardingCard";
import { CommodityBidOnboardingCard } from "@/features/onboarding/components/CommodityBidOnboardingCard";
import type { DashboardMode } from "../../lib/buyer-command-center";

export function OnboardingSection({ mode }: { mode: DashboardMode }) {
  const { t } = useT();
  const defaultCollapsed = mode !== "first_trade";
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section data-testid="cc-onboarding-section" className="dmx-card overflow-hidden">
      <button
        type="button"
        data-testid="cc-onboarding-toggle"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50/80"
      >
        <div>
          <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.knowledge")}</span>
          <h2 className="font-display text-lg font-semibold mt-0.5">{t("launch.buyer.sectionTitle")}</h2>
          <p className="text-xs text-zinc-500 mt-1">
            {mode === "first_trade"
              ? t("launch.buyer.sectionSubtitle.firstTrade")
              : t("launch.buyer.sectionSubtitle.experienced")}
          </p>
        </div>
        {collapsed ? <ChevronDown className="h-5 w-5 text-zinc-400" /> : <ChevronUp className="h-5 w-5 text-zinc-400" />}
      </button>
      {!collapsed && (
        <div data-testid="cc-onboarding-body" className="px-5 pb-5 space-y-4 border-t border-zinc-100 pt-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-sm" data-testid="buyer-onboarding-welcome">
            <h3 className="font-display font-semibold text-ink-900">{t("launch.buyer.welcomeTitle")}</h3>
            <p className="text-zinc-600 mt-1 leading-relaxed">{t("launch.buyer.welcomeBody")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/buyer/rfq/new" className="dmx-btn-primary text-xs">{t("launch.buyer.ctaRfq")}</Link>
              <Link to="/learning" className="dmx-btn-secondary text-xs">{t("launch.buyer.ctaLearning")}</Link>
            </div>
          </div>
          <GuidedOnboardingCard />
          <CommodityBidOnboardingCard />
        </div>
      )}
    </section>
  );
}

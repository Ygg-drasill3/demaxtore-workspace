import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useT } from "@/i18n/useT";
import { BUYER_ONBOARDING, TURKEY_BUYER_ONBOARDING } from "@/content/launch-copy";
import { GuidedOnboardingCard } from "@/features/onboarding/components/GuidedOnboardingCard";
import { CommodityBidOnboardingCard } from "@/features/onboarding/components/CommodityBidOnboardingCard";
import { isTurkeyImporterOperatingModel } from "@dmx/contracts/buyer-operating-model";
import type { DashboardMode } from "../../lib/buyer-command-center";

export function OnboardingSection({
  mode,
  buyerOperatingModel,
}: {
  mode: DashboardMode;
  buyerOperatingModel?: string | null;
}) {
  const { t } = useT();
  const turkey = isTurkeyImporterOperatingModel(buyerOperatingModel);
  const copy = turkey ? TURKEY_BUYER_ONBOARDING : BUYER_ONBOARDING;
  const stepPrefix = turkey ? "s43.onboarding.step" : "launch.buyer.step";
  const defaultCollapsed = mode !== "first_trade";
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section data-testid="cc-onboarding-section" data-onboarding-variant={turkey ? "turkey_importer" : "international"} className="dmx-card overflow-hidden">
      <button
        type="button"
        data-testid="cc-onboarding-toggle"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50/80"
      >
        <div>
          <span className="dmx-eyebrow text-zinc-500">{t("dash.eyebrow.knowledge")}</span>
          <h2 className="font-display text-lg font-semibold mt-0.5">
            {turkey ? t("s43.onboarding.sectionTitle", copy.sectionTitle) : t("launch.buyer.sectionTitle")}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {turkey
              ? (mode === "first_trade"
                ? t("s43.onboarding.sectionSubtitle.firstTrade", copy.sectionSubtitle.firstTrade)
                : t("s43.onboarding.sectionSubtitle.experienced", copy.sectionSubtitle.experienced))
              : (mode === "first_trade"
                ? t("launch.buyer.sectionSubtitle.firstTrade")
                : t("launch.buyer.sectionSubtitle.experienced"))}
          </p>
        </div>
        {collapsed ? <ChevronDown className="h-5 w-5 text-zinc-400" /> : <ChevronUp className="h-5 w-5 text-zinc-400" />}
      </button>
      {!collapsed && (
        <div data-testid="cc-onboarding-body" className="px-5 pb-5 space-y-4 border-t border-zinc-100 pt-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-sm" data-testid="buyer-onboarding-welcome">
            <h3 className="font-display font-semibold text-ink-900">
              {turkey ? t("s43.onboarding.welcomeTitle", copy.welcomeTitle) : t("launch.buyer.welcomeTitle")}
            </h3>
            <p className="text-zinc-600 mt-1 leading-relaxed">
              {turkey ? t("s43.onboarding.welcomeBody", copy.welcomeBody) : t("launch.buyer.welcomeBody")}
            </p>
            <ol className="mt-3 space-y-2 text-sm text-zinc-700" data-testid="buyer-onboarding-steps">
              {copy.steps.map((step, i) => (
                <li key={step.key} className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-semibold text-white">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-medium text-ink-900">
                      {turkey
                        ? t(`${stepPrefix}.${step.key}`, step.label)
                        : t(`launch.buyer.step.${step.key}`)}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {turkey
                        ? t(`${stepPrefix}.${step.key}.hint`, step.hint)
                        : t(`launch.buyer.step.${step.key}.hint`)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              {turkey ? (
                <Link to="/buyer/imports/new" className="dmx-btn-primary text-xs" data-testid="buyer-onboarding-cta">
                  {t("s43.onboarding.ctaImport", copy.ctaRfq)}
                </Link>
              ) : (
                <Link to="/buyer/rfq/new" className="dmx-btn-primary text-xs" data-testid="buyer-onboarding-cta">
                  {t("launch.buyer.ctaRfq")}
                </Link>
              )}
              <Link to="/learning" className="dmx-btn-secondary text-xs">
                {turkey ? t("s43.onboarding.ctaLearning", copy.ctaLearning) : t("launch.buyer.ctaLearning")}
              </Link>
            </div>
          </div>
          <GuidedOnboardingCard />
          <CommodityBidOnboardingCard />
        </div>
      )}
    </section>
  );
}

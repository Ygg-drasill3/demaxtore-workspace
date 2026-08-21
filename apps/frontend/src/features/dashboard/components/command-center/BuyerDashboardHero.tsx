import { Link } from "react-router-dom";
import { Route, Plus, AlertCircle, MessageSquare, LayoutDashboard, Ship, Gavel } from "lucide-react";
import { useT } from "@/i18n/useT";
import { isTurkeyImporterOperatingModel } from "@dmx/contracts/buyer-operating-model";
import type { CommandCenterKpis, DashboardMode } from "../../lib/buyer-command-center";

const MODE_ACCENT: Record<DashboardMode, string> = {
  first_trade: "text-emerald-300",
  standard: "text-white/80",
  power: "text-white/80",
};

interface Props {
  firstName: string;
  mode: DashboardMode;
  kpis?: CommandCenterKpis;
  loading?: boolean;
  buyerOperatingModel?: string | null;
}

export function BuyerDashboardHero({ firstName, mode, kpis, loading, buyerOperatingModel }: Props) {
  const turkey = isTurkeyImporterOperatingModel(buyerOperatingModel);
  return turkey
    ? <TurkeyImporterHero firstName={firstName} mode={mode} kpis={kpis} loading={loading} />
    : <InternationalBuyerHero firstName={firstName} mode={mode} kpis={kpis} loading={loading} />;
}

function InternationalBuyerHero({ firstName, mode, kpis, loading }: Omit<Props, "buyerOperatingModel">) {
  const { t } = useT();
  const accent = MODE_ACCENT[mode];
  const subtitle =
    mode === "first_trade"
      ? t("launch.buyer.sectionSubtitle.firstTrade")
      : mode === "power"
        ? t("dash.buyer.subtitle.power")
        : t("dash.buyer.subtitle.standard");
  const pendingActions = kpis?.pendingActions ?? 0;
  const liveAuctions = kpis?.liveAuctions ?? 0;
  const unreadMessages = kpis?.unreadMessages ?? 0;

  return (
    <section
      data-testid="buyer-dashboard-hero"
      data-hero-variant="international"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-950 via-[#0f1528] to-ink-800 text-white shadow-[0_8px_32px_rgba(11,16,32,0.28)]"
    >
      <HeroBackdrop />
      <div className="relative z-10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <LayoutDashboard className="h-4 w-4 text-white/90" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                {t("dash.buyer.eyebrow")}
              </span>
            </div>

            <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("dash.buyer.hello", undefined, { name: firstName })}
            </h1>
            <p className={`mt-2 max-w-xl text-sm leading-relaxed ${accent}`} data-testid="buyer-hero-subtitle">
              {subtitle}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatusPill
                icon={AlertCircle}
                label={t(pendingActions === 1 ? "dash.buyer.pill.action" : "dash.buyer.pill.actions")}
                value={loading ? "—" : pendingActions}
                highlight={!loading && pendingActions > 0}
                testId="hero-pill-actions"
              />
              <StatusPill
                icon={Gavel}
                label={t(liveAuctions === 1 ? "dash.buyer.pill.auction" : "dash.buyer.pill.auctions")}
                value={loading ? "—" : liveAuctions}
                highlight={!loading && liveAuctions > 0}
                testId="hero-pill-auctions"
              />
              <StatusPill
                icon={MessageSquare}
                label={t(unreadMessages === 1 ? "dash.buyer.pill.message" : "dash.buyer.pill.messages")}
                value={loading ? "—" : unreadMessages}
                highlight={!loading && unreadMessages > 0}
                testId="hero-pill-messages"
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Link
              to="/buyer/commoditybid/new"
              data-testid="buyer-create-cb"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-medium text-white transition-all hover:bg-white/15 hover:border-white/30"
            >
              <Gavel className="h-4 w-4" />
              {t("dash.buyer.createAuction")}
            </Link>
            <Link
              to="/buyer/rfq/new"
              data-testid="buyer-create-rfq"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-ink-950 shadow-lg shadow-black/20 transition-all hover:bg-paper-50"
            >
              <Plus className="h-4 w-4" />
              {t("dash.buyer.newRfq")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function TurkeyImporterHero({ firstName, mode, kpis, loading }: Omit<Props, "buyerOperatingModel">) {
  const { t } = useT();
  const accent = MODE_ACCENT[mode];
  const subtitle =
    mode === "first_trade"
      ? t("s43.hero.subtitle.firstTrade", "Manage freight, customs and your import journey in one place.")
      : mode === "power"
        ? t("s43.hero.subtitle.power", "Manage freight, customs and your import journey in one place.")
        : t("s43.hero.subtitle.standard", "Manage freight, customs and your import journey in one place.");
  const pendingActions = kpis?.pendingActions ?? 0;
  const inTransit = kpis?.shipmentsInTransit ?? 0;
  const unreadMessages = kpis?.unreadMessages ?? 0;

  return (
    <section
      data-testid="buyer-dashboard-hero"
      data-hero-variant="turkey_importer"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-950 via-[#0f1528] to-ink-800 text-white shadow-[0_8px_32px_rgba(11,16,32,0.28)]"
    >
      <HeroBackdrop />
      <div className="relative z-10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <LayoutDashboard className="h-4 w-4 text-white/90" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                {t("s43.hero.eyebrow", "Import operations")}
              </span>
            </div>

            <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("dash.buyer.hello", undefined, { name: firstName })}
            </h1>
            <p className={`mt-2 max-w-xl text-sm leading-relaxed ${accent}`} data-testid="buyer-hero-subtitle">
              {subtitle}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatusPill
                icon={AlertCircle}
                label={t("s43.hero.pill.actions", "action required")}
                value={loading ? "—" : pendingActions}
                highlight={!loading && pendingActions > 0}
                testId="hero-pill-actions"
              />
              <StatusPill
                icon={Ship}
                label={t("s43.hero.pill.inTransit", "in transit")}
                value={loading ? "—" : inTransit}
                highlight={!loading && inTransit > 0}
                testId="hero-pill-in-transit"
              />
              <StatusPill
                icon={MessageSquare}
                label={t(unreadMessages === 1 ? "dash.buyer.pill.message" : "dash.buyer.pill.messages")}
                value={loading ? "—" : unreadMessages}
                highlight={!loading && unreadMessages > 0}
                testId="hero-pill-messages"
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Link
              to="/buyer/freightiq/request"
              data-testid="buyer-get-freight-quote"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-medium text-white transition-all hover:bg-white/15 hover:border-white/30"
            >
              <Route className="h-4 w-4" />
              {t("s43.hero.ctaFreight", "Get freight quote")}
            </Link>
            <Link
              to="/buyer/imports/new"
              data-testid="buyer-start-import"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-ink-950 shadow-lg shadow-black/20 transition-all hover:bg-paper-50"
            >
              <Plus className="h-4 w-4" />
              {t("s43.hero.ctaStartImport", "Start import")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 28%, white 1px, transparent 1px), radial-gradient(circle at 72% 68%, white 1px, transparent 1px)",
          backgroundSize: "28px 28px, 44px 44px",
        }}
      />
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
    </>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
  highlight,
  testId,
}: {
  icon: typeof AlertCircle;
  label: string;
  value: number | string;
  highlight?: boolean;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
        highlight
          ? "bg-amber-500/15 text-amber-100 ring-amber-400/30"
          : "bg-white/[0.06] text-white/70 ring-white/10"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="tabular-nums">{value}</span>
      <span className="text-white/50">{label}</span>
    </div>
  );
}

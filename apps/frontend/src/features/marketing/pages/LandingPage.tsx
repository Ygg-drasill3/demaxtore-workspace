import { Link } from "react-router-dom";
import { ArrowRight, Container, Gavel, Package, Radar, Ship } from "lucide-react";
import { useT } from "@/i18n/useT";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

const PILLAR_ICONS = [Package, Gavel, Container, Ship] as const;
const PILLAR_KEYS = [
  { title: "launch.landing.pillar1.title", body: "launch.landing.pillar1.body" },
  { title: "launch.landing.pillar2.title", body: "launch.landing.pillar2.body" },
  { title: "launch.landing.pillar3.title", body: "launch.landing.pillar3.body" },
] as const;

export default function LandingPage() {
  const { t } = useT();

  return (
    <div data-testid="landing-page" className="min-h-screen bg-paper-50 text-ink-900">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-ink-950 text-white grid place-items-center font-bold text-sm">D</div>
            <span className="font-display text-lg font-semibold tracking-tight">DeMaxtore</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/login" data-testid="landing-sign-in" className="dmx-btn-secondary text-sm">
              {t("landing.signIn")}
            </Link>
            <Link to="/login" data-testid="landing-demo-cta" className="dmx-btn-primary text-sm">
              {t("landing.launchDemo")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 70%, white 1px, transparent 1px)",
            backgroundSize: "32px 32px, 48px 48px",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <p className="dmx-eyebrow text-zinc-400">{t("launch.landing.eyebrow")}</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mt-4 max-w-3xl leading-tight">
            {t("launch.landing.headline")}
          </h1>
          <p className="text-base sm:text-lg text-zinc-300 mt-6 max-w-2xl leading-relaxed">
            {t("launch.landing.subhead")}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/login" className="dmx-btn-primary bg-white text-ink-950 hover:bg-zinc-100 border-0">
              {t("launch.landing.ctaPrimary")}
            </Link>
            <Link to="/login" className="dmx-btn-secondary border-white/20 text-white hover:bg-white/10">
              {t("launch.landing.ctaSecondary")}
            </Link>
          </div>
          <p className="text-xs text-zinc-500 mt-4">{t("launch.landing.demoNote")}</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 sm:py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {PILLAR_KEYS.map((p, i) => {
            const Icon = PILLAR_ICONS[i] ?? Radar;
            return (
              <div key={p.title} data-testid={`landing-pillar-${i}`} className="dmx-card p-6">
                <div className="h-10 w-10 rounded-full bg-accent-50 text-accent-900 grid place-items-center mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-display text-lg font-semibold">{t(p.title)}</h2>
                <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{t(p.body)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">{t("landing.walkthrough.title")}</h2>
            <p className="text-sm text-zinc-600 mt-2 max-w-lg">{t("landing.walkthrough.body")}</p>
          </div>
          <Link to="/login" className="dmx-btn-primary shrink-0">
            {t("landing.goToSignIn")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-8 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} DeMaxtore · B2B Trade OS · v0.2
      </footer>
    </div>
  );
}

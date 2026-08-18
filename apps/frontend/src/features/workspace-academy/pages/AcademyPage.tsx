// apps/frontend/src/features/workspace-academy/pages/AcademyPage.tsx
//
// /help/getting-started — the permanent Academy home: full process overview,
// workspace chain, role journey, categories, search and restart action.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, GraduationCap, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n/useT";
import { useAuth } from "@/store/auth.store";
import { useTelemetry } from "@/features/telemetry/useTelemetry";
import { ProcessOverview } from "../components/ProcessOverview";
import { ACADEMY_CATEGORIES, articleById, articlesForRole } from "../lib/articles";
import { useWorkspaceAcademy } from "../context/WorkspaceAcademyProvider";
import type { AcademyArticle } from "../types/academy.types";

export default function AcademyPage() {
  const { t } = useT();
  const { track } = useTelemetry();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const { state, completeProcessOverview, viewArticle, restartOnboarding } = useWorkspaceAcademy();
  const [query, setQuery] = useState("");

  const articles = useMemo(() => (user ? articlesForRole(user.role) : []), [user]);

  useEffect(() => {
    track("academy.opened", { meta: { role: user?.role ?? null } });
    track("academy.process_overview_started", { meta: { role: user?.role ?? null } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reaching the Academy home and scrolling the overview counts as viewing it;
  // completion is recorded once (backend keeps the first timestamp).
  useEffect(() => {
    if (state && !state.processOverviewCompletedAt) {
      const timer = window.setTimeout(() => completeProcessOverview(), 4000);
      return () => window.clearTimeout(timer);
    }
  }, [state, completeProcessOverview]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return articles.filter((a) =>
      [t(a.titleKey), t(a.summaryKey), a.id, a.category, ...(a.keywords ?? [])]
        .join(" ").toLowerCase().includes(q),
    );
  }, [query, articles, t]);

  const recent = useMemo(
    () => (state?.recentArticleIds ?? [])
      .map((id) => articleById(id))
      .filter((a): a is AcademyArticle => Boolean(a && user && a.roles.includes(user.role)))
      .slice(0, 4),
    [state?.recentArticleIds, user],
  );

  const openArticle = (id: string) => {
    viewArticle(id);
    navigate(`/help/articles/${id}`);
  };

  return (
    <div data-testid="academy-page" className="max-w-5xl mx-auto space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-accent-900">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wide">{t("wa.page.eyebrow")}</span>
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t("wa.page.title")}</h1>
        <p className="text-sm text-zinc-600 max-w-2xl leading-relaxed">{t("wa.page.subtitle")}</p>
      </header>

      {/* Search */}
      <label className="relative block max-w-md">
        <Search className="h-4 w-4 text-zinc-400 absolute top-1/2 -translate-y-1/2 start-3" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("wa.help.searchPlaceholder")}
          aria-label={t("wa.help.searchPlaceholder")}
          className="w-full h-10 ps-9 pe-3 rounded-lg border border-paper-200 bg-white text-sm dmx-focus-ring"
        />
      </label>

      {results ? (
        <section>
          <h2 className="font-display text-base font-semibold mb-3">
            {t("wa.help.results", undefined, { count: results.length })}
          </h2>
          {results.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("wa.help.noResults")}</p>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-2">
              {results.map((a) => <ArticleCard key={a.id} article={a} onOpen={() => openArticle(a.id)} />)}
            </ul>
          )}
        </section>
      ) : (
        <>
          {/* Full process overview */}
          <section>
            <h2 className="font-display text-lg font-semibold tracking-tight mb-4">{t("wa.page.processTitle")}</h2>
            <ProcessOverview onArticleOpen={openArticle} />
          </section>

          {/* Recently viewed */}
          {recent.length > 0 && (
            <section>
              <h2 className="font-display text-base font-semibold mb-3">{t("wa.help.recent")}</h2>
              <ul className="grid sm:grid-cols-2 gap-2">
                {recent.map((a) => <ArticleCard key={a.id} article={a} onOpen={() => openArticle(a.id)} />)}
              </ul>
            </section>
          )}

          {/* Categories */}
          <section className="space-y-5">
            <h2 className="font-display text-base font-semibold">{t("wa.help.categories")}</h2>
            {ACADEMY_CATEGORIES.map((cat) => {
              const catArticles = articles.filter((a) => a.category === cat);
              if (catArticles.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                    {t(`wa.cat.${cat}`)}
                  </h3>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {catArticles.map((a) => <ArticleCard key={a.id} article={a} onOpen={() => openArticle(a.id)} />)}
                  </ul>
                </div>
              );
            })}
          </section>

          <footer className="pt-4 border-t border-paper-200 flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => void restartOnboarding()}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("wa.help.restart")}
            </Button>
            <Link to="/learning" className="text-xs text-zinc-500 hover:text-ink-900 hover:underline">
              {t("wa.page.learningLink")}
            </Link>
          </footer>
        </>
      )}
    </div>
  );
}

function ArticleCard({ article, onOpen }: { article: AcademyArticle; onOpen: () => void }) {
  const { t } = useT();
  return (
    <li>
      <button
        onClick={onOpen}
        className="w-full dmx-card p-4 text-start hover:shadow-modal transition-shadow dmx-focus-ring"
      >
        <div className="flex items-start gap-3">
          <span className="h-8 w-8 rounded-lg bg-paper-100 grid place-items-center text-zinc-500 shrink-0">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink-900">{t(article.titleKey)}</span>
            <span className="block text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{t(article.summaryKey)}</span>
          </span>
        </div>
      </button>
    </li>
  );
}

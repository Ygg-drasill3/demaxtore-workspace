// apps/frontend/src/features/workspace-academy/pages/AcademyArticlePage.tsx
//
// /help/articles/:articleId — one Academy article rendered from translation
// keys, with optional "open screen" and "launch guide" actions.
import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useT } from "@/i18n/useT";
import { useAuth } from "@/store/auth.store";
import { articleById, articlesForRole } from "../lib/articles";
import { guideById } from "../lib/guide-registry";
import { useWorkspaceAcademy } from "../context/WorkspaceAcademyProvider";

export default function AcademyArticlePage() {
  const { t } = useT();
  const { articleId = "" } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const { viewArticle, startGuide } = useWorkspaceAcademy();

  const article = articleById(articleId);
  // Role guard — restricted articles never render for ineligible roles.
  const allowed = Boolean(article && user && article.roles.includes(user.role));

  useEffect(() => {
    if (article && allowed) viewArticle(article.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, allowed]);

  const related = useMemo(() => {
    if (!article || !user) return [];
    return articlesForRole(user.role)
      .filter((a) => a.category === article.category && a.id !== article.id)
      .slice(0, 3);
  }, [article, user]);

  if (!article || !allowed) {
    return (
      <EmptyState
        title={t("wa.article.notFound")}
        body={t("wa.article.notFoundBody")}
        action={
          <Button size="sm" variant="secondary" onClick={() => navigate("/help/getting-started")}>
            {t("wa.article.backToAcademy")}
          </Button>
        }
      />
    );
  }

  const guide = article.guideId ? guideById(article.guideId) : undefined;
  const guideVisible = Boolean(guide && user && guide.roles.includes(user.role));

  return (
    <article data-testid="academy-article" className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/help/getting-started"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
        {t("wa.article.backToAcademy")}
      </Link>

      <header className="space-y-2">
        <div className="text-[11px] font-semibold text-accent-900 uppercase tracking-wide">
          {t(`wa.cat.${article.category}`)}
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t(article.titleKey)}</h1>
        <p className="text-sm text-zinc-500">{t(article.summaryKey)}</p>
      </header>

      <div className="dmx-card p-6 space-y-4">
        {article.bodyKeys.map((key) => (
          <p key={key} className="text-sm text-zinc-700 leading-relaxed">{t(key)}</p>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {article.relatedRoute && (
          <Button size="sm" variant="secondary" onClick={() => navigate(article.relatedRoute!)}>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            {t("wa.article.openScreen")}
          </Button>
        )}
        {guideVisible && guide && (
          <Button
            size="sm"
            onClick={() => {
              if (article.relatedRoute) navigate(article.relatedRoute);
              // Launch after navigation settles; launcher waits for elements.
              window.setTimeout(() => void startGuide(guide.id), 600);
            }}
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            {t("wa.article.launchGuide")}
          </Button>
        )}
      </div>

      {related.length > 0 && (
        <footer className="pt-4 border-t border-paper-200">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
            {t("wa.article.related")}
          </h2>
          <ul className="space-y-1">
            {related.map((a) => (
              <li key={a.id}>
                <Link to={`/help/articles/${a.id}`} className="text-sm text-accent-900 hover:underline">
                  {t(a.titleKey)}
                </Link>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  );
}

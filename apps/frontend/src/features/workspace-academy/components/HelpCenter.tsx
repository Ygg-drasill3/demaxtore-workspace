// apps/frontend/src/features/workspace-academy/components/HelpCenter.tsx
//
// Persistent help button (lower corner) + Help Center drawer with search,
// role-scoped categories, recently viewed guides, replay and restart actions.
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen, ChevronRight, GraduationCap, HelpCircle, LifeBuoy, Play, RotateCcw, Search, Sparkles,
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";
import { useAuth } from "@/store/auth.store";
import { useTelemetry } from "@/features/telemetry/useTelemetry";
import { ACADEMY_CATEGORIES, articleById, articlesForRole } from "../lib/articles";
import { guidesForRole, routeMatches } from "../lib/guide-registry";
import {
  BUYER_ALL_MAPPED_TOURS,
  TOUR_MAP_GROUP_ORDER,
  type BuyerTourMapEntry,
} from "../lib/buyerSidebarTours";
import { useWorkspaceAcademy } from "../context/WorkspaceAcademyProvider";
import type { AcademyArticle } from "../types/academy.types";

export function HelpCenterButton() {
  const { t } = useT();
  const { track } = useTelemetry();
  const [open, setOpen] = useState(false);
  const user = useAuth((s) => s.user);
  if (!user) return null;

  return (
    <>
      <button
        data-guide="help-center"
        data-testid="academy-help-button"
        aria-label={t("wa.help.open")}
        onClick={() => {
          setOpen(true);
          track("academy.help_center_opened", { meta: { role: user.role } });
        }}
        className={cn(
          "fixed bottom-4 right-4 rtl:right-auto rtl:left-4 z-40 h-11 w-11 rounded-full",
          "bg-ink-950 text-white shadow-modal grid place-items-center",
          "hover:bg-accent-900 transition-colors dmx-focus-ring",
          // keep clear of the mobile bottom nav
          "mb-14 lg:mb-0",
        )}
      >
        <HelpCircle className="h-5 w-5" aria-hidden="true" />
      </button>
      <HelpCenterPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function HelpCenterPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const { track } = useTelemetry();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const { state, startGuide, restartOnboarding, viewArticle } = useWorkspaceAcademy();
  const [query, setQuery] = useState("");

  const articles = useMemo(() => (user ? articlesForRole(user.role) : []), [user]);
  const guides = useMemo(() => (user ? guidesForRole(user.role) : []), [user]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    track("academy.search_used", { meta: { role: user?.role ?? null } });
    return articles.filter((a) => {
      const hay = [
        t(a.titleKey), t(a.summaryKey), a.id, a.category,
        ...(a.keywords ?? []), a.relatedRoute ?? "",
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, articles, t]);

  const recentArticles = useMemo(
    () => (state?.recentArticleIds ?? [])
      .map((id) => articleById(id))
      .filter((a): a is AcademyArticle => Boolean(a && user && a.roles.includes(user.role)))
      .slice(0, 4),
    [state?.recentArticleIds, user],
  );

  /** All guides for the current page (base + feature unlocks) for replay. */
  const currentPageGuides = useMemo(
    () => guides.filter((g) => routeMatches(g.routeMatcher, location.pathname)),
    [guides, location.pathname],
  );

  const openArticle = (id: string) => {
    viewArticle(id);
    onClose();
    navigate(`/help/articles/${id}`);
  };

  if (!user) return null;

  return (
    <Drawer open={open} onClose={onClose} title={t("wa.help.title")} width="md" testId="academy-help-panel">
      <div className="p-4 space-y-5">
        {/* Search */}
        <label className="relative block">
          <Search className="h-4 w-4 text-zinc-400 absolute top-1/2 -translate-y-1/2 start-3" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("wa.help.searchPlaceholder")}
            aria-label={t("wa.help.searchPlaceholder")}
            data-testid="academy-search-input"
            className="w-full h-10 ps-9 pe-3 rounded-lg border border-paper-200 bg-paper-50 text-sm dmx-focus-ring"
          />
        </label>

        {/* Search results */}
        {results && (
          <section aria-live="polite">
            <SectionTitle>{t("wa.help.results", undefined, { count: results.length })}</SectionTitle>
            {results.length === 0 ? (
              <p className="text-xs text-zinc-500">{t("wa.help.noResults")}</p>
            ) : (
              <ul className="space-y-1">
                {results.slice(0, 10).map((a) => (
                  <li key={a.id}>
                    <ArticleRow article={a} onOpen={() => openArticle(a.id)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!results && (
          <>
            {/* Quick actions */}
            <section className="space-y-2">
              <button
                onClick={() => { onClose(); navigate("/help/getting-started"); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-paper-200 hover:bg-paper-50 text-start dmx-focus-ring"
                data-testid="academy-open-getting-started"
              >
                <GraduationCap className="h-5 w-5 text-accent-900 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-medium text-ink-900">{t("wa.help.gettingStarted")}</span>
                  <span className="block text-[11px] text-zinc-500">{t("wa.help.gettingStartedSub")}</span>
                </span>
              </button>

              {currentPageGuides.length > 0 && (
                <div className="space-y-2" data-testid="academy-replay-guides">
                  <p className="text-[11px] text-zinc-500 px-0.5">{t("wa.help.replayHereSub")}</p>
                  {currentPageGuides.map((guide) => (
                    <button
                      key={guide.id}
                      onClick={() => {
                        onClose();
                        window.setTimeout(() => {
                          track("academy.contextual_help_opened", { meta: { guideId: guide.id, role: user.role } });
                          void startGuide(guide.id);
                        }, 220);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border text-start dmx-focus-ring",
                        "border-accent-900/15 bg-gradient-to-r from-accent-50 to-white",
                        "hover:border-accent-900/30 hover:shadow-card transition-all duration-200",
                      )}
                      data-testid={`academy-replay-guide-${guide.id}`}
                    >
                      <span className="h-9 w-9 shrink-0 rounded-xl bg-accent-900 text-white grid place-items-center shadow-modal">
                        <Play className="h-3.5 w-3.5 fill-current translate-x-px" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-ink-900">{t("wa.help.replayHere")}</span>
                        <span className="block text-[11px] text-accent-900/80 mt-0.5 font-medium">{t(guide.titleKey)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Recently viewed */}
            {recentArticles.length > 0 && (
              <section>
                <SectionTitle>{t("wa.help.recent")}</SectionTitle>
                <ul className="space-y-1">
                  {recentArticles.map((a) => (
                    <li key={a.id}><ArticleRow article={a} onOpen={() => openArticle(a.id)} /></li>
                  ))}
                </ul>
              </section>
            )}

            {/* Explore every sidebar + inner page tour */}
            {user.role === "BUYER" && (
              <section data-testid="academy-tour-map">
                <SectionTitle>{t("wa.help.tourMap")}</SectionTitle>
                <p className="text-[11px] text-zinc-500 mb-2">{t("wa.help.tourMapSub")}</p>
                <div className="space-y-3">
                  {TOUR_MAP_GROUP_ORDER.map((group) => {
                    const rows = BUYER_ALL_MAPPED_TOURS.filter((e) => e.group === group);
                    if (rows.length === 0) return null;
                    return (
                      <div key={group}>
                        <div className="text-[11px] font-semibold text-zinc-500 mb-1">
                          {t(`wa.help.tourMapGroup.${group}`)}
                        </div>
                        <ul className="space-y-0.5">
                          {rows.map((entry) => (
                            <li key={entry.guideId}>
                              <TourMapRow
                                entry={entry}
                                onPlay={() => {
                                  onClose();
                                  track("academy.contextual_help_opened", {
                                    meta: { guideId: entry.guideId, path: entry.path, role: user.role },
                                  });
                                  const samePage = location.pathname === entry.path;
                                  if (!samePage) navigate(entry.path);
                                  window.setTimeout(() => { void startGuide(entry.guideId); }, samePage ? 220 : 700);
                                }}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Categories */}
            <section>
              <SectionTitle>{t("wa.help.categories")}</SectionTitle>
              <div className="space-y-3">
                {ACADEMY_CATEGORIES.map((cat) => {
                  const catArticles = articles.filter((a) => a.category === cat);
                  if (catArticles.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="text-[11px] font-semibold text-zinc-500 mb-1">{t(`wa.cat.${cat}`)}</div>
                      <ul className="space-y-0.5">
                        {catArticles.map((a) => (
                          <li key={a.id}><ArticleRow article={a} onOpen={() => openArticle(a.id)} /></li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Footer actions */}
            <section className="pt-2 border-t border-paper-200 space-y-2">
              <Button
                variant="secondary" size="sm" className="w-full"
                onClick={async () => { await restartOnboarding(); onClose(); }}
                data-testid="academy-restart-onboarding"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {t("wa.help.restart")}
              </Button>
              <a
                href="mailto:support@demaxtore.com"
                className="w-full inline-flex items-center justify-center gap-2 h-8 text-xs text-zinc-500 hover:text-ink-900 dmx-focus-ring rounded"
              >
                <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
                {t("wa.help.contact")}
              </a>
            </section>
          </>
        )}
      </div>
    </Drawer>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      {children}
    </h3>
  );
}

function ArticleRow({ article, onOpen }: { article: AcademyArticle; onOpen: () => void }) {
  const { t } = useT();
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-paper-50 text-start dmx-focus-ring"
    >
      <BookOpen className="h-3.5 w-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
      <span className="text-xs text-ink-900 truncate">{t(article.titleKey)}</span>
    </button>
  );
}

function TourMapRow({ entry, onPlay }: { entry: BuyerTourMapEntry; onPlay: () => void }) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={onPlay}
      data-testid={`academy-tour-map-${entry.guideId}`}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-paper-50 text-start dmx-focus-ring group"
    >
      <Play className="h-3.5 w-3.5 text-accent-900 shrink-0" aria-hidden="true" />
      <span className="text-xs text-ink-900 truncate flex-1">{t(entry.labelKey)}</span>
      <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-accent-900 shrink-0" aria-hidden="true" />
    </button>
  );
}

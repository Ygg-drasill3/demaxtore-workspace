import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Scale, Plus, List } from "lucide-react";
import { bulkContainerApi } from "../lib/bulk-container.api";
import { RecentRequestsPanel } from "@/features/navigation/components/RecentRequestsPanel";
import { useT } from "@/i18n/useT";

export default function BulkContainerHomePage() {
  const { t } = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["bc-requests"],
    queryFn: () => bulkContainerApi.list(),
  });

  const recentRows = (data?.items ?? []).map((r) => ({
    id: r.id,
    externalRef: r.externalRef,
    state: r.state,
    updatedAt: r.updatedAt,
    detailHref: `/buyer/bulk-container/requests/${r.id}`,
  }));

  return (
    <div data-testid="bc-home-page" className="max-w-[1200px] mx-auto space-y-8 animate-fade-in">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight">{t("bc.home.title")}</h1>
        <p className="text-sm text-zinc-600 mt-3 max-w-2xl leading-relaxed">
          {t(
            "bc.home.subtitle",
            "Plan a single-commodity load by metric ton. Add specification lines, check capacity, then request pricing.",
          )}
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link to="/buyer/bulk-container/catalog" data-testid="bc-build-cta">
          <Button size="lg"><Plus className="h-4 w-4" /> {t("bc.home.build", "Build bulk load")}</Button>
        </Link>
        <Link to="/buyer/bulk-container/requests">
          <Button variant="secondary" size="lg"><List className="h-4 w-4" /> {t("bc.home.viewMine", "My requests")}</Button>
        </Link>
      </div>

      <RecentRequestsPanel
        title={t("bc.home.recent", "Recent bulk loads")}
        rows={recentRows}
        isLoading={isLoading}
        emptyHint={t("bc.home.empty", "No bulk loads yet. Start by building your first request.")}
        viewAllHref="/buyer/bulk-container/requests"
        testId="bc-home-recent"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: t("bc.home.step1", "Pick products"), desc: t("bc.home.step1.desc", "Browse categories and specification cards.") },
          { title: t("bc.home.step2", "Plan by ton"), desc: t("bc.home.step2.desc", "25 MT capacity with clear fill warnings.") },
          { title: t("bc.home.step3", "Request pricing"), desc: t("bc.home.step3.desc", "Operations sources suppliers after you submit.") },
        ].map((s) => (
          <div key={s.title} className="dmx-card p-5">
            <Scale className="h-5 w-5 text-accent-900 mb-2" />
            <h3 className="font-medium">{s.title}</h3>
            <p className="text-sm text-zinc-600 mt-1">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

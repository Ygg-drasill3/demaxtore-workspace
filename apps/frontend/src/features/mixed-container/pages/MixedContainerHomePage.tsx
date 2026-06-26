import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Package, Plus, List } from "lucide-react";
import { mixedContainerApi } from "../lib/mixed-container.api";
import { RecentRequestsPanel } from "@/features/navigation/components/RecentRequestsPanel";
import { useT } from "@/i18n/useT";

export default function MixedContainerHomePage() {
  const { t } = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["mc-requests"],
    queryFn: () => mixedContainerApi.list(),
  });

  const recentRows = (data?.items ?? []).map((r) => ({
    id: r.id,
    externalRef: r.externalRef,
    state: r.state,
    updatedAt: r.updatedAt,
    detailHref: `/buyer/mixed-container/requests/${r.id}`,
  }));

  return (
    <div data-testid="mc-home-page" className="max-w-[1200px] mx-auto space-y-8 animate-fade-in">
      <header>
        <span className="dmx-eyebrow text-zinc-500">Buyer · Mixed Container</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">{t("mc.home.title")}</h1>
        <p className="text-sm text-zinc-600 mt-3 max-w-2xl leading-relaxed">
          {t("mc.home.subtitle")}
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link to="/buyer/mixed-container/catalog" data-testid="mc-build-container-cta">
          <Button size="lg"><Plus className="h-4 w-4" /> Build Mixed Container</Button>
        </Link>
        <Link to="/buyer/mixed-container/requests" data-testid="mc-view-containers-cta">
          <Button variant="secondary" size="lg"><List className="h-4 w-4" /> View My Containers</Button>
        </Link>
      </div>

      <RecentRequestsPanel
        title="Recent mixed containers"
        rows={recentRows}
        isLoading={isLoading}
        emptyHint="No containers yet. Start by building your first mixed container."
        viewAllHref="/buyer/mixed-container/requests"
        testId="mc-home-recent"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: "Discover products", desc: "Browse categories and add products by pallet count." },
          { title: "Plan your container", desc: "Fill meter, estimated value, partial containers allowed." },
          { title: "Request live pricing", desc: "DeMaxtore sources suppliers — response in 24–48 hours." },
        ].map((s) => (
          <div key={s.title} className="dmx-card p-5">
            <Package className="h-5 w-5 text-accent-900 mb-2" />
            <h3 className="font-medium">{s.title}</h3>
            <p className="text-sm text-zinc-600 mt-1">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

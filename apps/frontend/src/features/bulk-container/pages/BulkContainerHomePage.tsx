import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Scale, Plus, List } from "lucide-react";
import { bulkContainerApi } from "../lib/bulk-container.api";
import { RecentRequestsPanel } from "@/features/navigation/components/RecentRequestsPanel";

export default function BulkContainerHomePage() {
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
        <span className="dmx-eyebrow text-zinc-500">Buyer · BulkContainer</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">BulkContainer</h1>
        <p className="text-sm text-zinc-600 mt-3 max-w-2xl leading-relaxed">
          Plan a 25 MT bulk procurement container by metric ton and technical specification.
          Build specification lines, review capacity, and submit a procurement request.
          This is a professional sourcing workspace — not a retail checkout.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link to="/buyer/bulk-container/catalog" data-testid="bc-build-cta">
          <Button size="lg"><Plus className="h-4 w-4" /> Build Bulk Container</Button>
        </Link>
        <Link to="/buyer/bulk-container/requests">
          <Button variant="secondary" size="lg"><List className="h-4 w-4" /> View My Requests</Button>
        </Link>
      </div>

      <RecentRequestsPanel
        title="Recent bulk containers"
        rows={recentRows}
        isLoading={isLoading}
        emptyHint="No bulk containers yet. Start by building your first procurement request."
        viewAllHref="/buyer/bulk-container/requests"
        testId="bc-home-recent"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: "Discover bulk products", desc: "Browse categories and specification cards by product type." },
          { title: "Plan by metric ton", desc: "25 MT capacity meter with partial and over-capacity warnings." },
          { title: "Submit procurement request", desc: "Operations sources suppliers after you submit — no auction." },
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

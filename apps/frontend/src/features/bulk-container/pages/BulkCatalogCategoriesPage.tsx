import { isAxiosError } from "axios";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { bulkCatalogApi, bulkContainerApi } from "../lib/bulk-container.api";
import { Button } from "@/components/ui/Button";
import { useBulkContainerSession } from "../lib/useBulkContainerSession";
import { toast } from "@/store/toast.store";

export default function BulkCatalogCategoriesPage() {
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const { containerId, withContainerId } = useBulkContainerSession();
  const { data, isLoading } = useQuery({
    queryKey: ["bc-categories"],
    queryFn: () => bulkCatalogApi.categories(),
  });

  const startContainer = async () => {
    setCreating(true);
    try {
      const bc = await bulkContainerApi.create({ currency: "USD" });
      nav(`/buyer/bulk-container/requests/${bc.id}`);
    } catch (e: unknown) {
      if (isAxiosError<{ error?: { code?: string; details?: { workspaceId?: string } } }>(e)) {
        const openId = e.response?.data?.error?.details?.workspaceId;
        if (e.response?.data?.error?.code === "OPEN_BULK_CONTAINER_EXISTS" && openId) {
          toast.warning("Open container exists", "Finish filling your current container (100% MT) before starting a new one.");
          nav(`/buyer/bulk-container/requests/${openId}`);
          return;
        }
      }
      throw e;
    } finally {
      setCreating(false);
    }
  };

  return (
    <div data-testid="bc-catalog-categories" data-guide="bc-catalog" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          {containerId ? (
            <Link
              to={`/buyer/bulk-container/requests/${containerId}`}
              className="text-xs text-zinc-500 hover:underline"
            >
              ← Back to container
            </Link>
          ) : (
            <Link to="/buyer/bulk-container" className="text-xs text-zinc-500 hover:underline">← BulkContainer</Link>
          )}
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Browse Bulk Catalog</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {containerId
              ? "Add more specification lines to your current container."
              : "Select a category to discover specification cards."}
          </p>
        </div>
        {!containerId && (
          <Button onClick={() => void startContainer()} disabled={creating} data-testid="bc-new-container">
            {creating ? "Creating…" : "New Container"}
          </Button>
        )}
      </header>

      {isLoading && <div className="dmx-card p-8 animate-pulse h-40" />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data?.items ?? []).map((cat) => (
          <Link
            key={cat.id}
            to={withContainerId(`/buyer/bulk-container/catalog/${cat.slug}`)}
            data-testid={`bc-category-${cat.slug}`}
            className="dmx-card dmx-card-hover p-5 block"
          >
            <h2 className="font-display text-xl font-semibold">{cat.name}</h2>
            <p className="text-sm text-zinc-500 mt-1">{cat.productCount} products</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

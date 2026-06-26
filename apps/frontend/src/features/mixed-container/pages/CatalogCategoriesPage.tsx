import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogApi, mixedContainerApi } from "../lib/mixed-container.api";
import { Button } from "@/components/ui/Button";

export default function CatalogCategoriesPage() {
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["mc-categories"], queryFn: () => catalogApi.categories() });

  const startContainer = async () => {
    setCreating(true);
    try {
      const mc = await mixedContainerApi.create({ containerType: "CONTAINER_40FT", currency: "USD" });
      nav(`/buyer/mixed-container/requests/${mc.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div data-testid="mc-catalog-categories" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/buyer/mixed-container" className="text-xs text-zinc-500 hover:underline">← Mixed Container</Link>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Browse Catalog</h1>
          <p className="text-sm text-zinc-500 mt-1">Select a category to discover products. Supplier identities are hidden.</p>
        </div>
        <Button data-testid="mc-new-container-btn" onClick={() => void startContainer()} disabled={creating}>
          {creating ? "Creating…" : "New Container"}
        </Button>
      </header>

      {isLoading && <div className="dmx-card p-8 animate-pulse h-40" />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data?.items ?? []).map((cat) => (
          <Link
            key={cat.id}
            to={`/buyer/mixed-container/catalog/${cat.slug}`}
            data-testid={`mc-category-${cat.slug}`}
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

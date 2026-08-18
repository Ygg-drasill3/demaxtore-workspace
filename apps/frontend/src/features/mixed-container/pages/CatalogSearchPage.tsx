import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../lib/mixed-container.api";
import { useContainerSession } from "../lib/useContainerSession";
import { CatalogProductCard } from "../components/CatalogProductCard";

export default function CatalogSearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const { withContainerId } = useContainerSession();

  const { data: categories } = useQuery({
    queryKey: ["mc-categories"],
    queryFn: () => catalogApi.categories(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["mc-search", q, category],
    queryFn: () =>
      catalogApi.products({
        q,
        ...(category ? { category } : {}),
        limit: 48,
      }),
    enabled: q.length > 0,
  });

  return (
    <div data-testid="mc-catalog-search-results" data-guide="mc-catalog-search" className="space-y-6">
      <header>
        <Link to={withContainerId("/buyer/mixed-container/catalog")} className="text-xs text-zinc-500 hover:underline">
          ← All categories
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight mt-2">
          Search results
        </h1>
        {q && <p className="text-sm text-zinc-500 mt-1">“{q}”</p>}
      </header>

      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm flex items-center gap-2">
          <span className="text-xs uppercase text-zinc-500">Category</span>
          <select
            value={category}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set("category", e.target.value);
              else next.delete("category");
              window.location.href = withContainerId(
                `/buyer/mixed-container/catalog/search?${next.toString()}`,
              );
            }}
            className="h-9 px-2 border rounded-lg text-sm"
            data-testid="mc-filter-category"
          >
            <option value="">All categories</option>
            {(categories?.items ?? []).map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <div className="dmx-card p-8 animate-pulse h-40" />}

      {!q && (
        <p className="text-sm text-zinc-500">Enter a search term to find products.</p>
      )}

      {data && data.items.length === 0 && q && (
        <p className="text-sm text-zinc-500">No products found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {(data?.items ?? []).map((p) => (
          <CatalogProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

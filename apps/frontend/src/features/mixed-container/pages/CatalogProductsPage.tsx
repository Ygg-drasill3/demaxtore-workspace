import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../lib/mixed-container.api";
import { useContainerSession } from "../lib/useContainerSession";
import { CatalogProductCard } from "../components/CatalogProductCard";

export default function CatalogProductsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { withContainerId } = useContainerSession();

  const { data: categories } = useQuery({
    queryKey: ["mc-categories"],
    queryFn: () => catalogApi.categories(),
  });
  const category = categories?.items.find((c) => c.slug === slug);

  const { data, isLoading } = useQuery({
    queryKey: ["mc-products", slug],
    queryFn: () => catalogApi.products({ category: slug! }),
    enabled: !!slug,
  });

  return (
    <div data-testid="mc-catalog-products" className="space-y-6">
      <header>
        <Link to={withContainerId("/buyer/mixed-container/catalog")} className="text-xs text-zinc-500 hover:underline">
          ← {category?.industryName ?? "Food & Beverages"}
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight mt-2">
          {category?.name ?? slug?.replace(/-/g, " ")}
        </h1>
        {category?.description && <p className="text-sm text-zinc-600 mt-2 max-w-2xl">{category.description}</p>}
      </header>

      {isLoading && <div className="dmx-card p-8 animate-pulse h-40" />}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {(data?.items ?? []).map((p) => (
          <CatalogProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

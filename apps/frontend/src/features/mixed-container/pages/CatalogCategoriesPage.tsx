import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../lib/mixed-container.api";
import { useContainerSession } from "../lib/useContainerSession";
import { CategoryVisualCard } from "../components/CategoryVisualCard";

const FOOD_BEVERAGES_SLUG = "food-beverages";

export default function CatalogCategoriesPage() {
  const { withContainerId } = useContainerSession();
  const { data: industries, isLoading: industriesLoading } = useQuery({
    queryKey: ["mc-industries"],
    queryFn: () => catalogApi.industries(),
  });
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["mc-categories", FOOD_BEVERAGES_SLUG],
    queryFn: () => catalogApi.categories(FOOD_BEVERAGES_SLUG),
  });

  const industry = industries?.items.find((i) => i.slug === FOOD_BEVERAGES_SLUG) ?? industries?.items[0];
  const isLoading = industriesLoading || categoriesLoading;

  return (
    <div data-testid="mc-catalog-categories" data-guide="mc-catalog-categories" className="space-y-6">
      <header>
        <Link to="/buyer/mixed-container" className="text-xs text-zinc-500 hover:underline">
          ← Mixed container
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight mt-2">Browse Categories</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {industry ? (
            <span data-testid="mc-industry-label">{industry.name}</span>
          ) : (
            "Select a category to discover products."
          )}
        </p>
      </header>

      {isLoading && <div className="dmx-card p-8 animate-pulse h-40" />}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {(categories?.items ?? []).map((cat) => (
          <CategoryVisualCard
            key={cat.id}
            category={cat}
            href={withContainerId(`/buyer/mixed-container/catalog/${cat.slug}`)}
          />
        ))}
      </div>
    </div>
  );
}

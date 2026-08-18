import { Link } from "react-router-dom";
import type { CatalogCategoryDTO } from "@dmx/contracts/mixed-container-catalog";
import { categoryGradient } from "../lib/categoryVisuals";

export function CategoryVisualCard({
  category,
  href,
}: {
  category: CatalogCategoryDTO;
  href: string;
}) {
  return (
    <Link
      to={href}
      data-testid={`mc-category-${category.slug}`}
      className="dmx-card dmx-card-hover overflow-hidden block group"
    >
      <div
        className={`aspect-[16/9] bg-gradient-to-br ${categoryGradient(category.slug)} flex items-center justify-center overflow-hidden`}
      >
        {category.imageUrl ? (
          <img src={category.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <span className="text-4xl font-display font-semibold text-white/80 group-hover:scale-105 transition-transform">
            {category.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="p-5">
        <h2 className="font-display text-xl font-semibold">{category.name}</h2>
        <p className="text-sm text-accent-900 mt-1">{category.productCount} Products</p>
        {category.description && (
          <p className="text-sm text-zinc-600 mt-2 line-clamp-2">{category.description}</p>
        )}
      </div>
    </Link>
  );
}

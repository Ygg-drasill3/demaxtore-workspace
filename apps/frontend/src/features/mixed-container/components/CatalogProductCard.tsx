import { Link } from "react-router-dom";
import type { CatalogProductDiscoveryDTO } from "@dmx/contracts/mixed-container-catalog";
import { useContainerSession } from "../lib/useContainerSession";

export function CatalogProductCard({ product }: { product: CatalogProductDiscoveryDTO }) {
  const { withContainerId } = useContainerSession();

  const packagingSummary =
    product.packagingOptions.length > 0
      ? product.packagingOptions.map((p) => p.name).join(", ")
      : null;

  return (
    <Link
      to={withContainerId(`/buyer/mixed-container/catalog/${product.categorySlug}/${product.productRef}`)}
      data-testid={`mc-product-card-${product.productRef}`}
      className="dmx-card dmx-card-hover p-5 flex flex-col block"
    >
      <div className="aspect-[4/3] bg-paper-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <span className="text-xs text-zinc-400">No image</span>
        )}
      </div>
      <span className="text-[10px] uppercase tracking-wider text-accent-900">{product.category}</span>
      <h3 className="font-medium mt-1">{product.name}</h3>
      {product.shortDescription && (
        <p className="text-sm text-zinc-600 mt-2 line-clamp-2">{product.shortDescription}</p>
      )}
      {packagingSummary && (
        <p className="text-xs text-zinc-500 mt-2" data-testid={`mc-packaging-options-${product.productRef}`}>
          {packagingSummary}
        </p>
      )}
      <p className="text-xs text-accent-900 mt-4 font-medium">View product →</p>
    </Link>
  );
}

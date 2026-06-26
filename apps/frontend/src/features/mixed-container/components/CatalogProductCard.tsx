import type { CatalogProductCardDTO } from "@dmx/contracts/mixed-container-catalog";
import { Button } from "@/components/ui/Button";

const MARKET_LABEL: Record<string, string> = {
  STABLE: "Stable",
  RISING: "Rising demand",
  SHORT: "Supply short",
};

export function CatalogProductCard({
  product,
  onAdd,
}: {
  product: CatalogProductCardDTO;
  onAdd: () => void;
}) {
  const range =
    product.indicativeLow != null && product.indicativeHigh != null
      ? `$${product.indicativeLow.toLocaleString()} – $${product.indicativeHigh.toLocaleString()} / pallet`
      : "Indicative range pending";

  return (
    <article data-testid={`mc-product-card-${product.productRef}`} className="dmx-card p-5 flex flex-col">
      <div className="aspect-[4/3] bg-paper-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-zinc-400">No image</span>
        )}
      </div>
      <span className="text-[10px] uppercase tracking-wider text-accent-900">{product.category}</span>
      <h3 className="font-medium mt-1">{product.name}</h3>
      <p className="text-xs text-zinc-400">{product.productRef}</p>
      <p className="text-sm text-zinc-600 mt-2">{product.packagingDescription}</p>
      {product.packingTypes.length > 0 && (
        <p className="text-xs text-zinc-500 mt-1" data-testid={`mc-packing-types-${product.productRef}`}>
          Packing: {product.packingTypes.map((p) => p.name).join(", ")}
        </p>
      )}
      <p className="text-xs text-zinc-500 mt-1">MOQ: {product.moqPallets} pallet{product.moqPallets > 1 ? "s" : ""} · {product.unitsPerPallet} units/pallet</p>
      {product.sampleAvailable && (
        <span data-testid="mc-sample-badge" className="text-xs text-green-700 mt-1">Sample available</span>
      )}
      <p className="text-xs text-zinc-500 mt-2">{product.supplierAvailabilityLabel}</p>
      <p className="text-xs mt-1">Market: {MARKET_LABEL[product.marketStatus] ?? product.marketStatus}</p>
      <p className="text-sm font-medium mt-2">{range}</p>
      <p className="text-[10px] text-zinc-400 mt-1">Indicative only · Updated {new Date(product.updatedAt).toLocaleDateString()}</p>
      <div className="mt-4 pt-3 border-t border-zinc-100">
        <Button
          data-testid={`mc-add-to-container-${product.productRef}`}
          className="w-full"
          onClick={onAdd}
        >
          Add To Container
        </Button>
      </div>
    </article>
  );
}

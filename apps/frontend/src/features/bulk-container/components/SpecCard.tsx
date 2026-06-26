import type { BulkCatalogProductCardDTO } from "../lib/bulk-container.api";
import { Button } from "@/components/ui/Button";

const MARKET_LABEL: Record<string, string> = {
  STABLE: "Stable",
  RISING: "Rising demand",
  SHORT: "Supply short",
};

export function SpecCard({
  product,
  onAdd,
}: {
  product: BulkCatalogProductCardDTO;
  onAdd: () => void;
}) {
  const range =
    product.indicativeRangeLabel ??
    (product.indicativeLow != null && product.indicativeHigh != null
      ? `$${product.indicativeLow.toLocaleString()} – $${product.indicativeHigh.toLocaleString()} / MT`
      : "Indicative range pending");

  const specParams = product.specTemplate.schema.parameters.slice(0, 4);

  return (
    <article data-testid={`bc-product-card-${product.productRef}`} className="dmx-card p-5 flex flex-col border-l-4 border-l-accent-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-accent-900">{product.category}</span>
          <h3 className="font-display text-lg font-semibold mt-1">{product.name}</h3>
          <p className="text-xs text-zinc-400 font-mono">{product.productRef}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 shrink-0">
          {product.specTemplate.productType}
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-xs uppercase text-zinc-500">Standard packing</dt>
          <dd className="text-zinc-800 mt-0.5">{product.standardPacking}</dd>
        </div>
        {product.packingTypes.length > 0 && (
          <div>
            <dt className="text-xs uppercase text-zinc-500">Available packing types</dt>
            <dd className="text-zinc-800 mt-0.5" data-testid={`bc-packing-types-${product.productRef}`}>
              {product.packingTypes.map((p) => p.name).join(", ")}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xs uppercase text-zinc-500">Specification template</dt>
          <dd className="text-zinc-800 mt-0.5">{product.specTemplate.name}</dd>
        </div>
        {specParams.length > 0 && (
          <div>
            <dt className="text-xs uppercase text-zinc-500">Key parameters</dt>
            <dd className="text-zinc-600 mt-0.5 text-xs">
              {specParams.map((p) => p.label).join(" · ")}
              {product.specTemplate.schema.parameters.length > 4 && " · …"}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-3 pt-3 border-t border-zinc-100 space-y-1">
        <p className="text-xs text-zinc-500">MOQ: {product.minOrderMt} MT</p>
        <p className="text-xs">Market: {MARKET_LABEL[product.marketStatus] ?? product.marketStatus}</p>
        <p className="text-sm font-medium">{range}</p>
        <p className="text-[10px] text-zinc-400">Indicative only · Updated {new Date(product.updatedAt).toLocaleDateString()}</p>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100">
        <Button
          data-testid={`bc-add-spec-${product.productRef}`}
          className="w-full"
          onClick={onAdd}
        >
          Add Specification Line
        </Button>
      </div>
    </article>
  );
}

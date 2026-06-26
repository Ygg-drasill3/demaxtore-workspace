import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { catalogApi, mixedContainerApi } from "../lib/mixed-container.api";
import { CatalogProductCard } from "../components/CatalogProductCard";
import { AddToContainerModal } from "../components/AddToContainerModal";
import type { CatalogProductCardDTO } from "@dmx/contracts/mixed-container-catalog";
import { CATALOG_MARKET_STATUS } from "@dmx/contracts/mixed-container-catalog";

export default function CatalogProductsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const containerId = params.get("containerId") ?? undefined;
  const qc = useQueryClient();
  const [selected, setSelected] = useState<CatalogProductCardDTO | null>(null);
  const [sampleOnly, setSampleOnly] = useState(false);
  const [marketStatus, setMarketStatus] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [certification, setCertification] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["mc-products", slug, sampleOnly, marketStatus, originCountry, certification],
    queryFn: () =>
      catalogApi.products({
        category: slug!,
        ...(sampleOnly ? { sampleAvailable: true } : {}),
        ...(marketStatus ? { marketStatus } : {}),
        ...(originCountry ? { originCountry } : {}),
        ...(certification ? { certification } : {}),
      }),
    enabled: !!slug,
  });

  const onAdded = async (productId: string, packingTypeId: string, pallets: number) => {
    let targetId = containerId;
    if (!targetId) {
      const mc = await mixedContainerApi.create({ containerType: "CONTAINER_40FT", currency: "USD" });
      targetId = mc.id;
    }
    await mixedContainerApi.addLine(targetId!, productId, packingTypeId, pallets);
    await qc.invalidateQueries({ queryKey: ["mc-container", targetId] });
    setSelected(null);
    window.location.href = `/buyer/mixed-container/requests/${targetId}`;
  };

  return (
    <div data-testid="mc-catalog-products" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header>
        <Link to="/buyer/mixed-container/catalog" className="text-xs text-zinc-500 hover:underline">← Categories</Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1 capitalize">{slug?.replace(/-/g, " ")}</h1>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3 inline-block">
          Indicative Pricing Only — final pricing available after live supplier sourcing.
        </p>
      </header>

      <div className="flex flex-wrap gap-4 items-end">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sampleOnly} onChange={(e) => setSampleOnly(e.target.checked)} data-testid="mc-filter-sample" />
          Sample available
        </label>
        <label className="text-sm">
          <span className="text-xs uppercase text-zinc-500 block mb-1">Market status</span>
          <select value={marketStatus} onChange={(e) => setMarketStatus(e.target.value)} className="h-9 px-2 border rounded-lg text-sm" data-testid="mc-filter-market">
            <option value="">All</option>
            {CATALOG_MARKET_STATUS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs uppercase text-zinc-500 block mb-1">Country of origin</span>
          <input value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="e.g. India" className="h-9 px-2 border rounded-lg text-sm w-36" data-testid="mc-filter-origin" />
        </label>
        <label className="text-sm">
          <span className="text-xs uppercase text-zinc-500 block mb-1">Certification</span>
          <input value={certification} onChange={(e) => setCertification(e.target.value)} placeholder="e.g. Halal" className="h-9 px-2 border rounded-lg text-sm w-28" data-testid="mc-filter-cert" />
        </label>
      </div>

      {isLoading && <div className="dmx-card p-8 animate-pulse h-40" />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(data?.items ?? []).map((p) => (
          <CatalogProductCard key={p.id} product={p} onAdd={() => setSelected(p)} />
        ))}
      </div>

      {selected && (
        <AddToContainerModal
          product={selected}
          onClose={() => setSelected(null)}
          onConfirm={(packingTypeId, pallets) => void onAdded(selected.id, packingTypeId, pallets)}
        />
      )}
    </div>
  );
}

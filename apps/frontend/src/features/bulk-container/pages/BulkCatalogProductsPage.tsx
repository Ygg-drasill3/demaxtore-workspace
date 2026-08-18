import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bulkCatalogApi, bulkContainerApi } from "../lib/bulk-container.api";
import { SpecCard } from "../components/SpecCard";
import { AddBulkLineModal } from "../components/AddBulkLineModal";
import type { BulkCatalogProductCardDTO } from "../lib/bulk-container.api";
import { Input } from "@/components/ui/Input";
import { useBulkContainerSession } from "../lib/useBulkContainerSession";
import { toast } from "@/store/toast.store";

export default function BulkCatalogProductsPage() {
  const { category } = useParams<{ category: string }>();
  const nav = useNavigate();
  const { ensureContainer, withContainerId } = useBulkContainerSession();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<BulkCatalogProductCardDTO | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["bc-products", category, search],
    queryFn: () => {
      const p: Record<string, string | number | boolean> = {};
      if (category) p.category = category;
      if (search) p.q = search;
      return bulkCatalogApi.products(p);
    },
    enabled: !!category,
  });

  const onAdded = async (
    productId: string,
    packingTypeId: string,
    quantityMt: number,
    specValues: Record<string, string | number>,
  ) => {
    try {
      const targetId = await ensureContainer();
      await bulkContainerApi.addLine(targetId, { catalogProductId: productId, packingTypeId, quantityMt, specValues });
      await qc.invalidateQueries({ queryKey: ["bc-container", targetId] });
      setSelected(null);
      nav(`/buyer/bulk-container/requests/${targetId}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { code?: string; message?: string } } } };
      const code = err.response?.data?.error?.code;
      if (code === "CONTAINER_FULL" || code === "CONTAINER_CAPACITY_EXCEEDED") {
        toast.warning("Container full", "This container is at capacity. Start a new container from the builder.");
        return;
      }
      throw e;
    }
  };

  return (
    <div data-testid="bc-catalog-products" data-guide="bc-catalog-products" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header>
        <Link to={withContainerId("/buyer/bulk-container/catalog")} className="text-xs text-zinc-500 hover:underline">← Categories</Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1 capitalize">
          {category?.replace(/-/g, " ")}
        </h1>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3 inline-block">
          Indicative Pricing Only — final pricing available after procurement sourcing.
        </p>
      </header>

      <div className="flex flex-wrap gap-4 items-end">
        <label className="text-sm">
          <span className="text-xs uppercase text-zinc-500 block mb-1">Search</span>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Product name or ref"
            className="w-56"
            data-testid="bc-filter-search"
          />
        </label>
      </div>

      {isLoading && <div className="dmx-card p-8 animate-pulse h-40" />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(data?.items ?? []).map((p) => (
          <SpecCard key={p.id} product={p} onAdd={() => setSelected(p)} />
        ))}
      </div>

      {selected && (
        <AddBulkLineModal
          product={selected}
          onClose={() => setSelected(null)}
          onConfirm={(packingTypeId, quantityMt, specValues) => void onAdded(selected.id, packingTypeId, quantityMt, specValues)}
        />
      )}
    </div>
  );
}

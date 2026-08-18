import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { productMasterApi } from "../lib/product-master.api";
import { PRODUCT_MASTER_ROUTES } from "../lib/product-master.routes";

export default function ProductListPage() {
  const [q, setQ] = useState("");
  const [origin, setOrigin] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["products", q, origin],
    queryFn: () =>
      productMasterApi.list({
        q: q || undefined,
        countryOfOrigin: origin || undefined,
        page: 1,
        pageSize: 50,
      }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6" data-testid="product-list-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Product Master</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Products</h1>
          <p className="text-sm text-zinc-600">Reusable import product identity for Purchase Orders and shipments.</p>
        </div>
        <Link
          to={PRODUCT_MASTER_ROUTES.create}
          data-testid="product-create-link"
          className="rounded-lg bg-accent-900 px-3 py-2 text-sm font-medium text-white hover:bg-accent-600"
        >
          New Product
        </Link>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          className="dmx-input max-w-sm"
          placeholder="Search SKU, name, GTİP, supplier SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="product-search"
        />
        <input
          className="dmx-input w-40"
          placeholder="Origin"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          data-testid="product-filter-origin"
        />
      </div>

      {isLoading && <p className="text-sm text-zinc-500">Loading products…</p>}
      {isError && (
        <p className="text-sm text-red-600">
          Failed to load.{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-paper-200 bg-white">
        <table className="min-w-full text-sm" data-testid="product-table">
          <thead className="bg-paper-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Origin</th>
              <th className="px-3 py-2">GTİP status</th>
              <th className="px-3 py-2">UOM</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((p) => (
              <tr key={p.id} className="border-t border-paper-100" data-testid={`product-row-${p.id}`}>
                <td className="px-3 py-2 font-medium">
                  <Link className="text-blue-600 hover:underline" to={PRODUCT_MASTER_ROUTES.detail(p.id)}>
                    {p.sku}
                  </Link>
                </td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2 text-zinc-600">{p.countryOfOrigin || "—"}</td>
                <td className="px-3 py-2 text-zinc-600">
                  {p.classificationStatus}
                  {p.gtipCode ? ` · ${p.gtipCode}` : ""}
                </td>
                <td className="px-3 py-2 text-zinc-600">{p.unitOfMeasure}</td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-zinc-500" data-testid="product-empty">
                  No products yet. Create one to reuse across Purchase Orders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

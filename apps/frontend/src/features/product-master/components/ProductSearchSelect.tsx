import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ProductDto } from "@dmx/contracts/product-master";
import { productMasterApi } from "../lib/product-master.api";

type Props = {
  selectedId?: string;
  selectedLabel?: string;
  onSelect: (product: ProductDto) => void;
  onClear: () => void;
};

export function ProductSearchSelect({ selectedId, selectedLabel, onSelect, onClear }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["products", "po-select", q],
    queryFn: () => productMasterApi.list({ q: q.trim() || undefined, page: 1, pageSize: 8 }),
    enabled: open,
    staleTime: 15_000,
  });

  const items = query.data?.items ?? [];
  const hint = useMemo(() => {
    if (selectedId && selectedLabel) return selectedLabel;
    return "";
  }, [selectedId, selectedLabel]);

  return (
    <div className="relative" data-testid="product-search-select">
      <input
        className="dmx-input text-xs"
        value={open ? q : hint || q}
        placeholder="Search products…"
        data-testid="product-search-select-input"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
      />
      {selectedId && !open && (
        <button
          type="button"
          className="absolute right-1 top-1 text-[10px] text-zinc-500 underline"
          data-testid="product-search-select-clear"
          onClick={() => {
            setQ("");
            onClear();
          }}
        >
          Clear
        </button>
      )}
      {open && (
        <ul
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-zinc-200 bg-white text-xs shadow"
          data-testid="product-search-select-results"
        >
          {query.isLoading && <li className="px-2 py-2 text-zinc-500">Searching…</li>}
          {!query.isLoading && items.length === 0 && (
            <li className="px-2 py-2 text-zinc-500">No matching products. Quick-create from code instead.</li>
          )}
          {items.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full px-2 py-1.5 text-left hover:bg-paper-50"
                data-testid={`product-search-option-${p.sku}`}
                onClick={() => {
                  onSelect(p);
                  setQ("");
                  setOpen(false);
                }}
              >
                <span className="font-medium">{p.sku}</span>
                <span className="text-zinc-600"> · {p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

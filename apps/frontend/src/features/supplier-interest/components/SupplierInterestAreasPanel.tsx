import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tags } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api-errors";
import { toast } from "@/store/toast.store";
import { supplierInterestApi } from "../lib/supplier-interest.api";

export function SupplierInterestAreasPanel() {
  const qc = useQueryClient();
  const categories = useQuery({
    queryKey: ["supplier-interest-categories"],
    queryFn: () => supplierInterestApi.listCategories(),
  });
  const mine = useQuery({
    queryKey: ["supplier-interest-me"],
    queryFn: () => supplierInterestApi.getMine(),
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!mine.data || dirty) return;
    setSelected(mine.data.categoryIds);
  }, [mine.data, dirty]);

  const save = useMutation({
    mutationFn: () => supplierInterestApi.setMine(selected),
    onSuccess: (data) => {
      setSelected(data.categoryIds);
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ["supplier-interest-me"] });
      toast.success("Interest areas saved", "Matching RFQs will prefer your selected categories.");
    },
    onError: (err) => {
      toast.error("Save failed", getApiErrorMessage(err, "Could not save interest areas."));
    },
  });

  const toggle = (id: string) => {
    setDirty(true);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const options = categories.data ?? [];

  return (
    <section
      className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm"
      data-testid="supplier-interest-areas"
      data-guide="supplier-interest-areas"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-zinc-900 text-white grid place-items-center">
          <Tags className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Product interest areas</h2>
          <p className="text-xs text-zinc-500">
            Select the product categories you manufacture or sell. Admins use this to invite you to relevant RFQs.
          </p>
        </div>
      </div>

      {(categories.isLoading || mine.isLoading) && (
        <p className="text-sm text-zinc-500">Loading categories…</p>
      )}

      {categories.isError && (
        <p className="text-sm text-red-600" role="alert">
          Could not load categories.
        </p>
      )}

      {options.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="supplier-interest-options">
          {options.map((c) => {
            const checked = selected.includes(c.id);
            return (
              <label
                key={c.id}
                className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                  checked
                    ? "border-accent-900/30 bg-accent-50"
                    : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={checked}
                  data-testid={`supplier-interest-${c.slug}`}
                  onChange={() => toggle(c.id)}
                />
                <span>
                  <span className="font-medium text-ink-900 block">{c.name}</span>
                  {c.description && (
                    <span className="text-xs text-zinc-500 leading-snug">{c.description}</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-zinc-500" data-testid="supplier-interest-count">
          {selected.length} selected
        </p>
        <button
          type="button"
          data-testid="supplier-interest-save"
          disabled={save.isPending || !dirty}
          onClick={() => void save.mutate()}
          className="dmx-btn-primary text-sm disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : "Save interest areas"}
        </button>
      </div>
    </section>
  );
}

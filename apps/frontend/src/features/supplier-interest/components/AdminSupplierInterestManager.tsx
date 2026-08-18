import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Tags } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api-errors";
import { toast } from "@/store/toast.store";
import { supplierInterestApi } from "../lib/supplier-interest.api";

export function AdminSupplierInterestManager() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const categories = useQuery({
    queryKey: ["supplier-interest-categories"],
    queryFn: () => supplierInterestApi.listCategories(),
  });

  const orgs = useQuery({
    queryKey: ["supplier-interest-orgs", debouncedQ],
    queryFn: () => supplierInterestApi.listOrganisations(debouncedQ || undefined, 100),
  });

  const selectedOrg = useMemo(
    () => orgs.data?.find((o) => o.organisationId === selectedOrgId) ?? null,
    [orgs.data, selectedOrgId],
  );

  useEffect(() => {
    if (!selectedOrg || dirty) return;
    setSelected(selectedOrg.categoryIds);
  }, [selectedOrg, dirty]);

  const save = useMutation({
    mutationFn: () => {
      if (!selectedOrgId) throw new Error("No organisation selected");
      return supplierInterestApi.setForOrganisation(selectedOrgId, selected);
    },
    onSuccess: (data) => {
      setSelected(data.categoryIds);
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ["supplier-interest-orgs"] });
      toast.success("Interests updated", `${selectedOrg?.name ?? "Supplier"} categories saved.`);
    },
    onError: (err) => {
      toast.error("Save failed", getApiErrorMessage(err, "Could not save interest areas."));
    },
  });

  const selectOrg = (orgId: string) => {
    setSelectedOrgId(orgId);
    setDirty(false);
    const row = orgs.data?.find((o) => o.organisationId === orgId);
    setSelected(row?.categoryIds ?? []);
  };

  const toggle = (id: string) => {
    setDirty(true);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const options = categories.data ?? [];

  return (
    <div className="space-y-4" data-testid="admin-supplier-interest-manager">
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-zinc-900 text-white grid place-items-center">
            <Tags className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Supplier interest areas</h2>
            <p className="text-xs text-zinc-500">
              Search any supplier organisation and set the product categories they cover.
            </p>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            data-testid="admin-supplier-interest-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search suppliers by name, email, location…"
            className="h-10 w-full pl-9 pr-3 rounded-md border border-zinc-200 text-sm"
          />
        </div>

        {orgs.isLoading && <p className="text-sm text-zinc-500">Loading suppliers…</p>}
        {orgs.isError && (
          <p className="text-sm text-red-600" role="alert">
            Could not load suppliers.
          </p>
        )}

        <ul
          className="divide-y divide-zinc-100 max-h-72 overflow-y-auto rounded-xl border border-zinc-100"
          data-testid="admin-supplier-interest-list"
        >
          {(orgs.data ?? []).map((o) => {
            const active = o.organisationId === selectedOrgId;
            return (
              <li key={o.organisationId}>
                <button
                  type="button"
                  data-testid={`admin-supplier-interest-row-${o.organisationId}`}
                  onClick={() => selectOrg(o.organisationId)}
                  className={`w-full text-left px-3 py-2.5 transition-colors ${
                    active ? "bg-accent-50" : "hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{o.name}</p>
                      <p className="text-xs text-zinc-500 truncate">
                        {o.location || "No location"} · {o.supplierUserCount} user
                        {o.supplierUserCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="text-[11px] text-zinc-500 shrink-0">
                      {o.categoryNames.length
                        ? `${o.categoryNames.length} categor${o.categoryNames.length === 1 ? "y" : "ies"}`
                        : "None set"}
                    </span>
                  </div>
                  {o.categoryNames.length > 0 && (
                    <p className="mt-1 text-[11px] text-zinc-500 line-clamp-1">
                      {o.categoryNames.join(" · ")}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
          {!orgs.isLoading && (orgs.data?.length ?? 0) === 0 && (
            <li className="px-3 py-6 text-center text-sm text-zinc-500">No supplier organisations found.</li>
          )}
        </ul>
      </section>

      {selectedOrg && (
        <section
          className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm"
          data-testid="admin-supplier-interest-editor"
        >
          <header className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-900">{selectedOrg.name}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select product categories for this organisation.
            </p>
          </header>

          {categories.isLoading && <p className="text-sm text-zinc-500">Loading categories…</p>}
          {categories.isError && (
            <p className="text-sm text-red-600" role="alert">
              Could not load categories.
            </p>
          )}

          {options.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      data-testid={`admin-supplier-interest-${c.slug}`}
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
            <p className="text-xs text-zinc-500">{selected.length} selected</p>
            <button
              type="button"
              data-testid="admin-supplier-interest-save"
              disabled={save.isPending || !dirty}
              onClick={() => void save.mutate()}
              className="dmx-btn-primary text-sm disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : "Save for organisation"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

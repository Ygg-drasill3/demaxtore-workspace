import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminCatalogApi } from "../lib/mixed-container.api";
import { Button } from "@/components/ui/Button";
import { CATALOG_MARKET_STATUS } from "@dmx/contracts/mixed-container-catalog";

type AdminCategory = { id: string; slug: string; name: string };
type AdminProduct = {
  id: string;
  productRef: string;
  name: string;
  category: string;
  categorySlug: string;
  status?: string;
  marketStatus: string;
  indicativeLow: number | null;
  indicativeHigh: number | null;
};

export default function CatalogAdminPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadProductId, setUploadProductId] = useState<string | null>(null);
  const { data: cats } = useQuery({ queryKey: ["admin-mc-cats"], queryFn: () => adminCatalogApi.categories() });
  const { data: prods } = useQuery({ queryKey: ["admin-mc-prods"], queryFn: () => adminCatalogApi.products() });

  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");

  const categories = (cats?.items ?? []) as AdminCategory[];
  const products = (prods?.items ?? []) as AdminProduct[];

  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    categoryId: "",
    productRef: "",
    name: "",
    packagingDescription: "",
    unitsPerPallet: 50,
    moqPallets: 1,
    marketStatus: "STABLE",
    indicativeLow: "",
    indicativeHigh: "",
    originCountry: "",
  });

  const resetForm = () => {
    setEditId(null);
    setForm({
      categoryId: categories[0]?.id ?? "",
      productRef: "",
      name: "",
      packagingDescription: "",
      unitsPerPallet: 50,
      moqPallets: 1,
      marketStatus: "STABLE",
      indicativeLow: "",
      indicativeHigh: "",
      originCountry: "",
    });
  };

  const createCategory = async () => {
    await adminCatalogApi.createCategory({ slug: catSlug, name: catName, sortOrder: categories.length + 1 });
    setCatName("");
    setCatSlug("");
    await qc.invalidateQueries({ queryKey: ["admin-mc-cats"] });
  };

  const saveProduct = async () => {
    const payload = {
      categoryId: form.categoryId,
      productRef: form.productRef,
      name: form.name,
      packagingDescription: form.packagingDescription,
      unitsPerPallet: form.unitsPerPallet,
      moqPallets: form.moqPallets,
      marketStatus: form.marketStatus,
      indicativeLow: form.indicativeLow ? Number(form.indicativeLow) : undefined,
      indicativeHigh: form.indicativeHigh ? Number(form.indicativeHigh) : undefined,
      originCountry: form.originCountry || undefined,
    };
    if (editId) {
      await adminCatalogApi.updateProduct(editId, payload);
    } else {
      await adminCatalogApi.createProduct(payload);
    }
    resetForm();
    await qc.invalidateQueries({ queryKey: ["admin-mc-prods"] });
  };

  const startEdit = (p: AdminProduct) => {
    const cat = categories.find((c) => c.slug === p.categorySlug || c.name === p.category);
    setEditId(p.id);
    setForm({
      categoryId: cat?.id ?? categories[0]?.id ?? "",
      productRef: p.productRef,
      name: p.name,
      packagingDescription: "",
      unitsPerPallet: 50,
      moqPallets: 1,
      marketStatus: p.marketStatus,
      indicativeLow: p.indicativeLow != null ? String(p.indicativeLow) : "",
      indicativeHigh: p.indicativeHigh != null ? String(p.indicativeHigh) : "",
      originCountry: "",
    });
  };

  const deactivate = async (id: string) => {
    await adminCatalogApi.updateProduct(id, { status: "DISCONTINUED" });
    await qc.invalidateQueries({ queryKey: ["admin-mc-prods"] });
  };

  const onImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadProductId) return;
    await adminCatalogApi.uploadImage(uploadProductId, file);
    setUploadProductId(null);
    e.target.value = "";
    await qc.invalidateQueries({ queryKey: ["admin-mc-prods"] });
  };

  return (
    <div data-testid="mc-admin-catalog-page" className="max-w-[1200px] mx-auto space-y-8 animate-fade-in">
      <header>
        <span className="dmx-eyebrow text-zinc-500">Admin · Mixed Container</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Catalog Management</h1>
      </header>

      <section className="dmx-card p-5 space-y-3">
        <h2 className="font-medium">Create Category</h2>
        <div className="flex flex-wrap gap-2">
          <input placeholder="Slug" value={catSlug} onChange={(e) => setCatSlug(e.target.value)} className="h-10 px-3 border rounded-lg text-sm" data-testid="admin-mc-cat-slug" />
          <input placeholder="Name" value={catName} onChange={(e) => setCatName(e.target.value)} className="h-10 px-3 border rounded-lg text-sm" data-testid="admin-mc-cat-name" />
          <Button data-testid="admin-mc-cat-create" onClick={() => void createCategory()}>Create</Button>
        </div>
      </section>

      <section className="dmx-card p-5 space-y-3">
        <h2 className="font-medium">{editId ? "Edit Product" : "Create Product"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} className="h-10 px-3 border rounded-lg text-sm" data-testid="admin-mc-prod-category">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="Product ref" value={form.productRef} onChange={(e) => setForm((f) => ({ ...f, productRef: e.target.value }))} className="h-10 px-3 border rounded-lg text-sm" data-testid="admin-mc-prod-ref" disabled={!!editId} />
          <input placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-10 px-3 border rounded-lg text-sm md:col-span-2" data-testid="admin-mc-prod-name" />
          <input placeholder="Packaging" value={form.packagingDescription} onChange={(e) => setForm((f) => ({ ...f, packagingDescription: e.target.value }))} className="h-10 px-3 border rounded-lg text-sm md:col-span-2" data-testid="admin-mc-prod-packaging" />
          <select value={form.marketStatus} onChange={(e) => setForm((f) => ({ ...f, marketStatus: e.target.value }))} className="h-10 px-3 border rounded-lg text-sm" data-testid="admin-mc-prod-market">
            {CATALOG_MARKET_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder="Origin country" value={form.originCountry} onChange={(e) => setForm((f) => ({ ...f, originCountry: e.target.value }))} className="h-10 px-3 border rounded-lg text-sm" data-testid="admin-mc-prod-origin" />
          <input placeholder="Indicative low" value={form.indicativeLow} onChange={(e) => setForm((f) => ({ ...f, indicativeLow: e.target.value }))} className="h-10 px-3 border rounded-lg text-sm" data-testid="admin-mc-prod-low" />
          <input placeholder="Indicative high" value={form.indicativeHigh} onChange={(e) => setForm((f) => ({ ...f, indicativeHigh: e.target.value }))} className="h-10 px-3 border rounded-lg text-sm" data-testid="admin-mc-prod-high" />
        </div>
        <div className="flex gap-2">
          <Button data-testid="admin-mc-prod-save" onClick={() => void saveProduct()}>{editId ? "Update" : "Create"}</Button>
          {editId && <Button variant="secondary" onClick={resetForm}>Cancel</Button>}
        </div>
      </section>

      <section className="dmx-card p-5 overflow-x-auto">
        <h2 className="font-medium mb-3">Products ({products.length})</h2>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onImageSelected(e)} data-testid="admin-mc-image-input" />
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left py-2">Ref</th>
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Category</th>
              <th className="text-left py-2">Market</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.productRef} className="border-t border-zinc-100" data-testid={`admin-mc-prod-row-${p.productRef}`}>
                <td className="py-2">{p.productRef}</td>
                <td className="py-2">{p.name}</td>
                <td className="py-2">{p.category}</td>
                <td className="py-2">{p.marketStatus}</td>
                <td className="py-2">{p.status ?? "ACTIVE"}</td>
                <td className="py-2 flex gap-2">
                  <button type="button" className="text-accent-900 text-xs" data-testid={`admin-mc-edit-${p.productRef}`} onClick={() => startEdit(p)}>Edit</button>
                  <button type="button" className="text-accent-900 text-xs" data-testid={`admin-mc-upload-${p.productRef}`} onClick={() => { setUploadProductId(p.id); fileRef.current?.click(); }}>Image</button>
                  {p.status !== "DISCONTINUED" && (
                    <button type="button" className="text-red-600 text-xs" data-testid={`admin-mc-deactivate-${p.productRef}`} onClick={() => void deactivate(p.id)}>Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

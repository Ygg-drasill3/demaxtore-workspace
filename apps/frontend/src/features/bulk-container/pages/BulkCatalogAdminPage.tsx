import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminBulkCatalogApi } from "../lib/bulk-container.api";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";

type AdminCategory = { id: string; slug: string; name: string; status?: string; sortOrder?: number };
type AdminSpecTemplate = { id: string; productType: string; name: string; isActive: boolean };
type AdminProduct = {
  id: string;
  productRef: string;
  name: string;
  standardPacking: string;
  status?: string;
  marketStatus: string;
  indicativeLow: number | null;
  indicativeHigh: number | null;
  minOrderMt: number;
  categoryId: string;
  specTemplateId: string;
  category?: { name: string; slug: string };
  specTemplate?: { name: string; productType: string };
};

export default function BulkCatalogAdminPage() {
  const qc = useQueryClient();
  const { data: cats } = useQuery({ queryKey: ["admin-bc-cats"], queryFn: () => adminBulkCatalogApi.categories() });
  const { data: prods } = useQuery({ queryKey: ["admin-bc-prods"], queryFn: () => adminBulkCatalogApi.products() });
  const { data: templates } = useQuery({ queryKey: ["admin-bc-templates"], queryFn: () => adminBulkCatalogApi.specTemplates() });

  const categories = (cats?.items ?? []) as AdminCategory[];
  const products = (prods?.items ?? []) as AdminProduct[];
  const specTemplates = (templates?.items ?? []) as AdminSpecTemplate[];

  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    categoryId: "",
    specTemplateId: "",
    productRef: "",
    name: "",
    standardPacking: "",
    marketStatus: "STABLE",
    indicativeLow: "",
    indicativeHigh: "",
    minOrderMt: "1",
  });

  const resetForm = () => {
    setEditId(null);
    setForm({
      categoryId: categories[0]?.id ?? "",
      specTemplateId: specTemplates[0]?.id ?? "",
      productRef: "",
      name: "",
      standardPacking: "",
      marketStatus: "STABLE",
      indicativeLow: "",
      indicativeHigh: "",
      minOrderMt: "1",
    });
  };

  const createCategory = async () => {
    await adminBulkCatalogApi.createCategory({ slug: catSlug, name: catName, sortOrder: categories.length + 1 });
    setCatName("");
    setCatSlug("");
    await qc.invalidateQueries({ queryKey: ["admin-bc-cats"] });
  };

  const saveProduct = async () => {
    const payload = {
      categoryId: form.categoryId,
      specTemplateId: form.specTemplateId,
      productRef: form.productRef,
      name: form.name,
      standardPacking: form.standardPacking,
      marketStatus: form.marketStatus,
      indicativeLow: form.indicativeLow ? Number(form.indicativeLow) : undefined,
      indicativeHigh: form.indicativeHigh ? Number(form.indicativeHigh) : undefined,
      minOrderMt: Number(form.minOrderMt) || 1,
    };
    if (editId) {
      await adminBulkCatalogApi.updateProduct(editId, payload);
    } else {
      await adminBulkCatalogApi.createProduct(payload);
    }
    resetForm();
    await qc.invalidateQueries({ queryKey: ["admin-bc-prods"] });
  };

  const startEdit = (p: AdminProduct) => {
    setEditId(p.id);
    setForm({
      categoryId: p.categoryId,
      specTemplateId: p.specTemplateId,
      productRef: p.productRef,
      name: p.name,
      standardPacking: p.standardPacking,
      marketStatus: p.marketStatus,
      indicativeLow: p.indicativeLow != null ? String(p.indicativeLow) : "",
      indicativeHigh: p.indicativeHigh != null ? String(p.indicativeHigh) : "",
      minOrderMt: String(p.minOrderMt),
    });
  };

  const deactivate = async (id: string) => {
    await adminBulkCatalogApi.updateProduct(id, { status: "INACTIVE" });
    await qc.invalidateQueries({ queryKey: ["admin-bc-prods"] });
  };

  return (
    <div data-testid="bc-admin-catalog" className="max-w-[1200px] mx-auto space-y-8 animate-fade-in">
      <header>
        <span className="dmx-eyebrow text-zinc-500">Admin · BulkContainer</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Bulk Catalog Management</h1>
      </header>

      <section className="dmx-card p-5 space-y-3">
        <h2 className="font-medium">Create Category</h2>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Slug" value={catSlug} onChange={(e) => setCatSlug(e.target.value)} className="w-40" />
          <Input placeholder="Name" value={catName} onChange={(e) => setCatName(e.target.value)} className="w-48" />
          <Button onClick={() => void createCategory()}>Create</Button>
        </div>
      </section>

      <section className="dmx-card p-5 space-y-3">
        <h2 className="font-medium">{editId ? "Edit Product" : "Create Product"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Category">
            <Select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Spec template">
            <Select
              value={form.specTemplateId}
              onChange={(e) => setForm((f) => ({ ...f, specTemplateId: e.target.value }))}
            >
              {specTemplates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.productType})</option>)}
            </Select>
          </Field>
          <Field label="Product ref">
            <Input
              value={form.productRef}
              onChange={(e) => setForm((f) => ({ ...f, productRef: e.target.value }))}
              disabled={!!editId}
            />
          </Field>
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Standard packing">
              <Input
                value={form.standardPacking}
                onChange={(e) => setForm((f) => ({ ...f, standardPacking: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Market status">
            <Select value={form.marketStatus} onChange={(e) => setForm((f) => ({ ...f, marketStatus: e.target.value }))}>
              <option value="STABLE">STABLE</option>
              <option value="RISING">RISING</option>
              <option value="SHORT">SHORT</option>
            </Select>
          </Field>
          <Field label="Min order (MT)">
            <Input
              type="number"
              step="0.1"
              value={form.minOrderMt}
              onChange={(e) => setForm((f) => ({ ...f, minOrderMt: e.target.value }))}
            />
          </Field>
          <Field label="Indicative low">
            <Input value={form.indicativeLow} onChange={(e) => setForm((f) => ({ ...f, indicativeLow: e.target.value }))} />
          </Field>
          <Field label="Indicative high">
            <Input value={form.indicativeHigh} onChange={(e) => setForm((f) => ({ ...f, indicativeHigh: e.target.value }))} />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void saveProduct()}>{editId ? "Update" : "Create"}</Button>
          {editId && <Button variant="secondary" onClick={resetForm}>Cancel</Button>}
        </div>
      </section>

      <section className="dmx-card p-5 overflow-x-auto">
        <h2 className="font-medium mb-3">Products ({products.length})</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left py-2">Ref</th>
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Category</th>
              <th className="text-left py-2">Template</th>
              <th className="text-left py-2">Market</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.productRef} className="border-t border-zinc-100">
                <td className="py-2">{p.productRef}</td>
                <td className="py-2">{p.name}</td>
                <td className="py-2">{p.category?.name ?? "—"}</td>
                <td className="py-2">{p.specTemplate?.name ?? "—"}</td>
                <td className="py-2">{p.marketStatus}</td>
                <td className="py-2">{p.status ?? "ACTIVE"}</td>
                <td className="py-2 flex gap-2">
                  <button type="button" className="text-accent-900 text-xs" onClick={() => startEdit(p)}>Edit</button>
                  {p.status !== "INACTIVE" && (
                    <button type="button" className="text-red-600 text-xs" onClick={() => void deactivate(p.id)}>Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="dmx-card p-5">
        <h2 className="font-medium mb-3">Spec Templates ({specTemplates.length})</h2>
        <ul className="text-sm space-y-1">
          {specTemplates.map((t) => (
            <li key={t.id} className="text-zinc-600">
              {t.name} · {t.productType} · {t.isActive ? "Active" : "Inactive"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

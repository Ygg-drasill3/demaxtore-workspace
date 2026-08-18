import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productMasterApi } from "../lib/product-master.api";
import { PRODUCT_MASTER_ROUTES } from "../lib/product-master.routes";
import { toast } from "@/store/toast.store";
import { getApiErrorMessage } from "@/lib/api-errors";

const emptyForm = {
  sku: "",
  name: "",
  description: "",
  customsDescription: "",
  manufacturer: "",
  brand: "",
  model: "",
  unitOfMeasure: "PCS",
  countryOfOrigin: "",
  gtipCode: "",
  netWeight: "",
  grossWeight: "",
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = id === "new";
  const [form, setForm] = useState(emptyForm);

  const detail = useQuery({
    queryKey: ["product", id],
    queryFn: () => productMasterApi.get(id!),
    enabled: !!id && !isNew,
  });

  const relatedPos = useQuery({
    queryKey: ["product-pos", id],
    queryFn: () => productMasterApi.relatedPos(id!),
    enabled: !!id && !isNew,
  });

  const relatedShipments = useQuery({
    queryKey: ["product-shipments", id],
    queryFn: () => productMasterApi.relatedShipments(id!),
    enabled: !!id && !isNew,
  });

  useEffect(() => {
    const loaded = detail.data;
    if (!loaded || isNew) return;
    setForm({
      sku: loaded.sku,
      name: loaded.name,
      description: loaded.description ?? "",
      customsDescription: loaded.customsDescription ?? "",
      manufacturer: loaded.manufacturer ?? "",
      brand: loaded.brand ?? "",
      model: loaded.model ?? "",
      unitOfMeasure: loaded.unitOfMeasure,
      countryOfOrigin: loaded.countryOfOrigin ?? "",
      gtipCode: loaded.gtipCode ?? "",
      netWeight: loaded.netWeight != null ? String(loaded.netWeight) : "",
      grossWeight: loaded.grossWeight != null ? String(loaded.grossWeight) : "",
    });
  }, [detail.data, isNew]);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        sku: form.sku,
        name: form.name,
        description: form.description || null,
        customsDescription: form.customsDescription || null,
        manufacturer: form.manufacturer || null,
        brand: form.brand || null,
        model: form.model || null,
        unitOfMeasure: form.unitOfMeasure || "PCS",
        countryOfOrigin: form.countryOfOrigin || null,
        gtipCode: form.gtipCode || null,
        netWeight: form.netWeight ? Number(form.netWeight) : null,
        grossWeight: form.grossWeight ? Number(form.grossWeight) : null,
      };
      if (isNew) return productMasterApi.create(body);
      return productMasterApi.update(id!, body);
    },
    onSuccess: async (dto) => {
      toast.success(isNew ? "Product created" : "Product updated");
      await qc.invalidateQueries({ queryKey: ["products"] });
      if (isNew) navigate(PRODUCT_MASTER_ROUTES.detail(dto.id));
      else void qc.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6" data-testid="product-detail-page">
      <header className="space-y-1">
        <Link to={PRODUCT_MASTER_ROUTES.list} className="text-sm text-zinc-600 hover:underline">
          ← Products
        </Link>
        <h1 className="text-2xl font-semibold">{isNew ? "New Product" : detail.data?.sku ?? "Product"}</h1>
        {!isNew && detail.data && (
          <p className="text-sm text-zinc-600">
            Classification: {detail.data.classificationStatus}
            {detail.data.gtipCode ? ` · ${detail.data.gtipCode}` : ""} (reference only — not legal verification)
          </p>
        )}
      </header>

      <section className="dmx-card space-y-3 p-4" data-testid="product-general">
        <h2 className="font-medium">General</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            SKU *
            <input className="dmx-input mt-1" value={form.sku} onChange={(e) => set("sku", e.target.value)} data-testid="product-sku" />
          </label>
          <label className="text-sm">
            Name *
            <input className="dmx-input mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="product-name" />
          </label>
          <label className="text-sm md:col-span-2">
            Description
            <textarea className="dmx-input mt-1" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </label>
          <label className="text-sm">Manufacturer<input className="dmx-input mt-1" value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} /></label>
          <label className="text-sm">Brand<input className="dmx-input mt-1" value={form.brand} onChange={(e) => set("brand", e.target.value)} /></label>
          <label className="text-sm">Model<input className="dmx-input mt-1" value={form.model} onChange={(e) => set("model", e.target.value)} /></label>
          <label className="text-sm">UOM<input className="dmx-input mt-1" value={form.unitOfMeasure} onChange={(e) => set("unitOfMeasure", e.target.value)} data-testid="product-uom" /></label>
        </div>
      </section>

      <section className="dmx-card space-y-3 p-4" data-testid="product-import">
        <h2 className="font-medium">Import data</h2>
        <p className="text-xs text-zinc-500">Country of Origin is not inferred from supplier country. GTİP is reference-only.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Country of Origin
            <input className="dmx-input mt-1" value={form.countryOfOrigin} onChange={(e) => set("countryOfOrigin", e.target.value)} data-testid="product-origin" placeholder="e.g. CN" />
          </label>
          <label className="text-sm">
            GTİP / tariff reference
            <input className="dmx-input mt-1" value={form.gtipCode} onChange={(e) => set("gtipCode", e.target.value)} data-testid="product-gtip" />
          </label>
          <label className="text-sm md:col-span-2">
            Customs description
            <textarea className="dmx-input mt-1" rows={2} value={form.customsDescription} onChange={(e) => set("customsDescription", e.target.value)} placeholder="Operational/customs-oriented description (manual)" />
          </label>
          <label className="text-sm">Net weight<input className="dmx-input mt-1" value={form.netWeight} onChange={(e) => set("netWeight", e.target.value)} /></label>
          <label className="text-sm">Gross weight<input className="dmx-input mt-1" value={form.grossWeight} onChange={(e) => set("grossWeight", e.target.value)} /></label>
        </div>
      </section>

      <div>
        <button
          type="button"
          data-testid="product-save"
          disabled={save.isPending || !form.sku.trim() || !form.name.trim()}
          className="rounded-lg bg-accent-900 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-60"
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving…" : isNew ? "Create Product" : "Save changes"}
        </button>
      </div>

      {!isNew && (
        <>
          <section className="dmx-card space-y-2 p-4" data-testid="product-related-pos">
            <h2 className="font-medium">Related Purchase Orders</h2>
            {(relatedPos.data as { items?: Array<{ purchaseOrderId: string; poNumber: string; quantity: number; status: string }> } | undefined)?.items?.length ? (
              <ul className="space-y-1 text-sm">
                {(relatedPos.data as { items: Array<{ purchaseOrderId: string; poNumber: string; quantity: number; status: string }> }).items.map((po) => (
                  <li key={po.purchaseOrderId}>
                    <Link className="text-blue-600 hover:underline" to={`/workspace/po/${po.purchaseOrderId}`}>
                      {po.poNumber}
                    </Link>
                    <span className="text-zinc-500"> · {po.status} · qty {po.quantity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No linked PO lines yet.</p>
            )}
          </section>

          <section className="dmx-card space-y-2 p-4" data-testid="product-related-shipments">
            <h2 className="font-medium">Related Shipments</h2>
            {(relatedShipments.data as { items?: Array<{ shipmentWorkspaceId: string; externalRef: string | null; allocatedQuantity: number; state: string | null }> } | undefined)?.items?.length ? (
              <ul className="space-y-1 text-sm">
                {(relatedShipments.data as { items: Array<{ shipmentWorkspaceId: string; externalRef: string | null; allocatedQuantity: number; state: string | null }> }).items.map((s) => (
                  <li key={s.shipmentWorkspaceId}>
                    <Link className="text-blue-600 hover:underline" to={`/workspace/shipment/${s.shipmentWorkspaceId}`}>
                      {s.externalRef || s.shipmentWorkspaceId.slice(0, 8)}
                    </Link>
                    <span className="text-zinc-500"> · {s.state ?? "—"} · allocated {s.allocatedQuantity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No shipment allocations via Product → PO Line yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { packingTypeAdminApi } from "../lib/packing-type.api";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { PACKING_SEGMENTS } from "@dmx/contracts/packing-type";
import {
  BULK_CONTAINER_LOCKED_PACKING_TYPES,
  BULK_CONTAINER_PACKING_CATALOG_VERSION,
  isLockedBulkContainerPackingCode,
} from "@dmx/contracts/bulk-container-packing-locked";

export default function PackingTypesAdminPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-packing-types"],
    queryFn: () => packingTypeAdminApi.list(),
  });

  const [form, setForm] = useState({
    code: "",
    name: "",
    segment: "RETAIL",
    unitWeight: "",
    unitWeightUom: "kg",
    description: "",
  });

  const items = data?.items ?? [];

  const create = async () => {
    await packingTypeAdminApi.create({
      code: form.code,
      name: form.name,
      segment: form.segment as "RETAIL" | "HORECA" | "INDUSTRIAL",
      unitWeight: form.unitWeight ? Number(form.unitWeight) : undefined,
      unitWeightUom: form.unitWeightUom || undefined,
      description: form.description || undefined,
      isActive: true,
    });
    setForm({ code: "", name: "", segment: "RETAIL", unitWeight: "", unitWeightUom: "kg", description: "" });
    await qc.invalidateQueries({ queryKey: ["admin-packing-types"] });
  };

  const toggleActive = async (id: string, code: string, isActive: boolean) => {
    if (isLockedBulkContainerPackingCode(code) && isActive) return;
    await packingTypeAdminApi.update(id, { isActive: !isActive });
    await qc.invalidateQueries({ queryKey: ["admin-packing-types"] });
  };

  return (
    <div data-testid="packing-admin-page" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Packing Types</h1>
        <p className="text-sm text-zinc-500 mt-1">Create, assign, and manage catalog packing types.</p>
      </header>

      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        data-testid="bc-packing-locked-notice"
      >
        <p className="font-medium">BulkContainer packing catalog locked (v{BULK_CONTAINER_PACKING_CATALOG_VERSION})</p>
        <p className="mt-1 text-amber-800">
          PT-BC-* codes are frozen before Sprint 13C. Pricing, offers, and supplier matching will reference this list.
          SmartContainer (PT-MC-*) types remain flexible.
        </p>
        <ul className="mt-2 text-xs text-amber-800 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
          {(["wheat-flour", "semolina", "bulgur", "pulses", "salt", "pasta"] as const).map((cat) => (
            <li key={cat}>
              <span className="capitalize">{cat.replace(/-/g, " ")}</span>:{" "}
              {BULK_CONTAINER_LOCKED_PACKING_TYPES.filter((p) => p.categorySlug === cat).map((p) => p.name).join(", ")}
            </li>
          ))}
        </ul>
      </div>

      <section className="dmx-card p-6 space-y-4" data-testid="packing-admin-create">
        <h2 className="font-medium">Create packing type (SmartContainer only)</h2>
        <p className="text-xs text-zinc-500">Use PT-MC-* codes. BulkContainer PT-BC-* types are seeded from the locked catalog.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Code">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} data-testid="packing-code" />
          </Field>
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="packing-name" />
          </Field>
          <Field label="Segment">
            <Select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} data-testid="packing-segment">
              {PACKING_SEGMENTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Unit weight">
            <Input type="number" value={form.unitWeight} onChange={(e) => setForm({ ...form, unitWeight: e.target.value })} data-testid="packing-unit-weight" />
          </Field>
          <Field label="UOM">
            <Input value={form.unitWeightUom} onChange={(e) => setForm({ ...form, unitWeightUom: e.target.value })} data-testid="packing-uom" />
          </Field>
        </div>
        <Button data-testid="packing-create-btn" onClick={() => void create()} disabled={!form.code || !form.name}>
          Create
        </Button>
      </section>

      {isLoading && <div className="dmx-card p-8 animate-pulse h-40" />}

      <section className="dmx-card overflow-hidden" data-testid="packing-admin-list">
        <table className="w-full text-sm">
          <thead className="bg-paper-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left p-3">Code</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Segment</th>
              <th className="text-left p-3">Weight</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((pt) => (
              <tr key={pt.id} className="border-t border-zinc-100" data-testid={`packing-row-${pt.code}`}>
                <td className="p-3 font-mono text-xs">
                  {pt.code}
                  {isLockedBulkContainerPackingCode(pt.code) && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700" data-testid={`packing-locked-badge-${pt.code}`}>Locked</span>
                  )}
                </td>
                <td className="p-3">{pt.name}</td>
                <td className="p-3">{pt.segment}</td>
                <td className="p-3">{pt.unitWeight != null ? `${pt.unitWeight} ${pt.unitWeightUom ?? ""}` : "—"}</td>
                <td className="p-3">{pt.isActive ? "Active" : "Inactive"}</td>
                <td className="p-3 text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    data-testid={`packing-toggle-${pt.code}`}
                    disabled={isLockedBulkContainerPackingCode(pt.code) && pt.isActive}
                    onClick={() => void toggleActive(pt.id, pt.code, pt.isActive)}
                  >
                    {pt.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

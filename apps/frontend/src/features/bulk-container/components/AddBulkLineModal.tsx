import { useState } from "react";
import type { BulkCatalogProductCardDTO } from "../lib/bulk-container.api";
import type { BulkSpecTemplate } from "@dmx/contracts/bulk-container-catalog";

type BulkSpecParameter = BulkSpecTemplate["parameters"][number];
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";

function SpecField({
  param,
  value,
  onChange,
}: {
  param: BulkSpecParameter;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = param.unit ? `${param.label} (${param.unit})` : param.label;

  if (param.type === "enum" && param.options) {
    return (
      <Field label={label} hint={param.helpText}>
        <Select value={value} onChange={(e) => onChange(e.target.value)} data-testid={`bc-spec-${param.key}`}>
          <option value="">Select…</option>
          {param.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Select>
      </Field>
    );
  }

  const inputType = param.type === "year" ? "number" : param.type === "text" ? "text" : "number";
  const placeholder =
    param.type === "range"
      ? `${param.min ?? ""} – ${param.max ?? ""}`
      : param.type === "max"
        ? `Max ${param.max ?? ""}`
        : param.type === "min"
          ? `Min ${param.min ?? ""}`
          : undefined;

  return (
    <Field label={label} hint={param.helpText}>
      <Input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={param.min}
        max={param.max}
        data-testid={`bc-spec-${param.key}`}
      />
    </Field>
  );
}

export function AddBulkLineModal({
  product,
  onClose,
  onConfirm,
}: {
  product: BulkCatalogProductCardDTO;
  onClose: () => void;
  onConfirm: (packingTypeId: string, quantityMt: number, specValues: Record<string, string | number>) => void;
}) {
  const defaultPt = product.packingTypes.find((p) => p.isDefault) ?? product.packingTypes[0];
  const [packingTypeId, setPackingTypeId] = useState(defaultPt?.id ?? "");
  const [quantityMt, setQuantityMt] = useState(product.minOrderMt);
  const [specValues, setSpecValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of product.specTemplate.schema.parameters) {
      init[p.key] = "";
    }
    return init;
  });

  const setSpec = (key: string, val: string) => {
    setSpecValues((prev) => ({ ...prev, [key]: val }));
  };

  const buildSpecPayload = (): Record<string, string | number> => {
    const out: Record<string, string | number> = {};
    for (const p of product.specTemplate.schema.parameters) {
      const raw = specValues[p.key];
      if (raw === "") continue;
      out[p.key] = p.type === "text" || p.type === "enum" ? raw : Number(raw);
    }
    return out;
  };

  const requiredMissing = product.specTemplate.schema.parameters
    .filter((p) => p.required)
    .some((p) => !specValues[p.key]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="bc-add-modal">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-xl font-semibold">Add specification line</h2>
        <p className="text-sm text-zinc-600">{product.name} · {product.productRef}</p>
        <p className="text-xs text-zinc-500">{product.standardPacking}</p>

        {product.packingTypes.length > 0 && (
          <div className="space-y-2 border-t border-zinc-100 pt-4" data-testid="bc-packing-type-selector">
            <p className="text-xs uppercase text-zinc-500 font-medium">Packing Type</p>
            <div className="grid grid-cols-2 gap-2">
              {product.packingTypes.map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  data-testid={`bc-packing-option-${pt.code}`}
                  className={`p-2 rounded-lg border text-sm text-left ${
                    packingTypeId === pt.id ? "border-accent-900 bg-accent-50" : "border-zinc-200"
                  }`}
                  onClick={() => setPackingTypeId(pt.id)}
                >
                  {pt.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 border-t border-zinc-100 pt-4">
          <p className="text-xs uppercase text-zinc-500 font-medium">Specification ({product.specTemplate.name})</p>
          {product.specTemplate.schema.parameters.map((param) => (
            <SpecField
              key={param.key}
              param={param}
              value={specValues[param.key] ?? ""}
              onChange={(v) => setSpec(param.key, v)}
            />
          ))}
        </div>

        <Field label="Quantity (MT)" hint={`Minimum ${product.minOrderMt} MT`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="h-9 w-9 rounded border"
              onClick={() => setQuantityMt((q) => Math.max(product.minOrderMt, Math.round((q - 0.5) * 10) / 10))}
            >−</button>
            <Input
              type="number"
              step="0.1"
              min={product.minOrderMt}
              max={25}
              value={quantityMt}
              onChange={(e) => setQuantityMt(Number(e.target.value))}
              className="w-24 text-center"
              data-testid="bc-mt-quantity"
            />
            <button
              type="button"
              className="h-9 w-9 rounded border"
              onClick={() => setQuantityMt((q) => Math.min(25, Math.round((q + 0.5) * 10) / 10))}
            >+</button>
          </div>
        </Field>

        <p className="text-xs text-amber-700">Indicative pricing only — not a final offer.</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            data-testid="bc-add-confirm"
            disabled={requiredMissing || quantityMt < product.minOrderMt || !packingTypeId}
            onClick={() => onConfirm(packingTypeId, quantityMt, buildSpecPayload())}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

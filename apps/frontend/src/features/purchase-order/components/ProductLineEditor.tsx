import { Copy, Trash2 } from "lucide-react";
import { QUOTE_UOM_LABELS } from "@/features/rfq/lib/quote-uom";
import type { DirectPoLineDraft } from "../lib/direct-po-wizard.types";
import { computeLineTotal } from "../lib/direct-po-wizard.utils";
import { cn } from "@/lib/utils";
import { ProductSearchSelect } from "@/features/product-master/components/ProductSearchSelect";

interface Props {
  line: DirectPoLineDraft;
  index: number;
  currency: string;
  errors?: Record<string, string | undefined>;
  onChange: (next: DirectPoLineDraft) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

function fieldError(errors: Record<string, string | undefined> | undefined, index: number, field: string) {
  return errors?.[`lines.${index}.${field}`];
}

export function ProductLineEditor({
  line,
  index,
  currency,
  errors,
  onChange,
  onDuplicate,
  onRemove,
  canRemove,
}: Props) {
  const { lineTotal } = computeLineTotal(line);
  const set = (patch: Partial<DirectPoLineDraft>) => onChange({ ...line, ...patch });

  const lineTotalLabel =
    lineTotal == null
      ? "Not specified"
      : `${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

  const identityError =
    fieldError(errors, index, "productName") || fieldError(errors, index, "productCode");

  return (
    <>
      {/* Desktop table row */}
      <tr className="hidden md:table-row border-t border-paper-100" data-testid={`po-line-row-${index}`}>
        <td className="px-3 py-2 align-top space-y-1">
          <ProductSearchSelect
            selectedId={line.productId || undefined}
            selectedLabel={line.productId ? `${line.productCode} · ${line.productName}` : undefined}
            onSelect={(p) =>
              set({
                productId: p.id,
                productCode: p.sku,
                productName: p.name,
                description: line.description || p.description || p.name,
                unit: p.unitOfMeasure || line.unit,
                countryOfOrigin: p.countryOfOrigin || line.countryOfOrigin,
                quickCreate: false,
              })
            }
            onClear={() => set({ productId: "", productName: "" })}
          />
          <input
            className={cn("dmx-input text-xs", identityError && "border-red-400")}
            value={line.productCode}
            onChange={(e) => set({ productCode: e.target.value, productId: "", productName: "" })}
            placeholder="Code / SKU *"
            aria-label={`Line ${index + 1} product code`}
          />
          <label className="flex items-center gap-1 text-[10px] text-zinc-500">
            <input
              type="checkbox"
              checked={line.quickCreate}
              onChange={(e) => set({ quickCreate: e.target.checked })}
              data-testid={`po-line-quick-create-${index}`}
            />
            Quick-create from code
          </label>
        </td>
        <td className="px-3 py-2 align-top">
          <input
            className={cn("dmx-input text-xs", identityError && "border-red-400")}
            value={line.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Description"
            aria-label={`Line ${index + 1} description`}
          />
        </td>
        <td className="px-3 py-2 align-top">
          <input
            className="dmx-input text-xs"
            value={line.specification}
            onChange={(e) => set({ specification: e.target.value })}
            placeholder="Quality"
            aria-label={`Line ${index + 1} quality`}
          />
        </td>
        <td className="px-3 py-2 align-top">
          <input
            className="dmx-input text-xs"
            value={line.packaging}
            onChange={(e) => set({ packaging: e.target.value })}
            placeholder="Packaging"
            aria-label={`Line ${index + 1} packaging`}
          />
        </td>
        <td className="px-3 py-2 align-top w-24">
          <input
            type="number"
            min={0}
            step="any"
            className={cn("dmx-input text-xs", fieldError(errors, index, "quantity") && "border-red-400")}
            value={line.quantity}
            onChange={(e) => set({ quantity: e.target.value })}
            placeholder="Qty *"
            aria-label={`Line ${index + 1} quantity`}
          />
        </td>
        <td className="px-3 py-2 align-top w-28">
          <select
            className={cn("dmx-input text-xs", fieldError(errors, index, "unit") && "border-red-400")}
            value={line.unit}
            onChange={(e) => set({ unit: e.target.value })}
            aria-label={`Line ${index + 1} unit`}
          >
            {Object.entries(QUOTE_UOM_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2 align-top w-28">
          <input
            type="number"
            min={0}
            step="any"
            className={cn("dmx-input text-xs", fieldError(errors, index, "unitPrice") && "border-red-400")}
            value={line.unitPrice}
            onChange={(e) => set({ unitPrice: e.target.value })}
            placeholder="Unit price"
            aria-label={`Line ${index + 1} unit price`}
          />
        </td>
        <td className="px-3 py-2 align-top text-xs text-zinc-600 tabular-nums whitespace-nowrap">
          {lineTotalLabel}
        </td>
        <td className="px-3 py-2 align-top">
          <div className="flex gap-1">
            <button
              type="button"
              className="p-1.5 rounded-md text-zinc-500 hover:bg-paper-100 dmx-focus-ring"
              onClick={onDuplicate}
              aria-label={`Duplicate line ${index + 1}`}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-md text-zinc-500 hover:bg-paper-100 disabled:opacity-40 dmx-focus-ring"
              onClick={onRemove}
              disabled={!canRemove}
              aria-label={`Remove line ${index + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* Mobile card */}
      <div
        className="md:hidden dmx-card p-3 space-y-2"
        data-testid={`po-line-card-${index}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-500">Line {index + 1}</span>
          <div className="flex gap-1">
            <button type="button" className="p-1.5 rounded-md text-zinc-500 hover:bg-paper-100" onClick={onDuplicate} aria-label={`Duplicate line ${index + 1}`}>
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="p-1.5 rounded-md text-zinc-500 hover:bg-paper-100 disabled:opacity-40" onClick={onRemove} disabled={!canRemove} aria-label={`Remove line ${index + 1}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-zinc-600 col-span-2">
            Product
            <div className="mt-1">
              <ProductSearchSelect
                selectedId={line.productId || undefined}
                selectedLabel={line.productId ? `${line.productCode} · ${line.productName}` : undefined}
                onSelect={(p) =>
                  set({
                    productId: p.id,
                    productCode: p.sku,
                    productName: p.name,
                    description: line.description || p.description || p.name,
                    unit: p.unitOfMeasure || line.unit,
                    countryOfOrigin: p.countryOfOrigin || line.countryOfOrigin,
                    quickCreate: false,
                  })
                }
                onClear={() => set({ productId: "", productName: "" })}
              />
            </div>
          </label>
          <label className="block text-xs text-zinc-600">
            Product code *
            <input
              className={cn("dmx-input mt-1", identityError && "border-red-400")}
              value={line.productCode}
              onChange={(e) => set({ productCode: e.target.value, productId: "", productName: "" })}
            />
          </label>
          <label className="block text-xs text-zinc-600">
            Packaging
            <input className="dmx-input mt-1" value={line.packaging} onChange={(e) => set({ packaging: e.target.value })} />
          </label>
        </div>
        <label className="flex items-center gap-1 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={line.quickCreate}
            onChange={(e) => set({ quickCreate: e.target.checked })}
            data-testid={`po-line-quick-create-mobile-${index}`}
          />
          Quick-create from code
        </label>
        <label className="block text-xs text-zinc-600">
          Description
          <input
            className={cn("dmx-input mt-1", identityError && "border-red-400")}
            value={line.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </label>
        <label className="block text-xs text-zinc-600">
          Quality
          <input className="dmx-input mt-1" value={line.specification} onChange={(e) => set({ specification: e.target.value })} />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="block text-xs text-zinc-600">
            Quantity *
            <input type="number" min={0} step="any" className="dmx-input mt-1" value={line.quantity} onChange={(e) => set({ quantity: e.target.value })} />
          </label>
          <label className="block text-xs text-zinc-600">
            Unit *
            <select className="dmx-input mt-1" value={line.unit} onChange={(e) => set({ unit: e.target.value })}>
              {Object.entries(QUOTE_UOM_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-600">
            Unit price
            <input type="number" min={0} step="any" className="dmx-input mt-1" value={line.unitPrice} onChange={(e) => set({ unitPrice: e.target.value })} />
          </label>
        </div>
        <p className="text-xs text-zinc-500">Line total: {lineTotalLabel}</p>
      </div>
    </>
  );
}

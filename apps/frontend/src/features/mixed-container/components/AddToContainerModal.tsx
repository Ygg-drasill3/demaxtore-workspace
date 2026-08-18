import { useState } from "react";
import type { CatalogProductCardDTO } from "@dmx/contracts/mixed-container-catalog";
import { Button } from "@/components/ui/Button";

export function AddToContainerModal({
  product,
  onClose,
  onConfirm,
}: {
  product: CatalogProductCardDTO;
  onClose: () => void;
  onConfirm: (packagingId: string, pallets: number) => void;
}) {
  const options = product.packagingOptions.length > 0 ? product.packagingOptions : [];
  const defaultPkg = options.find((p) => p.isDefault) ?? options[0];
  const [packagingId, setPackagingId] = useState(defaultPkg?.id ?? "");
  const selectedPkg = options.find((p) => p.id === packagingId) ?? defaultPkg;
  const [pallets, setPallets] = useState(selectedPkg?.moqPallets ?? product.moqPallets);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="mc-add-modal">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <h2 className="font-display text-xl font-semibold">Add to container</h2>
        <p className="text-sm text-zinc-600">{product.name}</p>
        {options.length > 0 && (
          <div data-testid="mc-packaging-selector">
            <label className="text-xs uppercase text-zinc-500">Packaging</label>
            <div className="mt-2 space-y-2">
              {options.map((pkg) => (
                <label
                  key={pkg.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
                    packagingId === pkg.id ? "border-accent-900 bg-accent-50" : "border-zinc-200"
                  }`}
                  data-testid={`mc-packaging-option-${pkg.slug}`}
                >
                  <input
                    type="radio"
                    name="packaging"
                    value={pkg.id}
                    checked={packagingId === pkg.id}
                    onChange={() => {
                      setPackagingId(pkg.id);
                      setPallets(pkg.moqPallets);
                    }}
                  />
                  <span>{pkg.name}</span>
                  <span className="text-xs text-zinc-400 ml-auto">{pkg.unitsPerPallet} units/pallet</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="text-xs uppercase text-zinc-500">Pallets</label>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              className="h-9 w-9 rounded border"
              data-testid="mc-pallet-decrease"
              onClick={() => setPallets((p) => Math.max(selectedPkg?.moqPallets ?? product.moqPallets, p - 1))}
            >−</button>
            <span data-testid="mc-pallet-count" className="font-medium w-8 text-center">{pallets}</span>
            <button
              type="button"
              className="h-9 w-9 rounded border"
              data-testid="mc-pallet-increase"
              onClick={() => setPallets((p) => p + 1)}
            >+</button>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Minimum {selectedPkg?.moqPallets ?? product.moqPallets} pallet(s)</p>
        </div>
        <p className="text-xs text-amber-700">Indicative pricing only — not a final offer.</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            data-testid="mc-add-confirm"
            disabled={!packagingId}
            onClick={() => onConfirm(packagingId, pallets)}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

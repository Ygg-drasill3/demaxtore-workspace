import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ShipmentContainerDto } from "@dmx/contracts/shipment-workspace";
import { Drawer } from "@/components/ui/Drawer";
import { shipmentApi } from "../lib/shipment.api";
import { shipmentKeys } from "../lib/shipment.query-keys";
import { getApiErrorMessage } from "@/lib/api-errors";
import { toast } from "@/store/toast.store";

type Props = {
  shipmentId: string;
  containers: ShipmentContainerDto[];
  canManage: boolean;
};

const emptyForm = {
  containerNumber: "",
  containerType: "",
  sealNumber: "",
  grossWeightKg: "",
  volumeCbm: "",
  packageCount: "",
  status: "PLANNED",
};

export function ShipmentContainersPanel({ shipmentId, containers, canManage }: Props) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<ShipmentContainerDto | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: shipmentKeys.detail(shipmentId) });
    await qc.invalidateQueries({ queryKey: shipmentKeys.containers(shipmentId) });
    await qc.invalidateQueries({ queryKey: shipmentKeys.timeline(shipmentId) });
    await qc.invalidateQueries({ queryKey: ["trade-lineage", "shipment", shipmentId] });
  };

  const add = useMutation({
    mutationFn: () =>
      shipmentApi.addContainer(shipmentId, {
        containerNumber: form.containerNumber,
        containerType: form.containerType || null,
        sealNumber: form.sealNumber || null,
        grossWeightKg: form.grossWeightKg ? Number(form.grossWeightKg) : null,
        volumeCbm: form.volumeCbm ? Number(form.volumeCbm) : null,
        packageCount: form.packageCount ? Number(form.packageCount) : null,
        status: form.status as never,
      }),
    onSuccess: async () => {
      toast.success("Container added");
      setAdding(false);
      setForm(emptyForm);
      await invalidate();
    },
    onError: (err) => toast.error("Container update failed", getApiErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (containerId: string) => shipmentApi.removeContainer(shipmentId, containerId),
    onSuccess: async () => {
      toast.success("Container removed");
      setSelected(null);
      await invalidate();
    },
    onError: (err) => toast.error("Container update failed", getApiErrorMessage(err)),
  });

  return (
    <section data-testid="shipment-containers" className="dmx-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-medium">Containers</h2>
        {canManage && (
          <button type="button" className="dmx-btn-primary text-sm" data-testid="shipment-container-add" onClick={() => setAdding((v) => !v)}>
            Add
          </button>
        )}
      </div>

      {adding && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm border border-zinc-100 rounded-xl p-3">
          {(["containerNumber", "containerType", "sealNumber", "grossWeightKg", "volumeCbm", "packageCount"] as const).map((key) => (
            <label key={key} className="block space-y-1">
              <span className="text-xs text-zinc-500">{key}</span>
              <input
                className="h-9 w-full rounded-md border border-zinc-200 px-2"
                value={form[key]}
                data-testid={`shipment-container-field-${key}`}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
          <div className="col-span-full flex gap-2">
            <button type="button" className="dmx-btn-primary text-sm" disabled={add.isPending || !form.containerNumber} data-testid="shipment-container-save" onClick={() => void add.mutate()}>
              Save container
            </button>
            <button type="button" className="dmx-btn-secondary text-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {containers.length === 0 ? (
        <p className="text-sm text-zinc-500" data-testid="shipment-containers-empty">No containers.</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm" data-testid="shipment-containers-table">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b">
                  <th className="py-2 pr-2">Container</th>
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2 pr-2">Seal</th>
                  <th className="py-2 pr-2">Gross Weight</th>
                  <th className="py-2 pr-2">Volume</th>
                  <th className="py-2 pr-2">Packages</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-50">
                    <td className="py-2 pr-2 font-medium">{c.containerNumber}</td>
                    <td className="py-2 pr-2">{c.containerType || "—"}</td>
                    <td className="py-2 pr-2">{c.sealNumber || "—"}</td>
                    <td className="py-2 pr-2">{c.grossWeightKg ?? "—"}</td>
                    <td className="py-2 pr-2">{c.volumeCbm ?? "—"}</td>
                    <td className="py-2 pr-2">{c.packageCount ?? "—"}</td>
                    <td className="py-2 pr-2">{c.status}</td>
                    <td className="py-2">
                      <button type="button" className="text-accent-900 text-xs underline" onClick={() => setSelected(c)}>Open</button>
                      {canManage && (
                        <button type="button" className="ml-2 text-red-700 text-xs underline" data-testid={`shipment-container-remove-${c.id}`} onClick={() => void remove.mutate(c.id)}>Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="md:hidden space-y-2" data-testid="shipment-containers-cards">
            {containers.map((c) => (
              <li key={c.id} className="rounded-xl border border-zinc-200 p-3 text-sm">
                <button type="button" className="w-full text-left" onClick={() => setSelected(c)}>
                  <p className="font-medium">{c.containerNumber}</p>
                  <p className="text-xs text-zinc-500">{c.containerType || "—"} · {c.status}</p>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Container details">
        {selected && (
          <div className="space-y-3 text-sm p-1" data-testid="shipment-container-drawer">
            <p><span className="text-zinc-500">Number:</span> {selected.containerNumber}</p>
            <p><span className="text-zinc-500">Type:</span> {selected.containerType || "—"}</p>
            <p><span className="text-zinc-500">Seal:</span> {selected.sealNumber || "—"}</p>
            <p><span className="text-zinc-500">Gross weight:</span> {selected.grossWeightKg ?? "—"}</p>
            <p><span className="text-zinc-500">Volume:</span> {selected.volumeCbm ?? "—"}</p>
            <p><span className="text-zinc-500">Packages:</span> {selected.packageCount ?? "—"}</p>
            <p><span className="text-zinc-500">Status:</span> {selected.status}</p>
            <p className="text-xs text-zinc-500">Associated shipment: {shipmentId}</p>
          </div>
        )}
      </Drawer>
    </section>
  );
}

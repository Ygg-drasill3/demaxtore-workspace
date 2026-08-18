import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tradeLineageApi } from "../lib/trade-lineage.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { toast } from "@/store/toast.store";

type Props = {
  shipmentId: string;
  canMutate: boolean;
};

export function ShipmentLineAllocationPanel({ shipmentId, canMutate }: Props) {
  const qc = useQueryClient();
  const related = useQuery({
    queryKey: ["trade-lineage", "shipment", shipmentId, null],
    queryFn: () => tradeLineageApi.forShipment(shipmentId),
    staleTime: 15_000,
  });

  const [qtyByLine, setQtyByLine] = useState<Record<string, string>>({});
  const [containerByLine, setContainerByLine] = useState<Record<string, string>>({});

  const data = related.data;
  const pos = data?.purchaseOrders ?? [];
  const lines = data?.poLines ?? [];
  const containers = data?.containers ?? [];
  const allocations = useMemo(
    () => (data?.allocations ?? []).filter((a) => a.shipmentWorkspaceId === shipmentId),
    [data?.allocations, shipmentId],
  );

  const save = useMutation({
    mutationFn: (input: { purchaseOrderLineId: string; quantity: number; shipmentContainerId: string | null }) =>
      tradeLineageApi.upsertAllocation({
        purchaseOrderLineId: input.purchaseOrderLineId,
        shipmentWorkspaceId: shipmentId,
        shipmentContainerId: input.shipmentContainerId,
        quantity: input.quantity,
      }),
    onSuccess: async () => {
      toast.success("Line allocation saved");
      await qc.invalidateQueries({ queryKey: ["trade-lineage", "shipment", shipmentId] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Allocation failed")),
  });

  return (
    <section data-testid="shipment-line-allocation" className="dmx-card p-4 space-y-3">
      <div>
        <h2 className="font-medium">Line Allocation</h2>
        <p className="text-xs text-zinc-500">
          Allocate PO line quantity onto this shipment. Remaining quantity is authoritative on the server.
        </p>
      </div>

      {related.isLoading && <p className="text-sm text-zinc-500">Loading commercial lines…</p>}
      {related.isError && <p className="text-sm text-red-600">Could not load related PO lines.</p>}

      {data && lines.length === 0 && (
        <p className="text-sm text-zinc-500" data-testid="shipment-line-allocation-empty">
          No linked PO lines yet.
        </p>
      )}

      {pos.map((po) => {
        const poLines = lines.filter((l) => l.purchaseOrderId === po.id);
        if (poLines.length === 0) return null;
        return (
          <div key={po.id} className="rounded-lg border border-paper-200 p-3 space-y-2" data-testid={`allocation-po-${po.poNumber}`}>
            <p className="text-sm font-medium">
              {po.poNumber} <span className="text-zinc-500 font-normal">· {po.status}</span>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-zinc-500">
                  <tr>
                    <th className="py-1 pr-2">Product</th>
                    <th className="py-1 pr-2">Ordered</th>
                    <th className="py-1 pr-2">Allocated</th>
                    <th className="py-1 pr-2">Remaining</th>
                    {canMutate && (
                      <>
                        <th className="py-1 pr-2">This shipment</th>
                        <th className="py-1 pr-2">Container</th>
                        <th className="py-1"> </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {poLines.map((line) => {
                    const onShipment = allocations.find((a) => a.purchaseOrderLineId === line.id);
                    const qtyValue = qtyByLine[line.id] ?? (onShipment ? String(onShipment.quantity) : String(line.remainingQuantity));
                    const containerValue = containerByLine[line.id] ?? onShipment?.shipmentContainerId ?? "";
                    return (
                      <tr key={line.id} data-testid={`allocation-line-${line.sku || line.id}`}>
                        <td className="py-1 pr-2">
                          <span className="font-medium">{line.sku || "—"}</span>
                          <span className="text-zinc-600"> · {line.description}</span>
                        </td>
                        <td className="py-1 pr-2">{line.orderedQuantity}</td>
                        <td className="py-1 pr-2">{line.allocatedQuantity}</td>
                        <td className="py-1 pr-2">{line.remainingQuantity}</td>
                        {canMutate && (
                          <>
                            <td className="py-1 pr-2">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                className="h-8 w-24 rounded-md border border-zinc-200 px-2"
                                value={qtyValue}
                                data-testid={`allocation-qty-${line.id}`}
                                onChange={(e) => setQtyByLine((m) => ({ ...m, [line.id]: e.target.value }))}
                              />
                            </td>
                            <td className="py-1 pr-2">
                              <select
                                className="h-8 rounded-md border border-zinc-200 px-1"
                                value={containerValue}
                                data-testid={`allocation-container-${line.id}`}
                                onChange={(e) => setContainerByLine((m) => ({ ...m, [line.id]: e.target.value }))}
                              >
                                <option value="">None</option>
                                {containers.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.containerNumber}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-1">
                              <button
                                type="button"
                                className="dmx-btn-primary text-xs"
                                disabled={save.isPending}
                                data-testid={`allocation-save-${line.id}`}
                                onClick={() => {
                                  const qty = Number(qtyValue);
                                  if (!Number.isFinite(qty) || qty <= 0) {
                                    toast.error("Quantity must be greater than zero");
                                    return;
                                  }
                                  const remainingHeadroom = line.remainingQuantity + (onShipment?.quantity ?? 0);
                                  if (qty > remainingHeadroom + 1e-9) {
                                    toast.error("Quantity exceeds remaining PO line quantity");
                                    return;
                                  }
                                  save.mutate({
                                    purchaseOrderLineId: line.id,
                                    quantity: qty,
                                    shipmentContainerId: containerValue || null,
                                  });
                                }}
                              >
                                Save
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {allocations.length > 0 && (
        <ul className="text-xs text-zinc-600 space-y-1" data-testid="shipment-allocations-list">
          {allocations.map((a) => (
            <li key={a.id}>
              {a.sku || "Line"} · qty {a.quantity}
              {a.shipmentContainerId
                ? ` · ${containers.find((c) => c.id === a.shipmentContainerId)?.containerNumber ?? "container"}`
                : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

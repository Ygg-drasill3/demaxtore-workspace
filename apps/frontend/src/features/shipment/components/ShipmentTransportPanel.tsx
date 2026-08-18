import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ShipmentTransportMode } from "@dmx/contracts/shipment-workspace";
import { SHIPMENT_TRANSPORT_MODES } from "@dmx/contracts/shipment-workspace";
import { shipmentApi, type ShipmentWorkspaceDto } from "../lib/shipment.api";
import { shipmentKeys } from "../lib/shipment.query-keys";
import { getApiErrorMessage } from "@/lib/api-errors";
import { toast } from "@/store/toast.store";

type Props = {
  shipmentId: string;
  shipment: ShipmentWorkspaceDto;
  canEdit: boolean;
};

export function ShipmentTransportPanel({ shipmentId, shipment, canEdit }: Props) {
  const qc = useQueryClient();
  const mode = (shipment.transportMode ?? "SEA") as ShipmentTransportMode;
  const [localMode, setLocalMode] = useState(mode);
  const [fields, setFields] = useState({
    vesselName: shipment.vesselName ?? "",
    voyageNumber: shipment.voyageNumber ?? "",
    airlineName: shipment.airlineName ?? "",
    flightNumber: shipment.flightNumber ?? "",
    truckReference: shipment.truckReference ?? "",
    trainReference: shipment.trainReference ?? "",
    incoterm: shipment.incoterm ?? "",
  });

  const save = useMutation({
    mutationFn: () =>
      shipmentApi.patch(shipmentId, {
        transportMode: localMode,
        vesselName: fields.vesselName || null,
        voyageNumber: fields.voyageNumber || null,
        airlineName: fields.airlineName || null,
        flightNumber: fields.flightNumber || null,
        truckReference: fields.truckReference || null,
        trainReference: fields.trainReference || null,
        incoterm: fields.incoterm || null,
      }),
    onSuccess: async () => {
      toast.success("Transport updated");
      await qc.invalidateQueries({ queryKey: shipmentKeys.detail(shipmentId) });
    },
    onError: (err) => toast.error("Transport update failed", getApiErrorMessage(err)),
  });

  return (
    <section data-testid="shipment-transport" className="dmx-card p-4 space-y-3">
      <h2 className="font-medium">Transport</h2>
      <label className="block text-sm space-y-1 max-w-xs">
        <span className="text-xs text-zinc-500">Mode</span>
        <select
          className="h-9 w-full rounded-md border border-zinc-200 px-2"
          value={localMode}
          disabled={!canEdit}
          data-testid="shipment-transport-mode"
          onChange={(e) => setLocalMode(e.target.value as ShipmentTransportMode)}
        >
          {SHIPMENT_TRANSPORT_MODES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {localMode === "SEA" && (
          <>
            <Field label="Vessel" value={fields.vesselName} disabled={!canEdit} testId="shipment-transport-vessel" onChange={(v) => setFields((f) => ({ ...f, vesselName: v }))} />
            <Field label="Voyage" value={fields.voyageNumber} disabled={!canEdit} testId="shipment-transport-voyage" onChange={(v) => setFields((f) => ({ ...f, voyageNumber: v }))} />
          </>
        )}
        {localMode === "AIR" && (
          <>
            <Field label="Airline" value={fields.airlineName} disabled={!canEdit} testId="shipment-transport-airline" onChange={(v) => setFields((f) => ({ ...f, airlineName: v }))} />
            <Field label="Flight number" value={fields.flightNumber} disabled={!canEdit} testId="shipment-transport-flight" onChange={(v) => setFields((f) => ({ ...f, flightNumber: v }))} />
          </>
        )}
        {localMode === "ROAD" && (
          <Field label="Truck reference" value={fields.truckReference} disabled={!canEdit} testId="shipment-transport-truck" onChange={(v) => setFields((f) => ({ ...f, truckReference: v }))} />
        )}
        {localMode === "RAIL" && (
          <Field label="Train reference" value={fields.trainReference} disabled={!canEdit} testId="shipment-transport-train" onChange={(v) => setFields((f) => ({ ...f, trainReference: v }))} />
        )}
        <Field label="Incoterm" value={fields.incoterm} disabled={!canEdit} testId="shipment-transport-incoterm" onChange={(v) => setFields((f) => ({ ...f, incoterm: v }))} />
      </div>

      {canEdit && (
        <button type="button" className="dmx-btn-primary text-sm" disabled={save.isPending} data-testid="shipment-transport-save" onClick={() => void save.mutate()}>
          Save transport
        </button>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <input
        className="h-9 w-full rounded-md border border-zinc-200 px-2 disabled:bg-zinc-50"
        value={value}
        disabled={disabled}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

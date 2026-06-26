import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { forwarderApi } from "../lib/forwarder.api";
import { Button } from "@/components/ui/Button";

const MILESTONE_ACTIONS = [
  { action: "confirm_booking", label: "Confirm booking" },
  { action: "assign_container", label: "Assign container" },
  { action: "load_vessel", label: "Load vessel" },
  { action: "depart_vessel", label: "Depart vessel" },
  { action: "arrive_destination", label: "Arrive destination" },
] as const;

export default function ForwarderShipmentPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [containerNumber, setContainerNumber] = useState("");

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["forwarder", "shipments"],
    queryFn: forwarderApi.listShipments,
  });

  const shipment = shipments?.find((s) => s.id === id);
  const milestone = useMutation({
    mutationFn: (action: string) =>
      forwarderApi.submitMilestone(id!, {
        action,
        payload: action === "assign_container" ? { containerNumber } : undefined,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["forwarder", "shipments"] }),
  });

  if (isLoading) return <p className="text-sm text-zinc-500 p-6">Loading…</p>;
  if (!shipment) return <p className="text-sm text-red-600 p-6">Shipment not found.</p>;

  return (
    <div data-testid="forwarder-shipment" className="max-w-[800px] mx-auto space-y-6 p-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">{shipment.externalRef}</h1>
        <p className="text-sm text-zinc-500">State: {shipment.state}</p>
      </header>

      <section className="dmx-card p-5 space-y-3">
        <h2 className="font-medium">Milestones</h2>
        <input
          className="dmx-input w-full"
          placeholder="Container number (for assign container)"
          value={containerNumber}
          onChange={(e) => setContainerNumber(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {MILESTONE_ACTIONS.map(({ action, label }) => (
            <Button
              key={action}
              size="sm"
              variant="secondary"
              loading={milestone.isPending && milestone.variables === action}
              onClick={() => void milestone.mutate(action)}
            >
              {label}
            </Button>
          ))}
        </div>
        {milestone.isError && <p className="text-xs text-red-600">Milestone update failed.</p>}
        {milestone.isSuccess && <p className="text-xs text-emerald-600">Milestone recorded.</p>}
      </section>
    </div>
  );
}

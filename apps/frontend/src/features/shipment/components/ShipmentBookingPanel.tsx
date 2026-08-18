import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ShipmentBookingDto, ShipmentTransportMode } from "@dmx/contracts/shipment-workspace";
import { isBookingStatus, nextBookingStatuses, type BookingStatus } from "@dmx/contracts/booking-lifecycle";
import { shipmentApi } from "../lib/shipment.api";
import { shipmentKeys } from "../lib/shipment.query-keys";
import { getApiErrorMessage } from "@/lib/api-errors";
import { toast } from "@/store/toast.store";

type Props = {
  shipmentId: string;
  booking: ShipmentBookingDto;
  transportMode: ShipmentTransportMode;
  canEdit: boolean;
};

export function ShipmentBookingPanel({ shipmentId, booking, transportMode, canEdit }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    bookingReference: booking.bookingReference ?? "",
    carrier: booking.carrier ?? "",
    forwarder: booking.forwarder ?? "",
    vesselOrFlight: booking.vesselOrFlight ?? "",
    voyage: booking.voyage ?? "",
    portOfLoading: booking.portOfLoading,
    portOfDischarge: booking.portOfDischarge,
    etd: booking.etd?.slice(0, 16) ?? "",
    eta: booking.eta?.slice(0, 16) ?? "",
    transportMode,
  });

  useEffect(() => {
    if (editing) return;
    setForm({
      bookingReference: booking.bookingReference ?? "",
      carrier: booking.carrier ?? "",
      forwarder: booking.forwarder ?? "",
      vesselOrFlight: booking.vesselOrFlight ?? "",
      voyage: booking.voyage ?? "",
      portOfLoading: booking.portOfLoading,
      portOfDischarge: booking.portOfDischarge,
      etd: booking.etd?.slice(0, 16) ?? "",
      eta: booking.eta?.slice(0, 16) ?? "",
      transportMode,
    });
  }, [booking, transportMode, editing]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: shipmentKeys.detail(shipmentId) });
    await qc.invalidateQueries({ queryKey: shipmentKeys.timeline(shipmentId) });
    await qc.invalidateQueries({ queryKey: ["trade-lineage", "shipment", shipmentId] });
  };

  const save = useMutation({
    mutationFn: (confirm: boolean) =>
      shipmentApi.upsertBooking(shipmentId, {
        bookingReference: form.bookingReference || null,
        carrier: form.carrier || null,
        forwarder: form.forwarder || null,
        vesselOrFlight: form.vesselOrFlight || null,
        voyage: form.voyage || null,
        portOfLoading: form.portOfLoading,
        portOfDischarge: form.portOfDischarge,
        etd: form.etd ? new Date(form.etd).toISOString() : null,
        eta: form.eta ? new Date(form.eta).toISOString() : null,
        transportMode: form.transportMode,
        confirm,
      }),
    onSuccess: async () => {
      toast.success("Booking saved");
      setEditing(false);
      await invalidate();
    },
    onError: (err) => toast.error("Booking failed", getApiErrorMessage(err)),
  });

  const cancel = useMutation({
    mutationFn: () => shipmentApi.cancelBooking(shipmentId, { reason: "Cancelled from workspace" }),
    onSuccess: async () => {
      toast.success("Booking cancelled");
      setEditing(false);
      await invalidate();
    },
    onError: (err) => toast.error("Cancel failed", getApiErrorMessage(err)),
  });

  const transition = useMutation({
    mutationFn: (toStatus: BookingStatus) => shipmentApi.transitionBooking(shipmentId, { toStatus }),
    onSuccess: async (_dto, toStatus) => {
      toast.success(`Booking ${toStatus.toLowerCase()}`);
      await invalidate();
    },
    onError: (err) => toast.error("Booking transition failed", getApiErrorMessage(err)),
  });

  const currentStatus = isBookingStatus(booking.status) ? booking.status : null;
  const nextStatuses = nextBookingStatuses(currentStatus);
  const pendingConfirmation = currentStatus === "REQUESTED" || currentStatus === "PENDING" || currentStatus === "DRAFT";

  if (!booking.hasBooking && !editing) {
    return (
      <section data-testid="shipment-booking" className="dmx-card p-4 space-y-3">
        <h2 className="font-medium">Booking</h2>
        <p className="text-sm text-zinc-500" data-testid="shipment-booking-empty">No booking created.</p>
        {canEdit && (
          <button type="button" className="dmx-btn-primary text-sm" data-testid="shipment-booking-create" onClick={() => setEditing(true)}>
            Create Booking
          </button>
        )}
      </section>
    );
  }

  return (
    <section data-testid="shipment-booking" className="dmx-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-medium">Booking</h2>
        {canEdit && !editing && (
          <div className="flex gap-2">
            <button type="button" className="dmx-btn-secondary text-sm" data-testid="shipment-booking-edit" onClick={() => setEditing(true)}>
              Edit Booking
            </button>
            <button type="button" className="dmx-btn-secondary text-sm text-red-700" data-testid="shipment-booking-cancel" onClick={() => void cancel.mutate()}>
              Cancel Booking
            </button>
          </div>
        )}
      </div>

      {pendingConfirmation && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" data-testid="shipment-booking-pending-banner">
          Booking confirmation pending. DeMaxtore Operations records REQUESTED → PENDING → CONFIRMED here. Repeat clicks are ignored.
        </p>
      )}

      {canEdit && !editing && nextStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="shipment-booking-transitions">
          {nextStatuses.map((status) => (
            <button
              key={status}
              type="button"
              className="dmx-btn-primary text-sm"
              disabled={transition.isPending}
              data-testid={`shipment-booking-transition-${status}`}
              onClick={() => void transition.mutate(status)}
            >
              {status === "REQUESTED"
                ? "Mark requested"
                : status === "PENDING"
                  ? "Mark pending"
                  : status === "CONFIRMED"
                    ? "Confirm booking"
                    : status === "AMENDED"
                      ? "Mark amended"
                      : status.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      {editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {(
            [
              ["bookingReference", "Booking reference"],
              ["carrier", "Carrier"],
              ["forwarder", "Forwarder"],
              ["vesselOrFlight", transportMode === "AIR" ? "Flight" : "Vessel"],
              ["voyage", "Voyage"],
              ["portOfLoading", "Port of loading"],
              ["portOfDischarge", "Port of discharge"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block space-y-1">
              <span className="text-xs text-zinc-500">{label}</span>
              <input
                className="h-9 w-full rounded-md border border-zinc-200 px-2"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                data-testid={`shipment-booking-field-${key}`}
              />
            </label>
          ))}
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Booking ETD</span>
            <input type="datetime-local" className="h-9 w-full rounded-md border border-zinc-200 px-2" value={form.etd} onChange={(e) => setForm((f) => ({ ...f, etd: e.target.value }))} data-testid="shipment-booking-field-etd" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">Booking ETA</span>
            <input type="datetime-local" className="h-9 w-full rounded-md border border-zinc-200 px-2" value={form.eta} onChange={(e) => setForm((f) => ({ ...f, eta: e.target.value }))} data-testid="shipment-booking-field-eta" />
          </label>
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <button type="button" className="dmx-btn-primary text-sm" disabled={save.isPending} data-testid="shipment-booking-save" onClick={() => void save.mutate(false)}>
              Save
            </button>
            <button type="button" className="dmx-btn-secondary text-sm" disabled={save.isPending} data-testid="shipment-booking-save-confirm" onClick={() => void save.mutate(true)}>
              Save & confirm
            </button>
            <button type="button" className="dmx-btn-secondary text-sm" onClick={() => setEditing(false)}>Close</button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm" data-testid="shipment-booking-details">
          <div>
            <dt className="text-xs text-zinc-500">Status</dt>
            <dd data-testid="shipment-booking-status">{booking.status || "—"}</dd>
          </div>
          <div><dt className="text-xs text-zinc-500">Reference</dt><dd>{booking.bookingReference || "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">Carrier booking #</dt><dd>{booking.carrierBookingNumber || "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">Carrier</dt><dd>{booking.carrier || "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">Forwarder</dt><dd>{booking.forwarder || "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">Vessel / Flight</dt><dd>{booking.vesselOrFlight || "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">Voyage</dt><dd>{booking.voyage || "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">POL → POD</dt><dd>{booking.portOfLoading} → {booking.portOfDischarge}</dd></div>
          <div><dt className="text-xs text-zinc-500">Booking ETD</dt><dd>{booking.etd ? new Date(booking.etd).toLocaleString() : "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">Booking ETA</dt><dd data-testid="shipment-booking-eta">{booking.eta ? new Date(booking.eta).toLocaleString() : "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">SI cut-off</dt><dd>{booking.siCutoff ? new Date(booking.siCutoff).toLocaleString() : "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">VGM cut-off</dt><dd>{booking.vgmCutoff ? new Date(booking.vgmCutoff).toLocaleString() : "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">CY / Gate-in cut-off</dt><dd>{booking.cyCutoff ? new Date(booking.cyCutoff).toLocaleString() : "—"}</dd></div>
          <div><dt className="text-xs text-zinc-500">Document cut-off</dt><dd>{booking.documentCutoff ? new Date(booking.documentCutoff).toLocaleString() : "—"}</dd></div>
          {booking.cancelledAt && (
            <div className="sm:col-span-3">
              <dt className="text-xs text-zinc-500">Cancelled</dt>
              <dd data-testid="shipment-booking-cancelled">
                {new Date(booking.cancelledAt).toLocaleString()}
                {booking.cancelReason ? ` — ${booking.cancelReason}` : ""}
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}

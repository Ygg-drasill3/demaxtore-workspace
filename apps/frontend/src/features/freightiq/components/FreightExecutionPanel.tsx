/**
 * Sprint 33 — FreightIQ Execution summary (derived from canonical entities).
 */
import { Link } from "react-router-dom";
import type { FreightIqExecutionSummary } from "@dmx/contracts/freightiq-execution";

type Props = {
  execution: FreightIqExecutionSummary;
  busy?: boolean;
  onProceedToBooking?: () => void;
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const STEPS: Array<{ key: keyof typeof STEP_DONE; label: string }> = [
  { key: "request", label: "Request" },
  { key: "offer", label: "Offer" },
  { key: "booking", label: "Booking" },
  { key: "shipment", label: "Shipment" },
  { key: "tracking", label: "Tracking" },
];

const STEP_DONE = {
  request: ["REQUESTED", "OFFERS_AVAILABLE", "OFFER_SELECTED", "BOOKING_REQUESTED", "BOOKING_PENDING", "BOOKING_CONFIRMED", "BOOKING_AMENDED", "SHIPMENT_ACTIVE", "IN_TRANSIT", "ARRIVED", "DELIVERED"],
  offer: ["OFFER_SELECTED", "BOOKING_REQUESTED", "BOOKING_PENDING", "BOOKING_CONFIRMED", "BOOKING_AMENDED", "SHIPMENT_ACTIVE", "IN_TRANSIT", "ARRIVED", "DELIVERED"],
  booking: ["BOOKING_CONFIRMED", "BOOKING_AMENDED", "SHIPMENT_ACTIVE", "IN_TRANSIT", "ARRIVED", "DELIVERED"],
  shipment: ["SHIPMENT_ACTIVE", "IN_TRANSIT", "ARRIVED", "DELIVERED"],
  tracking: ["IN_TRANSIT", "ARRIVED", "DELIVERED"],
} as const;

export function FreightExecutionPanel({ execution, busy, onProceedToBooking }: Props) {
  const state = execution.state;
  const showProceed =
    (execution.nextAction === "proceed_to_booking" || execution.nextAction === "open_booking") &&
    !!onProceedToBooking;

  return (
    <section data-testid="freightiq-execution" className="dmx-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="dmx-eyebrow">FreightIQ Execution</span>
          <h3 className="font-display text-lg font-semibold mt-0.5" data-testid="freightiq-execution-state">
            {state.replace(/_/g, " ")}
          </h3>
        </div>
        {execution.shipmentRef && (
          <span className="text-xs text-zinc-500" data-testid="freightiq-execution-shipment-ref">
            {execution.shipmentRef}
          </span>
        )}
      </div>

      <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {STEPS.map((step) => {
          const done = (STEP_DONE[step.key] as readonly string[]).includes(state);
          return (
            <li
              key={step.key}
              className={`rounded-md border px-2 py-1.5 ${done ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-zinc-200 text-zinc-500"}`}
              data-testid={`freightiq-execution-step-${step.key}`}
            >
              <span className="font-medium">{done ? "✓ " : ""}{step.label}</span>
            </li>
          );
        })}
      </ol>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">Selected offer</dt>
          <dd data-testid="freightiq-execution-offer">
            {execution.selectedCarrier || "—"}
            {execution.selectedOfferPrice != null
              ? ` · ${execution.selectedOfferPrice.toLocaleString()} ${execution.selectedOfferCurrency ?? ""}`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Booking</dt>
          <dd data-testid="freightiq-execution-booking">
            {execution.bookingStatus || "—"}
            {execution.bookingReference ? ` · ${execution.bookingReference}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Shipment</dt>
          <dd>{execution.shipmentState?.replace(/_/g, " ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Booking ETA</dt>
          <dd data-testid="freightiq-execution-booking-eta">{fmt(execution.bookingEta)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Maritime ETA</dt>
          <dd data-testid="freightiq-execution-maritime-eta">{fmt(execution.maritimeEta)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Tracking</dt>
          <dd data-testid="freightiq-execution-tracking">
            {execution.trackingLinked
              ? execution.trackingStatus || "Linked"
              : execution.containerCount === 0
                ? "Waiting for container assignment"
                : "Not linked"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        {showProceed && (
          <button
            type="button"
            className="dmx-btn-primary text-sm"
            disabled={busy}
            data-testid="freightiq-proceed-to-booking"
            onClick={() => onProceedToBooking?.()}
          >
            {execution.nextActionLabel || "Proceed to booking"}
          </button>
        )}
        {execution.bookingUrl && (
          <Link
            to={execution.bookingUrl}
            className="dmx-btn-secondary text-sm"
            data-testid="freightiq-open-booking"
          >
            Open booking
          </Link>
        )}
        {execution.shipmentUrl && (
          <Link
            to={execution.shipmentUrl}
            className="text-sm text-accent-900 hover:underline self-center"
            data-testid="freightiq-open-shipment-exec"
          >
            Open shipment →
          </Link>
        )}
      </div>
    </section>
  );
}

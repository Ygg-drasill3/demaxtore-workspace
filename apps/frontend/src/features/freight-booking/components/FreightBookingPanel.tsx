import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FreightBookingPanelDto } from "@dmx/contracts/freight-booking";
import { freightBookingApi } from "../lib/freight-booking.api";
import { CargoReadyForecastCard } from "./CargoReadyForecastCard";
import { CarrierComparisonTable } from "./CarrierComparisonTable";
import { BookingRecommendationCard } from "./BookingRecommendationCard";
import { BookingStatusBadge } from "./BookingStatusBadge";

export function FreightBookingPanel({
  tradeId,
  canSelect = false,
  canConfirm = false,
}: {
  tradeId: string;
  /** Buyer or Admin — select carrier option */
  canSelect?: boolean;
  /** Admin only — confirm booking */
  canConfirm?: boolean;
}) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["freight-booking-panel", tradeId],
    queryFn: () => freightBookingApi.panel(tradeId),
  });

  const selectMut = useMutation({
    mutationFn: ({ bookingId, carrierOptionId }: { bookingId: string; carrierOptionId: string }) =>
      freightBookingApi.select(bookingId, { carrierOptionId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["freight-booking-panel", tradeId] }),
  });

  const confirmMut = useMutation({
    mutationFn: (bookingId: string) => freightBookingApi.confirm(bookingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["freight-booking-panel", tradeId] }),
  });

  if (isLoading) {
    return (
      <div data-testid="freight-booking-panel-loading" className="dmx-card p-5 animate-pulse text-sm text-zinc-500">
        Loading FreightIQ booking…
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="freight-booking-panel-error" className="dmx-card p-5 text-sm text-red-600">
        Unable to load booking panel.
      </div>
    );
  }

  if (!data || !("carrierOptions" in data)) {
    return (
      <section data-testid="freight-booking-panel" className="dmx-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-semibold text-ink-900">FreightIQ Booking</h3>
          {"bookingStatus" in (data ?? {}) && (
            <BookingStatusBadge status={(data as { bookingStatus?: string }).bookingStatus} />
          )}
        </div>
        <div className="p-5">
          <CargoReadyForecastCard forecast={data?.forecast ?? null} />
        </div>
      </section>
    );
  }

  const panel = data as FreightBookingPanelDto;
  const selectable = canSelect && ["UNDER_REVIEW", "REBOOK_REQUIRED", "PLANNING"].includes(panel.booking?.status ?? "");

  return (
    <section data-testid="freight-booking-panel" className="dmx-card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-ink-900">FreightIQ Booking Engine</h3>
        <BookingStatusBadge status={panel.booking?.status} />
      </div>
      <div className="p-5 space-y-5">
        <CargoReadyForecastCard forecast={panel.forecast} />

        {panel.recommendedOption && (
          <BookingRecommendationCard option={panel.recommendedOption} label={panel.bestOverallLabel} />
        )}

        <CarrierComparisonTable
          options={panel.carrierOptions}
          selectable={selectable}
          onSelect={(carrierOptionId) => {
            if (!panel.booking?.id) return;
            selectMut.mutate({ bookingId: panel.booking.id, carrierOptionId });
          }}
        />

        {panel.selectedOption && (
          <div data-testid="booking-selected-summary" className="text-sm text-zinc-700">
            Selected: <strong>{panel.selectedOption.carrierName}</strong> · {panel.selectedOption.vesselName}
          </div>
        )}

        {canConfirm && panel.booking?.status === "APPROVED" && (
          <button
            type="button"
            data-testid="booking-confirm-btn"
            className="dmx-btn dmx-btn-primary w-full"
            disabled={confirmMut.isPending}
            onClick={() => confirmMut.mutate(panel.booking!.id)}
          >
            Confirm Booking
          </button>
        )}
      </div>
    </section>
  );
}

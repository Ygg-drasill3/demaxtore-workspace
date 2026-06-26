import { api } from "@/lib/api";
import type {
  CargoReadyForecastDto,
  FreightBookingDto,
  FreightBookingKpiDto,
  FreightBookingPanelDto,
  FreightBookingSupplierPanelDto,
} from "@dmx/contracts/freight-booking";
import type {
  CreateFreightBookingPayload,
  SelectCarrierOptionPayload,
} from "@dmx/contracts/freight-booking.zod";

export const freightBookingApi = {
  list: (params?: { tradeId?: string; status?: string; limit?: number }) =>
    api.get<FreightBookingDto[]>("/freight-bookings", { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<{ booking: FreightBookingDto; carrierOptions: unknown[] }>(`/freight-bookings/${id}`)
      .then((r) => r.data),

  panel: (tradeId: string) =>
    api.get<FreightBookingPanelDto | FreightBookingSupplierPanelDto>(
      "/freight-bookings/panel",
      { params: { tradeId } },
    ).then((r) => r.data),

  create: (payload: CreateFreightBookingPayload) =>
    api.post<unknown>("/freight-bookings", payload).then((r) => r.data),

  select: (id: string, payload: SelectCarrierOptionPayload) =>
    api.post<FreightBookingDto>(`/freight-bookings/${id}/select`, payload).then((r) => r.data),

  confirm: (id: string) =>
    api.post<FreightBookingDto>(`/freight-bookings/${id}/confirm`).then((r) => r.data),

  kpiSummary: () =>
    api.get<FreightBookingKpiDto>("/freight-bookings/kpi/summary").then((r) => r.data),
};

export type { CargoReadyForecastDto, FreightBookingPanelDto };

import { api } from "@/lib/api";
import type { InlandDeliveryDto } from "@dmx/contracts/inland-delivery";

export const inlandApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<{ items: InlandDeliveryDto[] }>("/inland", { params }).then((r) => r.data),

  get: (id: string) => api.get<InlandDeliveryDto>(`/inland/${id}`).then((r) => r.data),

  byShipment: (shipmentWorkspaceId: string) =>
    api
      .get<InlandDeliveryDto | null>(`/inland/by-shipment/${shipmentWorkspaceId}`)
      .then((r) => r.data),

  request: (body: {
    shipmentWorkspaceId: string;
    deliveryAddress: string;
    deliveryName?: string | null;
    deliveryCity?: string | null;
    deliveryPostalCode?: string | null;
    deliveryContactName?: string | null;
    deliveryContactPhone?: string | null;
    pickupLocation?: string | null;
    preferredPickupAt?: string | null;
    instructions?: string | null;
  }) => api.post<InlandDeliveryDto>("/inland/request", body).then((r) => r.data),

  syncTrucker: (id: string) =>
    api.post<InlandDeliveryDto>(`/inland/${id}/sync-trucker`).then((r) => r.data),

  schedulePickup: (
    id: string,
    body: {
      pickupAt: string;
      pickupWindow?: string | null;
      appointmentRef?: string | null;
      pickupLocation?: string | null;
      instructions?: string | null;
      driverName?: string | null;
      driverPhone?: string | null;
      vehiclePlate?: string | null;
    },
  ) => api.post<InlandDeliveryDto>(`/inland/${id}/schedule-pickup`, body).then((r) => r.data),

  readyForPickup: (id: string) =>
    api.post<InlandDeliveryDto>(`/inland/${id}/ready-for-pickup`).then((r) => r.data),

  confirmPickup: (id: string, body?: { note?: string | null; timestamp?: string | null }) =>
    api.post<InlandDeliveryDto>(`/inland/${id}/confirm-pickup`, body ?? {}).then((r) => r.data),

  gateOut: (id: string, body?: { note?: string | null; timestamp?: string | null }) =>
    api.post<InlandDeliveryDto>(`/inland/${id}/gate-out`, body ?? {}).then((r) => r.data),

  inTransit: (id: string, body?: { note?: string | null; timestamp?: string | null }) =>
    api.post<InlandDeliveryDto>(`/inland/${id}/in-transit`, body ?? {}).then((r) => r.data),

  markDelivered: (id: string, body?: { note?: string | null; timestamp?: string | null }) =>
    api.post<InlandDeliveryDto>(`/inland/${id}/mark-delivered`, body ?? {}).then((r) => r.data),

  linkPod: (id: string, tradeDocumentId: string) =>
    api
      .post<InlandDeliveryDto>(`/inland/${id}/link-pod`, { tradeDocumentId })
      .then((r) => r.data),

  recordCost: (
    id: string,
    body: {
      amount: number;
      currency?: string;
      kind?: "ESTIMATED" | "ACTUAL";
      source?: "MANUAL" | "BROKER_ENTERED" | "SYSTEM";
    },
  ) => api.post<InlandDeliveryDto>(`/inland/${id}/cost`, body).then((r) => r.data),

  events: (id: string) => api.get(`/inland/${id}/events`).then((r) => r.data),
};

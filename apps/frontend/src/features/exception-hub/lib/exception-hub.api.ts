import { api } from "@/lib/api";
import type {
  ExceptionHubDetail,
  ExceptionHubPayload,
  ExceptionHubQuery,
  ExceptionOwnerRole,
  TradeExceptionsPanelPayload,
} from "@dmx/contracts/exception-hub";

export const exceptionHubApi = {
  list: (params?: Partial<ExceptionHubQuery>) =>
    api.get<ExceptionHubPayload>("/exceptions", { params }).then((r) => r.data),

  detail: (id: string) =>
    api.get<ExceptionHubDetail>(`/exceptions/${id}`).then((r) => r.data),

  assign: (id: string, ownerId: string, ownerRole: ExceptionOwnerRole) =>
    api.post<ExceptionHubDetail>(`/exceptions/${id}/assign`, { ownerId, ownerRole }).then((r) => r.data),

  resolve: (id: string, resolutionNote: string, resolutionEta?: string) =>
    api.post<ExceptionHubDetail>(`/exceptions/${id}/resolve`, { resolutionNote, resolutionEta }).then((r) => r.data),

  close: (id: string, note?: string) =>
    api.post<ExceptionHubDetail>(`/exceptions/${id}/close`, { note }).then((r) => r.data),

  tradeExceptions: (tradeId: string) =>
    api.get<TradeExceptionsPanelPayload>(`/trades/${tradeId}/exceptions`).then((r) => r.data),

  shipmentExceptions: (shipmentId: string) =>
    api.get<TradeExceptionsPanelPayload["open"]>(`/shipments/${shipmentId}/exceptions`).then((r) => r.data),
};

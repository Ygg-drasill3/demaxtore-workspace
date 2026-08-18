import { api } from "@/lib/api";
import type { CustomsCaseDto, CustomsReadinessDto } from "@dmx/contracts/customs";

export const customsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api
      .get<{
        items: CustomsCaseDto[];
        pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
      }>("/customs/cases", { params })
      .then((r) => r.data),

  get: (id: string) => api.get<CustomsCaseDto>(`/customs/cases/${id}`).then((r) => r.data),

  ensure: (shipmentWorkspaceId: string) =>
    api
      .post<CustomsCaseDto>("/customs/cases/ensure", { shipmentWorkspaceId })
      .then((r) => r.data),

  readiness: (id: string) =>
    api.get<CustomsReadinessDto>(`/customs/cases/${id}/readiness`).then((r) => r.data),

  transition: (id: string, body: { toStatus: string; reason?: string }) =>
    api.post<CustomsCaseDto>(`/customs/cases/${id}/transition`, body).then((r) => r.data),

  placeHold: (id: string, body: { category: string; reason: string }) =>
    api.post<CustomsCaseDto>(`/customs/cases/${id}/hold`, body).then((r) => r.data),

  resolveHold: (id: string, body?: { resumeStatus?: string; reason?: string }) =>
    api.post<CustomsCaseDto>(`/customs/cases/${id}/resolve-hold`, body ?? {}).then((r) => r.data),

  recordDeclaration: (
    id: string,
    body: { declarationReference: string; declarationDate?: string; customsOffice?: string },
  ) => api.post<CustomsCaseDto>(`/customs/cases/${id}/declaration`, body).then((r) => r.data),

  syncBroker: (id: string) =>
    api.post<CustomsCaseDto>(`/customs/cases/${id}/sync-broker`).then((r) => r.data),

  events: (id: string) => api.get(`/customs/cases/${id}/events`).then((r) => r.data),

  eligibility: (shipmentWorkspaceId: string) =>
    api
      .get<{
        eligible: boolean;
        destinationCountryCode: string | null;
        customsCaseId: string | null;
        status: string | null;
        readinessStatus: string | null;
      }>(`/customs/shipments/${shipmentWorkspaceId}/eligibility`)
      .then((r) => r.data),

  byShipment: (shipmentWorkspaceId: string) =>
    api
      .get<CustomsCaseDto | null>(`/customs/shipments/${shipmentWorkspaceId}`)
      .then((r) => r.data),

  /** Sprint 39 — broker execution */
  startReview: (id: string, body?: { reason?: string }) =>
    api.post<CustomsCaseDto>(`/customs/cases/${id}/start-review`, body ?? {}).then((r) => r.data),

  verifyClassification: (
    id: string,
    body: { productId: string; gtipCode: string; customsDescription?: string; reviewNote?: string },
  ) =>
    api
      .post<CustomsCaseDto>(`/customs/cases/${id}/verify-classification`, body)
      .then((r) => r.data),

  requestDocument: (
    id: string,
    body: { documentType: string; reason: string; ownerRole?: string },
  ) =>
    api.post<CustomsCaseDto>(`/customs/cases/${id}/request-document`, body).then((r) => r.data),

  requestInformation: (
    id: string,
    body: {
      category: string;
      title: string;
      description: string;
      ownerRole?: string;
      productId?: string;
    },
  ) =>
    api
      .post<CustomsCaseDto>(`/customs/cases/${id}/request-information`, body)
      .then((r) => r.data),

  startDeclarationPreparation: (id: string) =>
    api
      .post<CustomsCaseDto>(`/customs/cases/${id}/start-declaration-preparation`, {})
      .then((r) => r.data),

  startCustomsProcessing: (id: string) =>
    api
      .post<CustomsCaseDto>(`/customs/cases/${id}/start-customs-processing`, {})
      .then((r) => r.data),

  markClearancePending: (id: string) =>
    api
      .post<CustomsCaseDto>(`/customs/cases/${id}/mark-clearance-pending`, {})
      .then((r) => r.data),

  markCleared: (id: string) =>
    api.post<CustomsCaseDto>(`/customs/cases/${id}/mark-cleared`, {}).then((r) => r.data),

  brokerHold: (
    id: string,
    body: { category: string; reason: string; recommendedAction?: string; ownerRole?: string },
  ) => api.post<CustomsCaseDto>(`/customs/cases/${id}/broker-hold`, body).then((r) => r.data),

  getDutyTax: (id: string) => api.get(`/customs/cases/${id}/duty-tax`).then((r) => r.data),

  calculateDutyTax: (
    id: string,
    body: {
      targetCurrency?: string;
      exchangeRate?: number | null;
      exchangeRateSource?: string | null;
      calculationDate?: string;
      freightAmountOverride?: number | null;
      insuranceAmount?: number | null;
    } = {},
  ) => api.post(`/customs/cases/${id}/duty-tax/calculate`, body).then((r) => r.data),
};

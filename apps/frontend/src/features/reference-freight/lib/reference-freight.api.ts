import { api } from "@/lib/api";
import type {
  ReferenceFreightCopyMonthResultDto,
  ReferenceFreightImportResultDto,
  ReferenceFreightRateAuditDto,
  ReferenceFreightRateDto,
  ReferenceFreightRateListPage,
} from "@dmx/contracts/reference-freight";
import type {
  CopyReferenceFreightMonthPayload,
  CreateReferenceFreightRatePayload,
  ListReferenceFreightRatesQuery,
  UpdateReferenceFreightRatePayload,
} from "@dmx/contracts/reference-freight.zod";

export const referenceFreightAdminApi = {
  list: (params?: ListReferenceFreightRatesQuery) =>
    api.get<ReferenceFreightRateListPage>("/admin/reference-freight-rates", { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<ReferenceFreightRateDto>(`/admin/reference-freight-rates/${id}`).then((r) => r.data),

  create: (payload: CreateReferenceFreightRatePayload) =>
    api.post<ReferenceFreightRateDto>("/admin/reference-freight-rates", payload).then((r) => r.data),

  update: (id: string, payload: UpdateReferenceFreightRatePayload) =>
    api.patch<ReferenceFreightRateDto>(`/admin/reference-freight-rates/${id}`, payload).then((r) => r.data),

  deactivate: (id: string) =>
    api.post<ReferenceFreightRateDto>(`/admin/reference-freight-rates/${id}/deactivate`).then((r) => r.data),

  audits: (id: string) =>
    api.get<ReferenceFreightRateAuditDto[]>(`/admin/reference-freight-rates/${id}/audits`).then((r) => r.data),

  copyMonth: (payload?: CopyReferenceFreightMonthPayload) =>
    api.post<ReferenceFreightCopyMonthResultDto>("/admin/reference-freight-rates/copy-month", payload ?? {}).then((r) => r.data),

  importCsv: (csv: string) =>
    api.post<ReferenceFreightImportResultDto>("/admin/reference-freight-rates/import", { csv }).then((r) => r.data),
};

import { api } from "@/lib/api";
import type {
  DocumentCenterDetail,
  DocumentCenterPayload,
  DocumentCenterQuery,
  TradeDocumentsPanelPayload,
} from "@dmx/contracts/document-center";

function enc(id: string) {
  return encodeURIComponent(id);
}

export const documentCenterApi = {
  list: (params?: Partial<DocumentCenterQuery>) =>
    api.get<DocumentCenterPayload>("/documents", { params }).then((r) => r.data),

  detail: (id: string) =>
    api.get<DocumentCenterDetail>(`/documents/${enc(id)}`).then((r) => r.data),

  tradeDocuments: (tradeId: string) =>
    api.get<TradeDocumentsPanelPayload>(`/trades/${tradeId}/documents`).then((r) => r.data),

  upload: (form: FormData) =>
    api.post("/documents/upload", form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),

  approve: (id: string, reason?: string) =>
    api.post(`/documents/${enc(id)}/approve`, { reason }).then((r) => r.data),

  reject: (id: string, reason: string) =>
    api.post(`/documents/${enc(id)}/reject`, { reason }).then((r) => r.data),

  requestRevision: (id: string, reason: string) =>
    api.post(`/documents/${enc(id)}/request-revision`, { reason }).then((r) => r.data),

  downloadUrl: (id: string) => `/api/documents/${enc(id)}/download`,
};

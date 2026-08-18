import type {
  CommercialDocumentDto,
  CommercialDocumentListResponse,
  CommercialDocumentCategory,
} from "@dmx/contracts/commercial-document";
import type { CommercialDocumentUploadMeta } from "@dmx/contracts/commercial-document.zod";
import { api } from "@/lib/api";

export type CommercialDocumentFilters = {
  category?: string;
  source?: string;
  search?: string;
  uploadedFrom?: string;
  uploadedTo?: string;
  sort?: string;
  direction?: string;
  page?: number;
  pageSize?: number;
};

export const commercialDocumentApi = {
  list: (poId: string, params?: CommercialDocumentFilters) =>
    api
      .get<CommercialDocumentListResponse>(`/purchase-orders/${poId}/documents`, { params })
      .then((r) => r.data),

  get: (poId: string, documentId: string) =>
    api
      .get<CommercialDocumentDto>(
        `/purchase-orders/${poId}/documents/${encodeURIComponent(documentId)}`,
      )
      .then((r) => r.data),

  upload: (
    poId: string,
    file: File,
    meta: CommercialDocumentUploadMeta,
    onProgress?: (pct: number) => void,
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", meta.category);
    if (meta.title) fd.append("title", meta.title);
    if (meta.description) fd.append("description", meta.description);
    if (meta.referenceNumber) fd.append("referenceNumber", meta.referenceNumber);
    if (meta.documentDate) fd.append("documentDate", meta.documentDate);
    return api
      .post<CommercialDocumentDto>(`/purchase-orders/${poId}/documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (!onProgress || !evt.total) return;
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      })
      .then((r) => r.data);
  },

  replace: (
    poId: string,
    documentId: string,
    file: File,
    meta?: { category?: CommercialDocumentCategory; title?: string | null },
    onProgress?: (pct: number) => void,
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    if (meta?.category) fd.append("category", meta.category);
    if (meta?.title) fd.append("title", meta.title);
    return api
      .post<CommercialDocumentDto>(
        `/purchase-orders/${poId}/documents/${encodeURIComponent(documentId)}/replace`,
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (evt) => {
            if (!onProgress || !evt.total) return;
            onProgress(Math.round((evt.loaded / evt.total) * 100));
          },
        },
      )
      .then((r) => r.data);
  },

  remove: (poId: string, documentId: string) =>
    api
      .delete<{ ok: true }>(
        `/purchase-orders/${poId}/documents/${encodeURIComponent(documentId)}`,
      )
      .then((r) => r.data),
};

import { api } from "@/lib/api";
import type { TradeDocumentsSummary, TradeWorkspaceType } from "@dmx/contracts/trade-documents";

const base = (workspaceType: TradeWorkspaceType, workspaceId: string) =>
  `/trade-documents/${workspaceType}/${workspaceId}`;

export const tradeDocumentsApi = {
  summary: (workspaceType: TradeWorkspaceType, workspaceId: string) =>
    api.get<TradeDocumentsSummary>(base(workspaceType, workspaceId)).then((r) => r.data),

  action: (
    workspaceType: TradeWorkspaceType,
    workspaceId: string,
    action: string,
    payload: Record<string, unknown> = {},
  ) =>
    api.post<TradeDocumentsSummary>(`${base(workspaceType, workspaceId)}/actions/${action}`, {
      payload,
    }).then((r) => r.data),

  upload: async (
    workspaceType: TradeWorkspaceType,
    workspaceId: string,
    documentType: string,
    file: File,
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("documentType", documentType);
    fd.append("ownerRole", "SUPPLIER");
    const res = await api.post<TradeDocumentsSummary>(
      `${base(workspaceType, workspaceId)}/upload`,
      fd,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },

  downloadUrl: (workspaceType: TradeWorkspaceType, workspaceId: string, documentId: string) =>
    `/api/trade-documents/${workspaceType}/${workspaceId}/documents/${documentId}/download`,
};

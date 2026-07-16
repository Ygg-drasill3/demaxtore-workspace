import { api } from "@/lib/api";
import type {
  CommWorkspaceType,
  WorkspaceConversation,
  MessageSearchResult,
} from "@dmx/contracts/workspace-communication";

const base = (type: CommWorkspaceType, id: string) =>
  `/workspace-communication/${type.toLowerCase()}/${id}`;

export const workspaceCommunicationApi = {
  get: (type: CommWorkspaceType, id: string) =>
    api.get<WorkspaceConversation>(base(type, id)).then((r) => r.data),

  search: (type: CommWorkspaceType, id: string, params: Record<string, string | boolean>) =>
    api.get<MessageSearchResult>(`${base(type, id)}/search`, { params }).then((r) => r.data),

  action: (type: CommWorkspaceType, id: string, path: string, body: unknown = {}) =>
    api.post<WorkspaceConversation>(`${base(type, id)}/actions/${path}`, body).then((r) => r.data),

  uploadAttachment: async (type: CommWorkspaceType, id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post<{ id: string; fileName: string }>(
      `${base(type, id)}/attachments`,
      fd,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  downloadUrl: (type: CommWorkspaceType, id: string, attachmentId: string) =>
    `/api/workspace-communication/${type.toLowerCase()}/${id}/attachments/${attachmentId}/download`,
};

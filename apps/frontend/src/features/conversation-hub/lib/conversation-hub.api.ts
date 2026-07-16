import { api } from "@/lib/api";
import type {
  ConversationHub,
  ConversationSearchResult,
  TimelineItemType,
} from "@dmx/contracts/conversation-hub";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";

const base = (type: CommWorkspaceType, id: string) =>
  `/workspaces/${type.toLowerCase()}/${id}/conversation`;

export const conversationHubApi = {
  get: (type: CommWorkspaceType, id: string) =>
    api.get<ConversationHub>(base(type, id)).then((r) => r.data),

  search: (
    type: CommWorkspaceType,
    id: string,
    params: {
      q?: string;
      participantUserId?: string;
      dateFrom?: string;
      dateTo?: string;
      fileName?: string;
      itemType?: TimelineItemType;
      limit?: number;
      offset?: number;
    },
  ) =>
    api.get<ConversationSearchResult>(`${base(type, id)}/search`, { params }).then((r) => r.data),

  createItem: (
    type: CommWorkspaceType,
    id: string,
    body: {
      body: string;
      itemType: TimelineItemType;
      visibility?: string;
      parentMessageId?: string;
      attachmentIds?: string[];
      mentionedUserIds?: string[];
      clientMessageId?: string;
    },
    options?: { idempotencyKey?: string },
  ) =>
    api
      .post<ConversationHub>(`${base(type, id)}/timeline`, body, {
        headers: options?.idempotencyKey
          ? { "Idempotency-Key": options.idempotencyKey }
          : undefined,
      })
      .then((r) => r.data),

  markDelivered: (type: CommWorkspaceType, id: string, messageId: string) =>
    api.post(`${base(type, id)}/timeline/delivered`, { messageId }),

  markRead: (type: CommWorkspaceType, id: string, messageId: string) =>
    api.post(`${base(type, id)}/timeline/read`, { messageId }),

  setPinned: (type: CommWorkspaceType, id: string, messageId: string, pinned: boolean) =>
    api.post<ConversationHub>(`${base(type, id)}/timeline/${messageId}/pin`, { pinned }).then((r) => r.data),

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
};

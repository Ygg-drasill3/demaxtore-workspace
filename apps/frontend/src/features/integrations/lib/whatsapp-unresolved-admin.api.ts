import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type UnresolvedWebhookEvent = {
  id: string;
  buyerId: string | null;
  buyerEmail: string | null;
  buyerDisplayName: string | null;
  connectionStatus: string | null;
  phoneNumberIdMasked: string | null;
  supplierPhoneMasked: string | null;
  messageType: string | null;
  reason: string;
  candidateConversationIds: string[];
  payloadSummary: Record<string, unknown>;
  metaMessageIdMasked: string | null;
  receivedAt: string;
};

export const whatsappUnresolvedAdminApi = {
  list: () =>
    api.get<{ events: UnresolvedWebhookEvent[] }>("/admin/whatsapp-unresolved-events").then((r) => r.data.events),

  resolve: (eventId: string, workspaceConversationId: string) =>
    api
      .post(`/admin/whatsapp-unresolved-events/${eventId}/resolve`, { workspaceConversationId })
      .then((r) => r.data),

  reprocess: (eventId: string) =>
    api.post(`/admin/whatsapp-unresolved-events/${eventId}/reprocess`).then((r) => r.data),

  ignore: (eventId: string) =>
    api.post(`/admin/whatsapp-unresolved-events/${eventId}/ignore`).then((r) => r.data),

  audit: (eventId: string) =>
    api.get<{ audit: Array<{ id: string; action: string; createdAt: string; detail: unknown }> }>(
      `/admin/whatsapp-unresolved-events/${eventId}/audit`,
    ).then((r) => r.data.audit),
};

export function useUnresolvedWebhookEvents() {
  return useQuery({ queryKey: ["admin", "whatsapp-unresolved-events"], queryFn: whatsappUnresolvedAdminApi.list });
}

export function useResolveUnresolvedEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, workspaceConversationId }: { eventId: string; workspaceConversationId: string }) =>
      whatsappUnresolvedAdminApi.resolve(eventId, workspaceConversationId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "whatsapp-unresolved-events"] }),
  });
}

export function useIgnoreUnresolvedEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => whatsappUnresolvedAdminApi.ignore(eventId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "whatsapp-unresolved-events"] }),
  });
}

export function useReprocessUnresolvedEvent() {
  return useMutation({ mutationFn: (eventId: string) => whatsappUnresolvedAdminApi.reprocess(eventId) });
}

export function useUnresolvedEventAudit(eventId: string | null) {
  return useQuery({
    queryKey: ["admin", "whatsapp-unresolved-audit", eventId],
    queryFn: () => whatsappUnresolvedAdminApi.audit(eventId!),
    enabled: Boolean(eventId),
  });
}

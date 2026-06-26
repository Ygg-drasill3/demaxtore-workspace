// apps/frontend/src/features/rfq/hooks/index.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useCallback } from "react";
import { rfqApi } from "../lib/rfq.api";
import { useWorkspaceSocket } from "@/lib/socket";
import { toast } from "@/store/toast.store";
import { STALE } from "@/lib/queryClient";
import { supplierActivityKeys } from "./useSupplierActivity";
import type { RfqAction } from "@dmx/contracts/rfq.fsm";
import type { ListRfqQuery } from "@dmx/contracts/rfq.zod";

const k = {
  list:        (q: Partial<ListRfqQuery>) => ["rfq", "list", q] as const,
  one:         (id: string) => ["rfq", id] as const,
  timeline:    (id: string) => ["rfq", id, "timeline"] as const,
  clarifs:     (id: string) => ["rfq", id, "clarifications"] as const,
  nextActions: (id: string) => ["rfq", id, "next-actions"] as const,
};

export function useRfqList(q: Partial<ListRfqQuery>) {
  return useQuery({
    queryKey: k.list(q),
    queryFn: () => rfqApi.list(q),
    placeholderData: keepPreviousData,
    staleTime: STALE.workspace,
  });
}

export function useRfqWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: id ? k.one(id) : ["rfq","empty"],
    queryFn: () => rfqApi.get(id!),
    enabled: !!id,
    staleTime: STALE.workspace,
  });
}

export function useRfqTimeline(id: string | undefined, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: id ? k.timeline(id) : ["rfq","empty"],
    queryFn: () => rfqApi.timeline(id!),
    enabled: !!id && (opts?.enabled ?? true),
    staleTime: STALE.workspace,
  });
}

export function useRfqClarifications(id: string | undefined) {
  return useQuery({ queryKey: id ? k.clarifs(id) : ["rfq","empty"], queryFn: () => rfqApi.clarifs(id!), enabled: !!id });
}

export function useRfqNextActions(id: string | undefined) {
  return useQuery({ queryKey: id ? k.nextActions(id) : ["rfq","empty"], queryFn: () => rfqApi.nextActions(id!), enabled: !!id });
}

export function useApplyRfqAction(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { action: RfqAction; payload?: any; reason?: string; idempotencyKey?: string }) =>
      rfqApi.action(workspaceId, args.action, { payload: args.payload, reason: args.reason, idempotencyKey: args.idempotencyKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rfq", workspaceId] });
      qc.invalidateQueries({ queryKey: ["rfq", "list"] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg ?? "Action failed — check your input and try again");
    },
  });
}

export function usePostClarification(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      message: string;
      replyToMessageId?: string;
      visibility?: "ALL" | "ADMIN_ONLY";
      mentionedUserIds?: string[];
      attachmentIds?: string[];
    }) => rfqApi.postClarification(workspaceId, args),
    onSuccess: () => qc.invalidateQueries({ queryKey: k.clarifs(workspaceId) }),
  });
}

/** Bind realtime invalidations for a single RFQ workspace. */
export function useRfqRealtime(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: ["rfq", workspaceId!] }),
    [qc, workspaceId],
  );

  const invalidateQuotations = useCallback(() => {
    if (!workspaceId) return;
    void qc.invalidateQueries({ queryKey: ["rfq", workspaceId, "quotations"] });
    void qc.invalidateQueries({ queryKey: supplierActivityKeys.summary(workspaceId) });
    void qc.invalidateQueries({ queryKey: supplierActivityKeys.detail(workspaceId) });
  }, [qc, workspaceId]);

  useWorkspaceSocket(workspaceId, {
    "rfq.state.changed":         () => { invalidate(); invalidateQuotations(); },
    "rfq.timeline.appended":     (payload: { event?: { eventType?: string } }) => {
      qc.invalidateQueries({ queryKey: workspaceId ? k.timeline(workspaceId) : [] });
      const eventType = payload?.event?.eventType ?? "";
      if (eventType.startsWith("quotation.")) invalidateQuotations();
    },
    "timeline:new":              (payload: { event?: { eventType?: string } }) => {
      qc.invalidateQueries({ queryKey: workspaceId ? k.timeline(workspaceId) : [] });
      const eventType = payload?.event?.eventType ?? "";
      if (eventType.startsWith("quotation.")) invalidateQuotations();
    },
    "workspace:update":          () => { invalidate(); invalidateQuotations(); },
    "rfq.clarification.posted":  () => qc.invalidateQueries({ queryKey: workspaceId ? k.clarifs(workspaceId) : [] }),
    "rfq.participants.changed":  invalidate,
  });
}

export { k as rfqQueryKeys };

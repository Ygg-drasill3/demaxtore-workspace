// apps/frontend/src/features/rfq/hooks/useSupplierActivity.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SupplierActivityDetail, SupplierActivitySummary } from "@dmx/contracts/supplier-activity";
import { STALE } from "@/lib/queryClient";

export const supplierActivityKeys = {
  summary: (id: string) => ["rfq", id, "supplier-activity", "summary"] as const,
  detail:  (id: string) => ["rfq", id, "supplier-activity", "detail"] as const,
};

const KEY = supplierActivityKeys;

export function useSupplierActivitySummary(workspaceId: string | undefined) {
  const enabled = !!workspaceId;

  return useQuery({
    queryKey: workspaceId ? KEY.summary(workspaceId) : ["empty"],
    queryFn: () => api.get<SupplierActivitySummary>(`/rfq/${workspaceId}/supplier-activity`).then(r => r.data),
    enabled,
    staleTime: STALE.workspace,
  });
}

export function useSupplierActivityDetail(workspaceId: string | undefined, opts: { enabled: boolean }) {
  return useQuery({
    queryKey: workspaceId ? KEY.detail(workspaceId) : ["empty"],
    queryFn: () => api.get<SupplierActivityDetail>(`/rfq/${workspaceId}/supplier-activity/detail`).then(r => r.data),
    enabled: opts.enabled && !!workspaceId,
    staleTime: STALE.workspace,
  });
}

export function useNudgeSupplier(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (supplierId: string) =>
      api.post(`/rfq/${workspaceId}/supplier-activity/${supplierId}/nudge`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY.detail(workspaceId)  });
      qc.invalidateQueries({ queryKey: KEY.summary(workspaceId) });
    },
  });
}

export function useNudgeSilentSuppliers(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post(`/rfq/${workspaceId}/supplier-activity/nudge-silent`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY.detail(workspaceId)  });
      qc.invalidateQueries({ queryKey: KEY.summary(workspaceId) });
    },
  });
}

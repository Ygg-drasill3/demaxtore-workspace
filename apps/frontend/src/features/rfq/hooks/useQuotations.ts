// apps/frontend/src/features/rfq/hooks/useQuotations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";
import type { RfqState } from "@dmx/contracts/rfq.fsm";
import { normalizeQuotationList } from "../lib/quotations.normalize";
import { STALE } from "@/lib/queryClient";

const KEY = (id: string) => ["rfq", id, "quotations"] as const;

export function useQuotations(workspaceId: string | undefined, rfqState?: RfqState) {
  const enabled = !!workspaceId;
  const pollWhileOpen = rfqState === "RFQ_OPEN";

  return useQuery({
    queryKey: workspaceId ? KEY(workspaceId) : ["empty"],
    queryFn: async () => {
      const r = await api.get(`/rfq/${workspaceId}/quotations`);
      return normalizeQuotationList(r.data) as QuotationRowDTO[];
    },
    enabled,
    staleTime: pollWhileOpen ? 5_000 : STALE.workspace,
    refetchInterval: pollWhileOpen ? 5_000 : false,
  });
}

export function useSelectQuotation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { quotationId: string; supplierUserId: string; rationale?: string }) =>
      api.post(`/rfq/${workspaceId}/actions/select-supplier`, {
        payload: {
          quotationId: args.quotationId,
          supplierUserId: args.supplierUserId,
          rationale: args.rationale ?? "Selected from quotation comparison",
        },
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(workspaceId) });
      qc.invalidateQueries({ queryKey: ["rfq", workspaceId] });
    },
  });
}

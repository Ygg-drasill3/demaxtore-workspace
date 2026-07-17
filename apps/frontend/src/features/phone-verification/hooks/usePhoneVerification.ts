import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { phoneVerificationApi } from "../lib/phone-verification.api";

export function usePhoneVerificationMe() {
  return useQuery({
    queryKey: ["phone-verification", "me"],
    queryFn: () => phoneVerificationApi.me(),
    staleTime: 30_000,
  });
}

export function useSubmitPhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: phoneVerificationApi.submit,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["phone-verification"] });
    },
  });
}

export function usePhoneVerificationQueue(status = "PENDING") {
  return useQuery({
    queryKey: ["phone-verification", "queue", status],
    queryFn: () => phoneVerificationApi.queue({ status }),
  });
}

export function usePendingPhoneCount() {
  return useQuery({
    queryKey: ["phone-verification", "pending-count"],
    queryFn: () => phoneVerificationApi.pendingCount(),
    refetchInterval: 60_000,
  });
}

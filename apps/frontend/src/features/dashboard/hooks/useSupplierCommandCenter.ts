import { useQuery } from "@tanstack/react-query";
import { fetchSupplierCommandCenter } from "../lib/supplier-command-center";
import { useOnboardingProgress } from "@/features/onboarding/hooks";
import { STALE } from "@/lib/queryClient";

export function useSupplierCommandCenter() {
  const { data: onboarding } = useOnboardingProgress();

  return useQuery({
    queryKey: ["supplier", "command-center", onboarding?.completionPercent, onboarding?.firstTradeCompleted],
    queryFn: () => fetchSupplierCommandCenter(onboarding ?? null),
    staleTime: STALE.workspace,
    refetchInterval: 60_000,
  });
}

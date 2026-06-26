import { useQuery } from "@tanstack/react-query";
import { fetchBuyerCommandCenter } from "../lib/buyer-command-center";
import { useOnboardingProgress } from "@/features/onboarding/hooks";
import { STALE } from "@/lib/queryClient";

export function useBuyerCommandCenter() {
  const { data: onboarding } = useOnboardingProgress();

  return useQuery({
    queryKey: ["buyer", "command-center", onboarding?.completionPercent, onboarding?.firstTradeCompleted],
    queryFn: () => fetchBuyerCommandCenter(onboarding ?? null),
    staleTime: STALE.workspace,
    refetchInterval: 60_000,
  });
}

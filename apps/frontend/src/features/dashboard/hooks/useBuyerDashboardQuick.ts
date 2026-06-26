import { useQuery } from "@tanstack/react-query";
import { fetchBuyerDashboardQuick } from "../lib/buyer-command-center";
import { useOnboardingProgress } from "@/features/onboarding/hooks";
import { STALE } from "@/lib/queryClient";

/** Fast path — KPI cards only (<2s target). */
export function useBuyerDashboardQuick() {
  const { data: onboarding } = useOnboardingProgress();

  return useQuery({
    queryKey: ["buyer", "dashboard-quick", onboarding?.completionPercent, onboarding?.firstTradeCompleted],
    queryFn: () => fetchBuyerDashboardQuick(onboarding ?? null),
    staleTime: STALE.workspace,
    refetchInterval: 60_000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type PaymentCapabilities = {
  onlineCollectionEnabled: boolean;
  paymentIntentApiEnabled: boolean;
  provider: string | null;
  manualMilestoneTracking: boolean;
  message: string | null;
};

export const ONLINE_PAYMENTS_DISABLED_FALLBACK =
  "Online payment collection is not currently enabled. Payment milestones can still be recorded manually by authorized users.";

export function usePaymentCapabilities() {
  return useQuery({
    queryKey: ["payment-capabilities"],
    queryFn: () => api.get<PaymentCapabilities>("/payments/capabilities").then((r) => r.data),
    staleTime: 60_000,
  });
}

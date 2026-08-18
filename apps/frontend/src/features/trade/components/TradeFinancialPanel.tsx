import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { CreatePaymentIntentPayload } from "@dmx/contracts/payments";
import type { PaymentMilestoneKind, PaymentPlanDto } from "@dmx/contracts/payment-milestones";
import { OnlinePaymentDisabledNotice } from "@/features/payments/components/OnlinePaymentDisabledNotice";
import { usePaymentCapabilities } from "@/features/payments/hooks/usePaymentCapabilities";
import { useAuth } from "@/store/auth.store";

export { usePaymentCapabilities };
export type { PaymentCapabilities } from "@/features/payments/hooks/usePaymentCapabilities";

const STAFF_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "SALES_CONTROL"]);

export function usePaymentPlan(orderId: string | undefined) {
  return useQuery({
    queryKey: ["payment-plan", orderId],
    queryFn: () => api.get<PaymentPlanDto>(`/payments/orders/${orderId}/plan`).then((r) => r.data),
    enabled: !!orderId,
    retry: 1,
  });
}

export function useCreatePaymentIntent(orderId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePaymentIntentPayload) =>
      api.post(`/payments/orders/${orderId}/intents`, payload).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payment-plan", orderId] });
    },
  });
}

export function useManualSatisfyMilestone(orderId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kind: PaymentMilestoneKind) =>
      api
        .post<PaymentPlanDto>(`/payments/orders/${orderId}/milestones/satisfy`, { kind })
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payment-plan", orderId] });
      void qc.invalidateQueries({ queryKey: ["order", orderId] });
    },
  });
}

export function TradeFinancialPanel({ orderId }: { orderId: string }) {
  const user = useAuth((s) => s.user);
  const { data: caps } = usePaymentCapabilities();
  const { data, isLoading, isError, refetch } = usePaymentPlan(orderId);
  const createIntent = useCreatePaymentIntent(orderId);
  const manualSatisfy = useManualSatisfyMilestone(orderId);
  const canRecordManually =
    !!user?.role && STAFF_ROLES.has(user.role) && caps?.manualMilestoneTracking === true;

  if (isLoading) {
    return <p className="text-sm text-zinc-500" data-testid="trade-financial-loading">Loading payment milestones…</p>;
  }

  if (isError) {
    return (
      <div data-testid="trade-financial-error" className="space-y-2">
        <p className="text-sm text-red-600">Could not load payment plan.</p>
        <Button size="sm" variant="secondary" onClick={() => void refetch()}>Retry</Button>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-zinc-500">No payment plan.</p>;
  }

  const pendingMilestone = data.milestones.find((m) => m.status !== "SATISFIED");
  const intentEnabled = caps?.paymentIntentApiEnabled === true;
  const milestoneAmount = pendingMilestone?.amount != null ? Number(pendingMilestone.amount) : null;

  return (
    <div data-testid="trade-financial-panel" className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">Status:</span>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">{data.financialStatus}</span>
      </div>
      <ul className="space-y-2">
        {data.milestones.map((m) => (
          <li key={m.id} className="flex justify-between items-center gap-2 text-sm border-b border-zinc-50 pb-2">
            <span>{m.kind.replace(/_/g, " ")}</span>
            <span className="flex items-center gap-2">
              <span className={m.status === "SATISFIED" ? "text-emerald-600" : "text-amber-600"}>{m.status}</span>
              {canRecordManually && m.status !== "SATISFIED" && (m.kind === "DEPOSIT_PAID" || m.kind === "BALANCE_PAID") && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  data-testid={`record-milestone-${m.kind}`}
                  loading={manualSatisfy.isPending && manualSatisfy.variables === m.kind}
                  onClick={() => void manualSatisfy.mutate(m.kind)}
                >
                  Record paid
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {data.milestones.some((m) => m.kind === "DEPOSIT_PAID" && m.status !== "SATISFIED") && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" data-testid="deposit-gate-notice">
          Production cannot start until this deposit is recorded. DeMaxtore Operations confirms payment here. Online checkout is not required for the pilot.
        </p>
      )}
      {data.holds.length > 0 && (
        <p className="text-xs text-amber-700">Active holds: {data.holds.map((h) => h.reason).join(", ")}</p>
      )}
      {manualSatisfy.isError && (
        <p className="text-xs text-red-600" data-testid="record-milestone-error">
          Could not record milestone. Retry or check permissions.
        </p>
      )}
      <OnlinePaymentDisabledNotice />
      {pendingMilestone && intentEnabled && (
        <div className="border-t border-paper-200 pt-3 space-y-2">
          <p className="text-xs text-zinc-500">Create a payment intent for the next milestone.</p>
          {milestoneAmount == null || milestoneAmount <= 0 ? (
            <p className="text-xs text-amber-700" data-testid="payment-milestone-amount-missing">
              Set a milestone amount before creating a payment intent.
            </p>
          ) : (
            <Button
              data-testid="create-payment-intent"
              size="sm"
              loading={createIntent.isPending}
              disabled={createIntent.isSuccess}
              onClick={() =>
                void createIntent.mutate({
                  amount: milestoneAmount,
                  currency: (pendingMilestone.currency as "USD" | "EUR" | "GBP") ?? "USD",
                  description: `Milestone: ${pendingMilestone.kind}`,
                })
              }
            >
              {createIntent.isSuccess ? "Intent created" : "Create payment intent"}
            </Button>
          )}
          {createIntent.isError && (
            <p className="text-xs text-red-600">Failed to create intent. <button type="button" className="underline" onClick={() => createIntent.reset()}>Retry</button></p>
          )}
        </div>
      )}
    </div>
  );
}

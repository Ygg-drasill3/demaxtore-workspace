import {
  ONLINE_PAYMENTS_DISABLED_FALLBACK,
  usePaymentCapabilities,
} from "../hooks/usePaymentCapabilities";

type Props = {
  className?: string;
};

/**
 * Shown wherever an online payment action could be expected but collection is disabled.
 * Derives state from GET /payments/capabilities — not hard-coded env assumptions.
 */
export function OnlinePaymentDisabledNotice({ className }: Props) {
  const { data: caps, isError } = usePaymentCapabilities();

  if (!isError && caps?.onlineCollectionEnabled !== false) {
    return null;
  }

  const message = caps?.message ?? ONLINE_PAYMENTS_DISABLED_FALLBACK;

  return (
    <p
      className={
        className
        ?? "text-sm text-zinc-600 border border-paper-200 rounded-lg p-3 bg-paper-50"
      }
      data-testid="online-payments-disabled-notice"
    >
      {message}
    </p>
  );
}

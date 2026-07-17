import { Link } from "react-router-dom";
import { Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { phoneVerificationApi } from "@/features/phone-verification/lib/phone-verification.api";

export function PendingPhoneVerificationsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["phone-verification", "pending-count"],
    queryFn: () => phoneVerificationApi.pendingCount(),
    refetchInterval: 60_000,
  });

  const count = data?.count ?? 0;
  if (!isLoading && count === 0) return null;

  return (
    <section
      className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm"
      data-testid="pending-phone-verifications-widget"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Pending Phone Verifications</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isLoading ? "Loading…" : `${count} buyer/supplier number${count === 1 ? "" : "s"} awaiting review`}
            </p>
          </div>
        </div>
        <Link
          to="/admin/phone-verifications"
          className="text-xs font-medium text-amber-900 hover:underline shrink-0"
          data-testid="pending-phone-verifications-open"
        >
          Review queue
        </Link>
      </div>
    </section>
  );
}

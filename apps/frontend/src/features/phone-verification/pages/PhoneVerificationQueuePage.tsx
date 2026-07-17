import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Phone, X } from "lucide-react";
import { usePhoneVerificationQueue } from "@/features/phone-verification/hooks/usePhoneVerification";
import { phoneVerificationApi } from "@/features/phone-verification/lib/phone-verification.api";

export default function PhoneVerificationQueuePage() {
  const [status, setStatus] = useState("PENDING");
  const { data, refetch, isLoading } = usePhoneVerificationQueue(status);
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("request");

  const review = async (id: string, action: "approve" | "reject") => {
    if (action === "approve") await phoneVerificationApi.approve(id);
    else await phoneVerificationApi.reject(id);
    void refetch();
  };

  return (
    <div className="max-w-5xl mx-auto p-6" data-testid="phone-verification-queue">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Phone Verification Queue</h1>
      <p className="text-sm text-zinc-500 mt-1">Review buyer and supplier phone numbers before messaging unlocks.</p>

      <div className="flex gap-2 mt-6">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              status === s ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">Loading…</td>
              </tr>
            )}
            {data?.items.map((row) => (
              <tr
                key={row.id}
                className={`border-t border-zinc-100 ${row.id === highlight ? "bg-amber-50/50" : ""}`}
                data-testid={`phone-request-${row.id}`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{row.user.displayName}</div>
                  <div className="text-xs text-zinc-500">{row.user.email}</div>
                </td>
                <td className="px-4 py-3 text-zinc-600">{row.user.organisation ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.phone}</td>
                <td className="px-4 py-3">{row.user.role}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(row.submittedAt).toLocaleString()}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">
                  {row.status === "PENDING" && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        data-testid={`approve-phone-${row.id}`}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => void review(row.id, "approve")}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        data-testid={`reject-phone-${row.id}`}
                        className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
                        onClick={() => void review(row.id, "reject")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && (data?.items.length ?? 0) === 0 && (
          <div className="py-12 text-center text-zinc-500 flex flex-col items-center">
            <Phone className="h-8 w-8 mb-2 opacity-30" />
            No requests
          </div>
        )}
      </div>
    </div>
  );
}

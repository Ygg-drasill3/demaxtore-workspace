import { Phone, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { getApiErrorMessage } from "@/lib/api-errors";
import { toast } from "@/store/toast.store";
import { usePhoneVerificationMe, useSubmitPhone } from "../hooks/usePhoneVerification";

export function PhoneVerificationGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError, error, refetch } = usePhoneVerificationMe();
  const submit = useSubmitPhone();
  const [phone, setPhone] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-zinc-500" data-testid="phone-gate-loading">
        Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" data-testid="phone-gate-error">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm text-red-600">{getApiErrorMessage(error, "Could not load phone verification status.")}</p>
          <button
            type="button"
            className="text-sm font-medium text-zinc-900 underline"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (data?.canMessage) return <>{children}</>;

  const pending =
    data?.phoneVerificationStatus === "PENDING_PHONE_VERIFICATION" ||
    data?.pendingRequest?.status === "PENDING" ||
    submit.isSuccess;
  const rejected = data?.phoneVerificationStatus === "PHONE_REJECTED";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmed = phone.trim();
    if (!trimmed) {
      setFormError("Enter your phone number (e.g. +905551234567)");
      return;
    }
    try {
      await submit.mutateAsync({ phone: trimmed });
      setOpenForm(false);
      await refetch();
      toast.success("Phone submitted", "An admin will review your number shortly.");
    } catch (err) {
      const message = getApiErrorMessage(err, "Could not submit phone number. Please try again.");
      setFormError(message);
      toast.error("Verification failed", message);
    }
  };

  return (
    <div
      className="flex-1 flex items-center justify-center p-8 bg-gradient-to-b from-white to-zinc-50"
      data-testid="phone-verification-gate"
    >
      <div className="max-w-md w-full rounded-2xl border border-zinc-200/80 bg-white shadow-xl shadow-zinc-200/40 p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white">
          <Phone className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Phone Number Required</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          To start messaging, please verify your phone number first.
        </p>

        {pending && (
          <div className="mt-6 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-900" data-testid="phone-pending-banner">
            <ShieldCheck className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            Verification pending admin approval
            {(data?.phoneNumber || phone) && (
              <div className="mt-1 font-medium">{data?.phoneNumber ?? phone}</div>
            )}
          </div>
        )}

        {rejected && (
          <div className="mt-6 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-800" data-testid="phone-rejected-banner">
            Previous verification was rejected. Submit a new number.
          </div>
        )}

        {!pending && (
          <>
            {!openForm ? (
              <button
                type="button"
                data-testid="add-phone-button"
                onClick={() => {
                  setFormError(null);
                  setOpenForm(true);
                }}
                className="mt-8 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                Add Phone Number
              </button>
            ) : (
              <form className="mt-6 space-y-3 text-left" onSubmit={(e) => void handleSubmit(e)}>
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Phone (E.164)
                </label>
                <input
                  data-testid="phone-input"
                  type="tel"
                  autoComplete="tel"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="+905551234567"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (formError) setFormError(null);
                  }}
                />
                {formError && (
                  <p className="text-sm text-red-600" data-testid="phone-submit-error" role="alert">
                    {formError}
                  </p>
                )}
                <button
                  type="submit"
                  data-testid="submit-phone-button"
                  disabled={submit.isPending || !phone.trim()}
                  className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {submit.isPending ? "Submitting…" : "Submit for verification"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

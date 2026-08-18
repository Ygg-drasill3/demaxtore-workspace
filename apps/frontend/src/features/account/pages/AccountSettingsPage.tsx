import { useEffect, useState } from "react";
import { Building2, Mail, MessageCircle, Phone, ShieldCheck, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/store/auth.store";
import { Field, Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api-errors";
import { toast } from "@/store/toast.store";
import { accountApi } from "../lib/account.api";
import {
  usePhoneVerificationMe,
  useSubmitPhone,
} from "@/features/phone-verification/hooks/usePhoneVerification";

function phoneStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "PHONE_VERIFIED":
      return { text: "Verified", className: "bg-emerald-50 text-emerald-800 border-emerald-100" };
    case "PENDING_PHONE_VERIFICATION":
      return { text: "Pending approval", className: "bg-amber-50 text-amber-900 border-amber-100" };
    case "PHONE_REJECTED":
      return { text: "Rejected", className: "bg-red-50 text-red-800 border-red-100" };
    default:
      return { text: "Not verified", className: "bg-zinc-100 text-zinc-600 border-zinc-200" };
  }
}

export default function AccountSettingsPage() {
  const user = useAuth((s) => s.user);
  const setSession = useAuth((s) => s.setSession);
  const accessToken = useAuth((s) => s.accessToken);
  const phoneMe = usePhoneVerificationMe();
  const submitPhone = useSubmitPhone();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user?.displayName]);

  useEffect(() => {
    if (phoneMe.data?.phoneNumber && !phone) {
      setPhone(phoneMe.data.phoneNumber.startsWith("+") ? phoneMe.data.phoneNumber : `+${phoneMe.data.phoneNumber}`);
    }
  }, [phoneMe.data?.phoneNumber, phone]);

  const saveProfile = useMutation({
    mutationFn: () => accountApi.updateProfile({ displayName: displayName.trim() }),
    onSuccess: async (updated) => {
      if (accessToken) setSession(updated, accessToken);
      setProfileError(null);
      toast.success("Profile updated", "Your contact name has been saved.");
    },
    onError: (err) => {
      const message = getApiErrorMessage(err, "Could not update profile.");
      setProfileError(message);
      toast.error("Update failed", message);
    },
  });

  const phoneStatus = phoneStatusLabel(phoneMe.data?.phoneVerificationStatus);
  const canEditPhone =
    phoneMe.data?.phoneVerificationStatus !== "PENDING_PHONE_VERIFICATION";

  const onSubmitPhone = async () => {
    setPhoneError(null);
    const trimmed = phone.trim();
    if (!trimmed) {
      setPhoneError("Enter your phone number (e.g. +905551234567)");
      return;
    }
    try {
      await submitPhone.mutateAsync({ phone: trimmed });
      await phoneMe.refetch();
      toast.success("Phone submitted", "An admin will review your number shortly.");
    } catch (err) {
      const message = getApiErrorMessage(err, "Could not submit phone number.");
      setPhoneError(message);
      toast.error("Phone update failed", message);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in" data-testid="account-settings-page" data-guide="account-settings">
      <header className="mb-8">
        <span className="dmx-eyebrow text-zinc-500">Account</span>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-900 mt-1">
          Profile &amp; contact
        </h1>
        <p className="text-sm text-zinc-500 mt-2">
          Update your workspace identity and phone number used for messaging and WhatsApp.
        </p>
      </header>

      <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm" data-guide="account-profile">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-zinc-900 text-white grid place-items-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Profile</h2>
              <p className="text-xs text-zinc-500">How you appear in conversations and workspaces</p>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Contact name">
              <Input
                data-testid="account-display-name"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (profileError) setProfileError(null);
                }}
              />
            </Field>

            <Field label="Email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input className="pl-10 bg-zinc-50" value={user.email} readOnly disabled />
              </div>
            </Field>

            <Field label="Company">
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  className="pl-10 bg-zinc-50"
                  value={user.organisation ?? "—"}
                  readOnly
                  disabled
                  data-testid="account-organisation"
                />
              </div>
            </Field>

            {profileError && (
              <p className="text-sm text-red-600" data-testid="account-profile-error" role="alert">
                {profileError}
              </p>
            )}

            <button
              type="button"
              data-testid="account-save-profile"
              disabled={saveProfile.isPending || displayName.trim().length < 2}
              onClick={() => void saveProfile.mutate()}
              className="dmx-btn-primary text-sm disabled:opacity-60"
            >
              {saveProfile.isPending ? "Saving…" : "Save profile"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm" data-guide="account-phone">
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white grid place-items-center">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Phone number</h2>
                <p className="text-xs text-zinc-500">Required for messaging and WhatsApp bridge</p>
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${phoneStatus.className}`}
              data-testid="account-phone-status"
            >
              {phoneStatus.text}
            </span>
          </div>

          {phoneMe.data?.phoneVerificationStatus === "PENDING_PHONE_VERIFICATION" && (
            <div
              className="mb-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-900 flex items-start gap-2"
              data-testid="account-phone-pending"
            >
              <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Your number is awaiting admin approval. Messaging unlocks after verification.
              </span>
            </div>
          )}

          {phoneMe.data?.phoneVerificationStatus === "PHONE_REJECTED" && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-800">
              Previous verification was rejected. Submit a corrected number below.
            </div>
          )}

          <div className="space-y-4">
            <Field label="Phone (E.164)">
              <Input
                data-testid="account-phone-input"
                type="tel"
                autoComplete="tel"
                placeholder="+905551234567"
                value={phone}
                disabled={!canEditPhone || submitPhone.isPending}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError(null);
                }}
              />
            </Field>

            {phoneError && (
              <p className="text-sm text-red-600" data-testid="account-phone-error" role="alert">
                {phoneError}
              </p>
            )}

            {canEditPhone ? (
              <button
                type="button"
                data-testid="account-submit-phone"
                disabled={submitPhone.isPending || !phone.trim()}
                onClick={() => void onSubmitPhone()}
                className="dmx-btn-secondary text-sm disabled:opacity-60"
              >
                {submitPhone.isPending ? "Submitting…" : "Submit for verification"}
              </button>
            ) : (
              <p className="text-xs text-zinc-500">
                You cannot change your number while a verification request is pending.
              </p>
            )}
          </div>
        </section>

        <section className="dmx-card p-6" data-guide="account-security">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Integrations</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Connect external services to your buyer workspace.
              </p>
            </div>
          </div>

          <div className="mt-5 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
            <Link
              to="/account/integrations/whatsapp-business"
              className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-zinc-50"
              data-testid="account-whatsapp-integration-link"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">WhatsApp Business</p>
                  <p className="text-xs text-zinc-500">Send messages from your own business number</p>
                </div>
              </div>
              <span className="text-sm font-medium text-emerald-700">Manage</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

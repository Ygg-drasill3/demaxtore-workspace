// apps/frontend/src/features/auth/pages/ForgotPasswordPage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ForgotPasswordInput } from "@dmx/contracts/auth";
import { authApi, type ForgotPasswordResponse } from "../lib/auth.api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { CheckCircle2 } from "lucide-react";
import { useT } from "@/i18n/useT";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

export default function ForgotPasswordPage() {
  const { t } = useT();
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(ForgotPasswordInput),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      const data = (await authApi.forgotPassword(v)) as ForgotPasswordResponse;
      if (data.resetUrl) setResetUrl(data.resetUrl);
    } catch {
      /* generic success — no email enumeration */
    }
    setSent(true);
  });

  if (sent) {
    return (
      <div data-testid="forgot-success" className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <LanguageSwitcher />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("forgot.successTitle")}</h1>
          <p className="text-sm text-zinc-500 mt-1.5">{t("forgot.successBody")}</p>
        </div>
        {resetUrl && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
            <p className="text-xs text-amber-900">{t("forgot.devLinkHint")}</p>
            <Link
              to={(() => {
                try {
                  const u = new URL(resetUrl);
                  return `${u.pathname}${u.search}`;
                } catch {
                  return "/reset-password";
                }
              })()}
              className="block text-xs font-medium text-accent-900 hover:underline break-all"
              data-testid="forgot-reset-link"
            >
              {resetUrl}
            </Link>
          </div>
        )}
        <Link to="/login" className="inline-block text-sm font-medium text-accent-900 hover:underline">
          {t("forgot.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate data-testid="forgot-form" className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="dmx-eyebrow text-zinc-500">{t("forgot.eyebrow")}</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">{t("forgot.title")}</h1>
          <p className="text-sm text-zinc-500 mt-1.5">{t("forgot.subtitle")}</p>
        </div>
        <LanguageSwitcher />
      </div>

      <Field label={t("login.email")} error={errors.email?.message}>
        <Input data-testid="forgot-email" type="email" autoComplete="email" {...register("email")} />
      </Field>

      <Button data-testid="forgot-submit" type="submit" size="lg" className="w-full" loading={isSubmitting}>
        {t("forgot.submit")}
      </Button>

      <Link to="/login" className="block text-center text-sm text-zinc-500 hover:text-ink-900">
        {t("forgot.backToSignIn")}
      </Link>
    </form>
  );
}

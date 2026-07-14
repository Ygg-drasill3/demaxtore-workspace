// apps/frontend/src/features/auth/pages/ResetPasswordPage.tsx
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ResetPasswordInput } from "@dmx/contracts/auth";
import { authApi } from "../lib/auth.api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { toast } from "@/store/toast.store";
import { useT } from "@/i18n/useT";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { CheckCircle2 } from "lucide-react";

const ResetPasswordForm = ResetPasswordInput.extend({
  confirmPassword: z.string().min(8).max(200),
});

type FormValues = z.infer<typeof ResetPasswordForm>;

export default function ResetPasswordPage() {
  const { t } = useT();
  const [params] = useSearchParams();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      ResetPasswordForm.refine((v) => v.newPassword === v.confirmPassword, {
        message: t("reset.passwordMismatch"),
        path: ["confirmPassword"],
      }),
    [t],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      token: params.get("token") ?? "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async ({ token, newPassword }) => {
    setServerError(null);
    try {
      await authApi.resetPassword({ token, newPassword });
      setDone(true);
      toast.success(t("reset.success"));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setServerError(err.response?.data?.error?.message ?? t("reset.failed"));
    }
  });

  if (done) {
    return (
      <div data-testid="reset-success" className="space-y-5 text-center">
        <div className="h-12 w-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 grid place-items-center">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("reset.successTitle")}</h1>
          <p className="text-sm text-zinc-500 mt-1.5">{t("reset.successBody")}</p>
        </div>
        <Link to="/login" className="inline-block text-sm font-medium text-accent-900 hover:underline">
          {t("reset.signInLink")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate data-testid="reset-form" className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="dmx-eyebrow text-zinc-500">{t("reset.eyebrow")}</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">{t("reset.title")}</h1>
          <p className="text-sm text-zinc-500 mt-1.5">{t("reset.subtitle")}</p>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="space-y-4">
        {!params.get("token") && (
          <Field label={t("reset.fieldToken")} error={form.formState.errors.token?.message}>
            <Input
              data-testid="reset-token"
              autoComplete="off"
              className="font-mono text-xs"
              {...form.register("token")}
            />
          </Field>
        )}

        <Field label={t("reset.fieldPassword")} error={form.formState.errors.newPassword?.message}>
          <PasswordInput
            data-testid="reset-password"
            autoComplete="new-password"
            {...form.register("newPassword")}
          />
        </Field>

        <Field label={t("reset.fieldConfirm")} error={form.formState.errors.confirmPassword?.message}>
          <PasswordInput
            data-testid="reset-confirm"
            autoComplete="new-password"
            {...form.register("confirmPassword")}
          />
        </Field>

        {serverError && (
          <div data-testid="reset-error" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {serverError}
          </div>
        )}
      </div>

      <Button data-testid="reset-submit" type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        {t("reset.submit")}
      </Button>

      <Link to="/login" className="block text-center text-sm text-zinc-500 hover:text-ink-900">
        {t("reset.backToSignIn")}
      </Link>
    </form>
  );
}

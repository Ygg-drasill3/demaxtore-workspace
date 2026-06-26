// apps/frontend/src/features/auth/pages/RegisterPage.tsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterInput, ROLE_DASHBOARD } from "@dmx/contracts/auth";
import { useAuth } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { toast } from "@/store/toast.store";
import { useT } from "@/i18n/useT";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

type FormValues = RegisterInput;

export default function RegisterPage() {
  const { t } = useT();
  const nav = useNavigate();
  const loc = useLocation();
  const { register: registerAccount } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(RegisterInput),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      organisationName: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      const user = await registerAccount(values);
      toast.success(t("register.success"), user.displayName);
      const redirectTo =
        (loc.state as { from?: { pathname: string } } | null)?.from?.pathname ??
        ROLE_DASHBOARD[user.role];
      nav(redirectTo, { replace: true });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setServerError(err.response?.data?.error?.message ?? t("register.failed"));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate data-testid="register-form" className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="dmx-eyebrow text-zinc-500">{t("register.eyebrow")}</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">{t("register.title")}</h1>
          <p className="text-sm text-zinc-500 mt-1.5">{t("register.subtitle")}</p>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("register.fieldName")} error={form.formState.errors.displayName?.message}>
            <Input data-testid="register-name" autoComplete="name" {...form.register("displayName")} />
          </Field>
          <Field label={t("register.fieldCompany")} error={form.formState.errors.organisationName?.message}>
            <Input data-testid="register-company" autoComplete="organization" {...form.register("organisationName")} />
          </Field>
        </div>

        <Field label={t("register.fieldEmail")} error={form.formState.errors.email?.message}>
          <Input data-testid="register-email" type="email" autoComplete="email" {...form.register("email")} />
        </Field>

        <Field label={t("register.fieldPassword")} error={form.formState.errors.password?.message}>
          <PasswordInput
            data-testid="register-password"
            autoComplete="new-password"
            {...form.register("password")}
          />
        </Field>

        {serverError && (
          <div data-testid="register-error" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {serverError}
          </div>
        )}
      </div>

      <Button
        data-testid="register-submit"
        type="submit"
        size="lg"
        className="w-full"
        loading={form.formState.isSubmitting}
      >
        {t("register.submit")}
      </Button>

      <p className="text-xs text-zinc-500 text-center">
        {t("register.hasAccount")}{" "}
        <Link to="/login" className="text-accent-900 hover:underline font-medium">
          {t("register.signInLink")}
        </Link>
      </p>
    </form>
  );
}

// apps/frontend/src/features/auth/pages/LoginPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginInput, ROLE_DASHBOARD } from "@dmx/contracts/auth";
import { useAuth } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { toast } from "@/store/toast.store";
import { useT } from "@/i18n/useT";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useAuthGate } from "@/hooks/useAuthGate";
import { AuthLoadingScreen } from "@/components/ui/AuthLoadingScreen";

type FormValues = { email: string; password: string };

export default function LoginPage() {
  const { t } = useT();
  const nav  = useNavigate();
  const loc  = useLocation();
  const { loading, timedOut, retry, isAuthenticated, user } = useAuthGate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const fromQuery = new URLSearchParams(loc.search).get("from");

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const redirectTo =
      (loc.state as { from?: { pathname: string } } | null)?.from?.pathname ||
      (fromQuery?.startsWith("/") ? fromQuery : null) ||
      ROLE_DASHBOARD[user.role];
    nav(redirectTo, { replace: true });
  }, [isAuthenticated, user, loc.state, fromQuery, nav]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(LoginInput),
    defaultValues: { email: "", password: "" },
  });

  const performLogin = async (email: string, password: string) => {
    setServerError(null);
    const loggedIn = await login(email, password);
    toast.success(t("common.welcomeBack"), loggedIn.displayName);
    const redirectTo =
      (loc.state as { from?: { pathname: string } } | null)?.from?.pathname ||
      (fromQuery?.startsWith("/") ? fromQuery : null) ||
      ROLE_DASHBOARD[loggedIn.role];
    nav(redirectTo, { replace: true });
  };

  const onSubmit = handleSubmit(async (v) => {
    try {
      await performLogin(v.email, v.password);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setServerError(err.response?.data?.error?.message ?? t("login.invalid"));
    }
  });

  if (loading) {
    return <AuthLoadingScreen timedOut={timedOut} onRetry={retry} />;
  }
  if (isAuthenticated && user) {
    return <AuthLoadingScreen />;
  }

  return (
    <form onSubmit={onSubmit} noValidate data-testid="login-form" className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="dmx-eyebrow text-zinc-500">{t("login.signIn")}</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">{t("login.title")}</h1>
          <p className="text-sm text-zinc-500 mt-1.5">{t("login.subtitle")}</p>
        </div>
        <LanguageSwitcher />
      </div>
      <p className="text-xs text-zinc-500">
        <Link to="/welcome" className="text-accent-900 hover:underline">← Product overview</Link>
      </p>

      <div className="space-y-4">
        <Field label={t("login.email")} error={errors.email?.message}>
          <Input data-testid="login-email" type="email" autoComplete="email" {...register("email")} />
        </Field>

        <Field
          label={t("login.password")}
          error={errors.password?.message}
          hint={<Link to="/forgot-password" className="text-accent-900 hover:underline">{t("login.forgot")}</Link>}
        >
          <PasswordInput data-testid="login-password" autoComplete="current-password" {...register("password")} />
        </Field>

        {serverError && (
          <div data-testid="login-error" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {serverError}
          </div>
        )}
      </div>

      <Button data-testid="login-submit" type="submit" size="lg" className="w-full" loading={isSubmitting}>
        {t("login.submit")}
      </Button>

      <p className="text-xs text-zinc-500 text-center">
        {t("login.noAccount")}{" "}
        <Link to="/register" className="text-accent-900 hover:underline font-medium">
          {t("login.createAccount")}
        </Link>
      </p>
    </form>
  );
}

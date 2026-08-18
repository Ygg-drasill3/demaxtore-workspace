// apps/frontend/src/features/auth/pages/LoginPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginInput, ROLE_DASHBOARD } from "@dmx/contracts/auth";
import { useAuth } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { toast } from "@/store/toast.store";
import { ShieldCheck, ShoppingCart, Factory } from "lucide-react";
import { useT } from "@/i18n/useT";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useAuthHydrated } from "@/hooks/useAuthHydrated";
import { AuthLoadingScreen } from "@/components/ui/AuthLoadingScreen";

type FormValues = { email: string; password: string };

const DEMA_SHORTCUTS = [
  { role: "ADMIN",    email: "admin@dema.test",    label: "Admin",    Icon: ShieldCheck,   tone: "ink"    },
  { role: "BUYER",    email: "buyer@dema.test",    label: "Buyer",    Icon: ShoppingCart,  tone: "accent" },
  { role: "SUPPLIER", email: "supplier@dema.test", label: "Supplier", Icon: Factory,       tone: "emerald"},
] as const;

/** Seeded supplier accounts — same password as Dema shortcuts (see prisma/seed.ts). */
const DEMA_SUPPLIER_SHORTCUTS = [
  { email: "supplier@dema.test",           label: "Dema Supplier",   org: "Dema Mfg" },
  { email: "supplier1@acme-mfg.test",    label: "Acme Sales",      org: "Acme Mfg" },
  { email: "supplier2@acme-mfg.test",    label: "Acme Ops",        org: "Acme Mfg" },
  { email: "supplier1@beta-industries.test", label: "Beta Sales",  org: "Beta Ind." },
  { email: "supplier2@beta-industries.test", label: "Beta Ops",    org: "Beta Ind." },
] as const;

const DEMA_PASSWORD = "Passw0rd!";

/** Customer demo — ABC Foods Germany scenario (yarn demo:seed). */
const CUSTOMER_DEMO_SHORTCUTS = [
  { email: "demo.buyer@demaxtore.com", label: "ABC Foods Buyer", org: "Buyer", Icon: ShoppingCart, tone: "accent" as const },
  { email: "demo.pasta@demaxtore.com", label: "Pasta Supplier", org: "Alpine Pasta", Icon: Factory, tone: "emerald" as const },
  { email: "demo.tomato@demaxtore.com", label: "Tomato Supplier", org: "Med Tomato", Icon: Factory, tone: "emerald" as const },
  { email: "demo.flour@demaxtore.com", label: "Flour Supplier", org: "Anatolian Flour", Icon: Factory, tone: "emerald" as const },
  { email: "demo.juice@demaxtore.com", label: "Juice Supplier", org: "Nordic Juice", Icon: Factory, tone: "emerald" as const },
] as const;

export default function LoginPage() {
  const { t } = useT();
  const nav  = useNavigate();
  const loc  = useLocation();
  const rehydrated = useAuthHydrated();
  const { status, user, login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [quickRole, setQuickRole]     = useState<string | null>(null);

  const fromQuery = new URLSearchParams(loc.search).get("from");

  useEffect(() => {
    if (!rehydrated || status !== "authenticated" || !user) return;
    const redirectTo =
      (loc.state as { from?: { pathname: string } } | null)?.from?.pathname ||
      (fromQuery?.startsWith("/") ? fromQuery : null) ||
      ROLE_DASHBOARD[user.role];
    nav(redirectTo, { replace: true });
  }, [rehydrated, status, user, loc.state, fromQuery, nav]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(LoginInput),
    defaultValues: { email: "", password: "" },
  });

  const performLogin = async (email: string, password: string) => {
    setServerError(null);
    try {
      const user = await login(email, password);
      toast.success(t("common.welcomeBack"), user.displayName);
      const fromQuery = new URLSearchParams(loc.search).get("from");
      const redirectTo =
        (loc.state as { from?: { pathname: string } } | null)?.from?.pathname ||
        (fromQuery?.startsWith("/") ? fromQuery : null) ||
        ROLE_DASHBOARD[user.role];
      nav(redirectTo, { replace: true });
    } catch (e: any) {
      setServerError(e.response?.data?.error?.message ?? t("login.invalid"));
    }
  };

  const onSubmit = handleSubmit((v) => performLogin(v.email, v.password));

  const quickLogin = async (key: string, email: string) => {
    setQuickRole(key);
    try { await performLogin(email, DEMA_PASSWORD); }
    finally { setQuickRole(null); }
  };

  if (!rehydrated || status === "idle" || status === "hydrating") {
    return <AuthLoadingScreen />;
  }
  if (status === "authenticated" && user) {
    return null;
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
          <Input data-testid="login-password" type="password" autoComplete="current-password" {...register("password")} />
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

      {/* Dema quick-login — sunum / demo için tek tıkla rol değişimi. */}
      <div data-testid="dema-shortcuts" className="pt-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px flex-1 bg-paper-200" />
          <span className="dmx-eyebrow text-[10px] text-zinc-400">Dema demo shortcuts</span>
          <div className="h-px flex-1 bg-paper-200" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DEMA_SHORTCUTS.map(({ role, email, label, Icon, tone }) => {
            const busy = quickRole === role;
            return (
              <button
                key={role}
                type="button"
                data-testid={`dema-shortcut-${role.toLowerCase()}`}
                disabled={isSubmitting || !!quickRole}
                onClick={() => quickLogin(role, email)}
                title={`Sign in as ${email}`}
                className={
                  "group flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-sm font-medium " +
                  "border-paper-200 hover:border-zinc-300 hover:bg-paper-50 transition-colors " +
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                }
              >
                <Icon
                  className={
                    "h-4 w-4 " +
                    (tone === "ink" ? "text-ink-900" :
                     tone === "accent" ? "text-accent-900" :
                     "text-emerald-700") +
                    (busy ? " animate-pulse" : "")
                  }
                />
                <span className="text-xs">{label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-400 text-center mt-1.5">
          One-click sign-in for the seeded <code>@dema.test</code> accounts · password <code>Passw0rd!</code>
        </p>

        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-paper-200" />
            <span className="dmx-eyebrow text-[10px] text-zinc-400">All demo suppliers</span>
            <div className="h-px flex-1 bg-paper-200" />
          </div>
          <ul className="space-y-1.5" data-testid="dema-supplier-shortcuts">
            {DEMA_SUPPLIER_SHORTCUTS.map(({ email, label, org }) => {
              const busy = quickRole === email;
              return (
                <li key={email}>
                  <button
                    type="button"
                    data-testid={`dema-supplier-${email.split("@")[0]}`}
                    disabled={isSubmitting || !!quickRole}
                    onClick={() => quickLogin(email, email)}
                    title={`Sign in as ${email}`}
                    className={
                      "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left text-sm " +
                      "border-paper-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors " +
                      "disabled:opacity-50 disabled:cursor-not-allowed" +
                      (busy ? " animate-pulse" : "")
                    }
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Factory className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                      <span className="font-medium text-ink-900 truncate">{label}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 shrink-0">{org}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4" data-testid="customer-demo-shortcuts">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-paper-200" />
            <span className="dmx-eyebrow text-[10px] text-zinc-400">Customer demo · ABC Foods</span>
            <div className="h-px flex-1 bg-paper-200" />
          </div>
          <ul className="space-y-1.5">
            {CUSTOMER_DEMO_SHORTCUTS.map(({ email, label, org, Icon, tone }) => {
              const busy = quickRole === email;
              return (
                <li key={email}>
                  <button
                    type="button"
                    data-testid={`customer-demo-${email.split("@")[0].replace(/\./g, "-")}`}
                    disabled={isSubmitting || !!quickRole}
                    onClick={() => quickLogin(email, email)}
                    title={`Sign in as ${email}`}
                    className={
                      "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left text-sm " +
                      "border-paper-200 hover:border-zinc-300 hover:bg-paper-50 transition-colors " +
                      "disabled:opacity-50 disabled:cursor-not-allowed" +
                      (busy ? " animate-pulse" : "")
                    }
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon className={"h-3.5 w-3.5 shrink-0 " + (tone === "accent" ? "text-accent-900" : "text-emerald-700")} />
                      <span className="font-medium text-ink-900 truncate">{label}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 shrink-0">{org}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-[10px] text-zinc-400 text-center mt-1.5">
            Seeded via <code>yarn demo:seed</code> · password <code>Passw0rd!</code>
          </p>
        </div>
      </div>

      <p className="text-xs text-zinc-500 text-center">
        Don't have an account? Reach out to your admin to be onboarded.
      </p>
    </form>
  );
}

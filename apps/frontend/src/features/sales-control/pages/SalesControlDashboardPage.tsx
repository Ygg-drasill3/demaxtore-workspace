import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Search, Trash2, UserPlus, Users } from "lucide-react";
import {
  canCreateSupplierCustomerAccount,
  CreateCustomerAccountInput,
  type CreateCustomerAccountResponse,
  type ResetCustomerPasswordResponse,
} from "@dmx/contracts/sales-control";
import { salesControlApi } from "../lib/sales-control.api";
import { useT } from "@/i18n/useT";
import { toast } from "@/store/toast.store";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { CustomerAccountDto } from "@dmx/contracts/sales-control";
import { useAuth } from "@/store/auth.store";

type FormValues = CreateCustomerAccountInput;

function generatePassword(): string {
  const base = Math.random().toString(36).slice(2, 8);
  return `DmX-${base}!9`;
}

export default function SalesControlDashboardPage() {
  const { t } = useT();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [created, setCreated] = useState<{ account: CreateCustomerAccountResponse["account"]; credentials: { email: string; password: string; role: string; loginUrl: string } } | null>(null);
  const [search, setSearch] = useState("");
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<CustomerAccountDto | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState(generatePassword());
  const [deleteTarget, setDeleteTarget] = useState<CustomerAccountDto | null>(null);

  const { data: customers, isLoading, isError, refetch } = useQuery({
    queryKey: ["sales-control", "customers", search],
    queryFn: () => salesControlApi.listCustomers(search || undefined),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateCustomerAccountInput),
    defaultValues: {
      displayName: "",
      email: "",
      password: generatePassword(),
      role: "BUYER",
      organisationName: "",
      whatsappPhone: "",
      secondaryContactName: "",
      secondaryContactEmail: "",
      secondaryContactWhatsapp: "",
    },
  });

  const create = useMutation({
    mutationFn: (values: FormValues) => salesControlApi.createCustomer(values),
    onSuccess: (result, values) => {
      setCreated({
        account: result.account,
        credentials: {
          email: values.email,
          password: values.password,
          role: values.role,
          loginUrl: result.loginUrl,
        },
      });
      toast.success(t("salesControl.created"));
      form.reset({
        displayName: "",
        email: "",
        password: generatePassword(),
        role: form.getValues("role"),
        organisationName: "",
        whatsappPhone: "",
        secondaryContactName: "",
        secondaryContactEmail: "",
        secondaryContactWhatsapp: "",
      });
      void qc.invalidateQueries({ queryKey: ["sales-control", "customers"] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string; error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? err.response?.data?.message ?? t("common.error"));
    },
  });

  const copyCredentials = async () => {
    if (!created) return;
    const text = [
      t("salesControl.credentialsTitle"),
      `${t("salesControl.fieldEmail")}: ${created.credentials.email}`,
      `${t("salesControl.fieldPassword")}: ${created.credentials.password}`,
      `${t("salesControl.fieldRole")}: ${created.credentials.role}`,
      `${t("salesControl.fieldLogin")}: ${created.credentials.loginUrl}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    toast.success(t("salesControl.copied"));
  };

  const resetPassword = useMutation({
    mutationFn: ({ customerId, newPassword }: { customerId: string; newPassword: string }) =>
      salesControlApi.resetCustomerPassword(customerId, newPassword),
    onSuccess: (result: ResetCustomerPasswordResponse, { newPassword }) => {
      setResetResult({ email: result.email, password: newPassword });
      setResetTarget(null);
      toast.success(t("salesControl.passwordResetDone"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const deleteCustomer = useMutation({
    mutationFn: (customerId: string) => salesControlApi.deleteCustomer(customerId),
    onSuccess: (result) => {
      setDeleteTarget(null);
      toast.success(t("salesControl.customerDeleted", undefined, { email: result.email }));
      void qc.invalidateQueries({ queryKey: ["sales-control", "customers"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const openResetModal = (customer: CustomerAccountDto) => {
    setResetPasswordValue(generatePassword());
    setResetTarget(customer);
  };

  const copyResetPassword = async () => {
    if (!resetResult) return;
    const text = [
      t("salesControl.credentialsTitle"),
      `${t("salesControl.fieldEmail")}: ${resetResult.email}`,
      `${t("salesControl.fieldPassword")}: ${resetResult.password}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    toast.success(t("salesControl.copied"));
  };

  const role = form.watch("role");
  const canCreateSupplier = canCreateSupplierCustomerAccount(user ?? {});

  const selectableRoles: FormValues["role"][] = canCreateSupplier ? ["BUYER", "SUPPLIER"] : ["BUYER"];

  return (
    <div data-testid="sales-control-dashboard" className="max-w-6xl mx-auto space-y-6 p-4 lg:p-6">
      <header>
        <span className="dmx-eyebrow text-zinc-500">{t("salesControl.eyebrow")}</span>
        <h1 className="font-display text-2xl lg:text-3xl font-semibold mt-1">{t("salesControl.title")}</h1>
        <p className="text-sm text-zinc-500 mt-1 max-w-2xl">{t("salesControl.subtitle")}</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <section className="dmx-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-accent-900" />
            <h2 className="text-sm font-semibold">{t("salesControl.createTitle")}</h2>
          </div>

          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("salesControl.fieldName")} error={form.formState.errors.displayName?.message}>
                <Input data-testid="sales-create-name" {...form.register("displayName")} />
              </Field>
              <Field label={t("salesControl.fieldCompany")} error={form.formState.errors.organisationName?.message}>
                <Input data-testid="sales-create-company" {...form.register("organisationName")} />
              </Field>
              <Field label={t("salesControl.fieldEmail")} labelLang="en" error={form.formState.errors.email?.message}>
                <Input data-testid="sales-create-email" type="email" autoComplete="off" {...form.register("email")} />
              </Field>
              <Field label={t("salesControl.fieldPassword")} error={form.formState.errors.password?.message}>
                <div className="flex gap-2">
                  <Input data-testid="sales-create-password" type="text" autoComplete="new-password" {...form.register("password")} />
                  <button
                    type="button"
                    className="dmx-btn-secondary text-xs shrink-0"
                    onClick={() => form.setValue("password", generatePassword())}
                  >
                    {t("salesControl.generatePassword")}
                  </button>
                </div>
              </Field>
              <Field label={t("salesControl.fieldWhatsapp")} error={form.formState.errors.whatsappPhone?.message}>
                <Input
                  data-testid="sales-create-whatsapp"
                  type="tel"
                  autoComplete="off"
                  placeholder="+90 5xx xxx xx xx"
                  {...form.register("whatsappPhone")}
                />
              </Field>
            </div>

            <div className="rounded-lg border border-paper-200 bg-paper-50/60 p-4 space-y-3">
              <div className="text-sm font-semibold text-ink-900">{t("salesControl.secondaryContactTitle")}</div>
              <p className="text-xs text-zinc-500">{t("salesControl.secondaryContactHint")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t("salesControl.fieldSecondaryName")} error={form.formState.errors.secondaryContactName?.message}>
                  <Input data-testid="sales-create-secondary-name" {...form.register("secondaryContactName")} />
                </Field>
                <Field label={t("salesControl.fieldSecondaryEmail")} labelLang="en" error={form.formState.errors.secondaryContactEmail?.message}>
                  <Input data-testid="sales-create-secondary-email" type="email" autoComplete="off" {...form.register("secondaryContactEmail")} />
                </Field>
                <Field label={t("salesControl.fieldSecondaryWhatsapp")} error={form.formState.errors.secondaryContactWhatsapp?.message}>
                  <Input
                    data-testid="sales-create-secondary-whatsapp"
                    type="tel"
                    autoComplete="off"
                    placeholder="+90 5xx xxx xx xx"
                    {...form.register("secondaryContactWhatsapp")}
                  />
                </Field>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-zinc-600 mb-2">{t("salesControl.fieldRole")}</div>
              <div className="flex flex-wrap gap-2">
                {selectableRoles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    data-testid={`sales-create-role-${r.toLowerCase()}`}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                      role === r ? "border-accent-900 bg-accent-50 text-accent-900" : "border-paper-200 hover:bg-paper-50",
                    )}
                    onClick={() => form.setValue("role", r)}
                  >
                    {r === "BUYER" ? t("salesControl.roleBuyer") : t("salesControl.roleSupplier")}
                  </button>
                ))}
              </div>
              {!canCreateSupplier ? (
                <p className="mt-2 text-xs text-zinc-500">
                  Supplier account creation is disabled for your user.
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              data-testid="sales-create-submit"
              className="dmx-btn-primary text-sm"
              disabled={create.isPending}
            >
              {t("salesControl.createButton")}
            </button>
          </form>
        </section>

        <div className="space-y-4 xl:sticky xl:top-4">
          {created && (
            <section data-testid="sales-created-credentials" className="dmx-card p-4 space-y-3 border border-emerald-200 bg-emerald-50/40">
              <div className="text-sm font-semibold text-emerald-900">{t("salesControl.credentialsReady")}</div>
              <dl className="text-xs space-y-1.5">
                <div><dt className="text-zinc-500 inline">{t("salesControl.fieldEmail")}: </dt><dd className="inline font-mono">{created.credentials.email}</dd></div>
                <div><dt className="text-zinc-500 inline">{t("salesControl.fieldPassword")}: </dt><dd className="inline font-mono">{created.credentials.password}</dd></div>
                <div><dt className="text-zinc-500 inline">{t("salesControl.fieldRole")}: </dt><dd className="inline">{created.credentials.role}</dd></div>
              </dl>
              <button type="button" className="dmx-btn-secondary text-xs inline-flex items-center gap-1.5" onClick={() => void copyCredentials()}>
                <Copy className="h-3.5 w-3.5" />
                {t("salesControl.copyCredentials")}
              </button>
            </section>
          )}

          {resetResult && (
            <section data-testid="sales-reset-credentials" className="dmx-card p-4 space-y-3 border border-amber-200 bg-amber-50/40">
              <div className="text-sm font-semibold text-amber-900">{t("salesControl.passwordReset")}</div>
              <dl className="text-xs space-y-1.5">
                <div><dt className="text-zinc-500 inline">{t("salesControl.fieldEmail")}: </dt><dd className="inline font-mono">{resetResult.email}</dd></div>
                <div><dt className="text-zinc-500 inline">{t("salesControl.fieldPassword")}: </dt><dd className="inline font-mono">{resetResult.password}</dd></div>
              </dl>
              <button type="button" className="dmx-btn-secondary text-xs inline-flex items-center gap-1.5" onClick={() => void copyResetPassword()}>
                <Copy className="h-3.5 w-3.5" />
                {t("salesControl.copyCredentials")}
              </button>
            </section>
          )}

          <section className="dmx-card overflow-hidden">
            <div className="px-4 py-3 border-b border-paper-100 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-500" />
                <h3 className="text-sm font-semibold">{t("salesControl.recentCustomers")}</h3>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  data-testid="sales-customer-search"
                  className="pl-8 text-xs h-8"
                  placeholder={t("salesControl.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            {isLoading ? (
              <div className="p-4 text-sm text-zinc-500">{t("common.loading")}</div>
            ) : isError ? (
              <div className="p-4 text-center space-y-2" data-testid="sales-customers-error">
                <p className="text-sm text-red-600">{t("common.error")}</p>
                <button type="button" className="dmx-btn-secondary text-xs" onClick={() => void refetch()}>
                  {t("common.retry")}
                </button>
              </div>
            ) : !customers?.length ? (
              <div className="p-4 text-sm text-zinc-500">{t("salesControl.noCustomers")}</div>
            ) : (
              <ul className="divide-y divide-paper-100 max-h-[420px] overflow-y-auto">
                {customers.map((c) => (
                  <li key={c.id} className="px-4 py-3 text-xs">
                    <div className="font-medium">{c.displayName}</div>
                    <div className="text-zinc-500 mt-0.5">{c.organisation}</div>
                    <div className="font-mono text-zinc-600 mt-1">{c.email}</div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        c.role === "BUYER" ? "bg-blue-50 text-blue-800" : "bg-emerald-50 text-emerald-800",
                      )}>
                        {c.role}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-testid={`sales-reset-password-${c.id}`}
                          className="text-[10px] font-medium text-zinc-600 hover:text-accent-900 inline-flex items-center gap-1"
                          disabled={resetPassword.isPending}
                          onClick={() => openResetModal(c)}
                        >
                          <KeyRound className="h-3 w-3" />
                          {t("salesControl.resetPassword")}
                        </button>
                        <button
                          type="button"
                          data-testid={`sales-delete-customer-${c.id}`}
                          className="text-[10px] font-medium text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                          disabled={deleteCustomer.isPending}
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 className="h-3 w-3" />
                          {t("salesControl.deleteCustomer")}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title={t("salesControl.resetPasswordTitle")}
        description={resetTarget ? `${resetTarget.displayName} · ${resetTarget.email}` : undefined}
        size="sm"
        testId="sales-reset-password-modal"
        footer={
          <>
            <button type="button" className="dmx-btn-secondary text-sm" onClick={() => setResetTarget(null)}>
              {t("common.cancel")}
            </button>
            <button
              type="button"
              data-testid="sales-reset-password-confirm"
              className="dmx-btn-primary text-sm"
              disabled={resetPassword.isPending || resetPasswordValue.trim().length < 8}
              onClick={() => {
                if (!resetTarget) return;
                resetPassword.mutate({ customerId: resetTarget.id, newPassword: resetPasswordValue.trim() });
              }}
            >
              {t("salesControl.resetPasswordConfirm")}
            </button>
          </>
        }
      >
        <Field label={t("salesControl.fieldPassword")}>
          <div className="flex gap-2">
            <Input
              data-testid="sales-reset-password-input"
              type="text"
              autoComplete="new-password"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
            />
            <button
              type="button"
              className="dmx-btn-secondary text-xs shrink-0"
              onClick={() => setResetPasswordValue(generatePassword())}
            >
              {t("salesControl.generatePassword")}
            </button>
          </div>
        </Field>
        <p className="text-xs text-zinc-500 mt-2">{t("salesControl.resetPasswordHint")}</p>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t("salesControl.deleteCustomerTitle")}
        description={deleteTarget ? `${deleteTarget.displayName} · ${deleteTarget.email}` : undefined}
        size="sm"
        testId="sales-delete-customer-modal"
        footer={
          <>
            <button type="button" className="dmx-btn-secondary text-sm" onClick={() => setDeleteTarget(null)}>
              {t("common.cancel")}
            </button>
            <button
              type="button"
              data-testid="sales-delete-customer-confirm"
              className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors h-10 px-4 text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              disabled={deleteCustomer.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteCustomer.mutate(deleteTarget.id);
              }}
            >
              {t("salesControl.deleteCustomerConfirm")}
            </button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">{t("salesControl.deleteCustomerWarning")}</p>
      </Modal>
    </div>
  );
}

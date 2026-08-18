import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Pencil, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import {
  canCreateSupplierCustomerAccount,
  CreateCustomerAccountInput,
  type CreateCustomerAccountResponse,
  type ResetCustomerPasswordResponse,
} from "@dmx/contracts/sales-control";
import { salesControlApi, salesControlApiErrorMessage } from "../lib/sales-control.api";
import { useT } from "@/i18n/useT";
import { toast } from "@/store/toast.store";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { CustomerAccountDto } from "@dmx/contracts/sales-control";
import { useAuth } from "@/store/auth.store";
import { SupplierBrandingUploadFields } from "../components/SupplierBrandingUploadFields";
import { SupplierLogoAvatar } from "@/features/rfq/components/SupplierLogoAvatar";
import { openAuthenticatedDocument } from "@/lib/authenticated-file";

type FormValues = CreateCustomerAccountInput;

function generatePassword(): string {
  const base = Math.random().toString(36).slice(2, 8);
  return `DmX-${base}!9`;
}

function brandingErrorMessage(
  e: unknown,
  t: (key: string) => string,
): string {
  const code = (e as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code;
  const byCode: Record<string, string> = {
    FILE_REQUIRED: t("salesControl.uploadFileRequired"),
    EMPTY_FILE: t("salesControl.uploadEmptyFile"),
    INVALID_IMAGE_TYPE: t("salesControl.uploadInvalidLogo"),
    INVALID_CATALOG_TYPE: t("salesControl.uploadInvalidCatalog"),
    FILE_TOO_LARGE: t("salesControl.uploadFileTooLarge"),
    UNAUTHENTICATED: t("salesControl.uploadAuthRequired"),
    LIMIT_FILE_SIZE: t("salesControl.uploadFileTooLarge"),
  };
  if (code && byCode[code]) return byCode[code];
  return salesControlApiErrorMessage(e, t("common.error"));
}

export default function SalesControlDashboardPage() {
  const { t } = useT();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [created, setCreated] = useState<{
    account: CreateCustomerAccountResponse["account"];
    credentials: { email: string; password: string; role: string; loginUrl: string };
    members: Array<{ displayName: string; email: string; password: string }>;
  } | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "BUYER" | "SUPPLIER">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<CustomerAccountDto | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState(generatePassword());
  const [deleteTarget, setDeleteTarget] = useState<CustomerAccountDto | null>(null);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [pendingCatalog, setPendingCatalog] = useState<File | null>(null);
  const [pendingCatalogLink, setPendingCatalogLink] = useState("");
  const [brandingTarget, setBrandingTarget] = useState<CustomerAccountDto | null>(null);
  const [brandingLogo, setBrandingLogo] = useState<File | null>(null);
  const [brandingCatalog, setBrandingCatalog] = useState<File | null>(null);
  const [brandingCatalogLink, setBrandingCatalogLink] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");

  const { data: interestCategories = [] } = useQuery({
    queryKey: ["sales-control", "interest-categories"],
    queryFn: () => salesControlApi.listInterestCategories(),
    staleTime: 60_000,
  });

  const { data: customers, isLoading, isError, refetch } = useQuery({
    queryKey: ["sales-control", "customers", search, roleFilter, categoryFilter],
    queryFn: () =>
      salesControlApi.listCustomers({
        q: search || undefined,
        role: roleFilter === "ALL" ? undefined : roleFilter,
        category: categoryFilter || undefined,
      }),
  });

  const {
    data: selectedDetail,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ["sales-control", "customer", selectedCustomerId],
    queryFn: () => salesControlApi.getCustomer(selectedCustomerId!),
    enabled: !!selectedCustomerId,
  });

  useEffect(() => {
    if (!selectedDetail) return;
    setEditName(selectedDetail.displayName);
    setEditEmail(selectedDetail.email);
    setEditCompany(selectedDetail.organisation === "—" ? "" : selectedDetail.organisation);
    setEditWhatsapp(selectedDetail.whatsappPhone || selectedDetail.phoneNumber || "");
  }, [selectedDetail]);

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
      additionalMembers: [],
    },
  });
  const additionalMembers = form.watch("additionalMembers") ?? [];

  const create = useMutation({
    mutationFn: (values: FormValues) => salesControlApi.createCustomer(values),
    onSuccess: async (result, values) => {
      if (values.role === "SUPPLIER") {
        try {
          if (pendingLogo) await salesControlApi.uploadLogo(result.account.id, pendingLogo);
          if (pendingCatalog) await salesControlApi.uploadCatalog(result.account.id, pendingCatalog);
          else if (pendingCatalogLink.trim()) {
            await salesControlApi.setCatalogLink(result.account.id, pendingCatalogLink.trim());
          }
        } catch (e) {
          toast.error(brandingErrorMessage(e, t));
        }
      }
      setPendingLogo(null);
      setPendingCatalog(null);
      setPendingCatalogLink("");
      setCreated({
        account: result.account,
        credentials: {
          email: values.email,
          password: values.password,
          role: values.role,
          loginUrl: result.loginUrl,
        },
        members: (result.members ?? [
          { displayName: values.displayName, email: values.email, password: values.password },
        ]).map((m) => ({
          displayName: m.displayName,
          email: m.email,
          password: m.password,
        })),
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
        additionalMembers: [],
      });
      setMemberCount(0);
      setPendingLogo(null);
      setPendingCatalog(null);
      setPendingCatalogLink("");
      void qc.invalidateQueries({ queryKey: ["sales-control", "customers"] });
    },
    onError: (e: unknown) => {
      toast.error(salesControlApiErrorMessage(e, t("common.error")));
    },
  });

  const copyCredentials = async () => {
    if (!created) return;
    const lines = [
      t("salesControl.credentialsTitle"),
      `${t("salesControl.fieldCompany")}: ${created.account.organisation}`,
      `${t("salesControl.fieldRole")}: ${created.credentials.role}`,
      `${t("salesControl.fieldLogin")}: ${created.credentials.loginUrl}`,
      "",
      ...created.members.flatMap((m, i) => [
        `${i + 1}. ${m.displayName}`,
        `${t("salesControl.fieldEmail")}: ${m.email}`,
        `${t("salesControl.fieldPassword")}: ${m.password}`,
        "",
      ]),
    ];
    await navigator.clipboard.writeText(lines.join("\n").trim());
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
    onSuccess: (result, customerId) => {
      setDeleteTarget(null);
      if (selectedCustomerId === customerId) setSelectedCustomerId(null);
      toast.success(t("salesControl.customerDeleted", undefined, { email: result.email }));
      void qc.invalidateQueries({ queryKey: ["sales-control", "customers"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const updateCustomer = useMutation({
    mutationFn: () =>
      salesControlApi.updateCustomer(selectedCustomerId!, {
        displayName: editName.trim(),
        email: editEmail.trim(),
        organisationName: editCompany.trim(),
        whatsappPhone: editWhatsapp.trim() || undefined,
      }),
    onSuccess: (detail) => {
      toast.success(t("salesControl.customerUpdated"));
      void qc.invalidateQueries({ queryKey: ["sales-control", "customers"] });
      void qc.setQueryData(["sales-control", "customer", detail.id], detail);
    },
    onError: (e: unknown) => {
      toast.error(salesControlApiErrorMessage(e, t("common.error")));
    },
  });

  const uploadBranding = useMutation({
    mutationFn: async ({
      customerId,
      logo,
      catalog,
      catalogLink,
    }: {
      customerId: string;
      logo: File | null;
      catalog: File | null;
      catalogLink: string;
    }) => {
      if (logo) await salesControlApi.uploadLogo(customerId, logo);
      if (catalog) await salesControlApi.uploadCatalog(customerId, catalog);
      else if (catalogLink.trim()) await salesControlApi.setCatalogLink(customerId, catalogLink.trim());
    },
    onSuccess: () => {
      setBrandingTarget(null);
      setBrandingLogo(null);
      setBrandingCatalog(null);
      setBrandingCatalogLink("");
      toast.success(t("salesControl.brandingSaved"));
      void qc.invalidateQueries({ queryKey: ["sales-control", "customers"] });
    },
    onError: (e) => toast.error(brandingErrorMessage(e, t)),
  });

  const openResetModal = (customer: CustomerAccountDto) => {
    setResetPasswordValue(generatePassword());
    setResetTarget(customer);
  };

  const openBrandingModal = (customer: CustomerAccountDto) => {
    setBrandingLogo(null);
    setBrandingCatalog(null);
    setBrandingCatalogLink(
      customer.catalogIsExternal && customer.catalogUrl ? customer.catalogUrl : "",
    );
    setBrandingTarget(customer);
  };

  const closeBrandingModal = () => {
    if (uploadBranding.isPending) return;
    setBrandingTarget(null);
    setBrandingLogo(null);
    setBrandingCatalog(null);
    setBrandingCatalogLink("");
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
    <div data-testid="sales-control-dashboard" data-guide="sales-portfolio" className="max-w-6xl mx-auto space-y-6 p-4 lg:p-6">
      <div data-guide="sales-pending" className="sr-only" aria-hidden>Pending portfolio actions</div>
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
                    onClick={() => {
                      form.setValue("role", r);
                      if (r === "BUYER") {
                        setPendingLogo(null);
                        setPendingCatalog(null);
                        setPendingCatalogLink("");
                      }
                    }}
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

            {role === "SUPPLIER" && (
              <SupplierBrandingUploadFields
                variant="create"
                logoFile={pendingLogo}
                catalogFile={pendingCatalog}
                catalogLinkDraft={pendingCatalogLink}
                disabled={create.isPending}
                testIdPrefix="sales-create-branding"
                onLogoChange={setPendingLogo}
                onCatalogChange={setPendingCatalog}
                onCatalogLinkChange={setPendingCatalogLink}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <p className="text-[11px] text-zinc-500 mt-1">{t("salesControl.fieldWhatsappHint")}</p>
              </Field>
            </div>

            <div className="rounded-lg border border-paper-200 bg-paper-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-ink-900">{t("salesControl.additionalMembersTitle")}</div>
                  <p className="text-xs text-zinc-500">{t("salesControl.additionalMembersHint")}</p>
                </div>
                <button
                  type="button"
                  className="dmx-btn-secondary text-xs shrink-0"
                  disabled={additionalMembers.length >= 2}
                  data-testid="sales-add-member"
                  onClick={() => {
                    const next = [
                      ...additionalMembers,
                      { displayName: "", email: "", password: generatePassword(), whatsappPhone: "" },
                    ];
                    form.setValue("additionalMembers", next);
                    setMemberCount(next.length);
                  }}
                >
                  {t("salesControl.addMember")}
                </button>
              </div>
              {additionalMembers.map((_, idx) => (
                <div key={idx} className="rounded-md border border-paper-200 bg-white p-3 space-y-3" data-testid={`sales-member-${idx}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-zinc-700">
                      {t("salesControl.memberLabel", undefined, { n: String(idx + 2) })}
                    </div>
                    <button
                      type="button"
                      className="text-xs text-red-600 underline"
                      onClick={() => {
                        const next = additionalMembers.filter((_, i) => i !== idx);
                        form.setValue("additionalMembers", next);
                        setMemberCount(next.length);
                      }}
                    >
                      {t("salesControl.removeMember")}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t("salesControl.fieldName")} error={form.formState.errors.additionalMembers?.[idx]?.displayName?.message}>
                      <Input {...form.register(`additionalMembers.${idx}.displayName` as const)} />
                    </Field>
                    <Field label={t("salesControl.fieldEmail")} labelLang="en" error={form.formState.errors.additionalMembers?.[idx]?.email?.message}>
                      <Input type="email" autoComplete="off" {...form.register(`additionalMembers.${idx}.email` as const)} />
                    </Field>
                    <Field label={t("salesControl.fieldPassword")} error={form.formState.errors.additionalMembers?.[idx]?.password?.message}>
                      <div className="flex gap-2">
                        <Input type="text" autoComplete="new-password" {...form.register(`additionalMembers.${idx}.password` as const)} />
                        <button
                          type="button"
                          className="dmx-btn-secondary text-xs shrink-0"
                          onClick={() => form.setValue(`additionalMembers.${idx}.password`, generatePassword())}
                        >
                          {t("salesControl.generatePassword")}
                        </button>
                      </div>
                    </Field>
                    <Field label={t("salesControl.fieldWhatsapp")} error={form.formState.errors.additionalMembers?.[idx]?.whatsappPhone?.message}>
                      <Input type="tel" autoComplete="off" placeholder="+90 5xx xxx xx xx" {...form.register(`additionalMembers.${idx}.whatsappPhone` as const)} />
                    </Field>
                  </div>
                </div>
              ))}
              {memberCount === 0 && additionalMembers.length === 0 ? (
                <p className="text-xs text-zinc-500">{t("salesControl.additionalMembersEmpty")}</p>
              ) : null}
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
              <p className="text-xs text-zinc-600">{created.account.organisation} · {created.credentials.role}</p>
              <div className="space-y-3">
                {created.members.map((m) => (
                  <dl key={m.email} className="text-xs space-y-1.5 rounded border border-emerald-100 bg-white/70 p-2">
                    <div className="font-semibold text-ink-900">{m.displayName}</div>
                    <div><dt className="text-zinc-500 inline">{t("salesControl.fieldEmail")}: </dt><dd className="inline font-mono">{m.email}</dd></div>
                    <div><dt className="text-zinc-500 inline">{t("salesControl.fieldPassword")}: </dt><dd className="inline font-mono">{m.password}</dd></div>
                  </dl>
                ))}
              </div>
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

          <section className="dmx-card overflow-hidden" data-testid="sales-recent-customers">
            <div className="px-4 py-3 border-b border-paper-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Users className="h-4 w-4 text-zinc-500 shrink-0" />
                  <h3 className="text-sm font-semibold truncate">{t("salesControl.recentCustomers")}</h3>
                </div>
                {customers && !isLoading ? (
                  <span className="text-[11px] text-zinc-500 shrink-0" data-testid="sales-customer-count">
                    {t("salesControl.accountCount", undefined, { count: customers.length })}
                  </span>
                ) : null}
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
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("salesControl.fieldRole")}>
                {(
                  [
                    { id: "ALL", label: t("salesControl.filterAll"), testId: "sales-filter-all" },
                    { id: "BUYER", label: t("salesControl.filterBuyer"), testId: "sales-filter-buyer" },
                    { id: "SUPPLIER", label: t("salesControl.filterSupplier"), testId: "sales-filter-supplier" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={opt.testId}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                      roleFilter === opt.id
                        ? "border-accent-900 bg-accent-50 text-accent-900"
                        : "border-paper-200 text-zinc-600 hover:bg-paper-50",
                    )}
                    onClick={() => setRoleFilter(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="sr-only" htmlFor="sales-category-filter">
                  {t("salesControl.filterCategory")}
                </label>
                <select
                  id="sales-category-filter"
                  data-testid="sales-filter-category"
                  className="dmx-input h-8 text-xs w-full"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">{t("salesControl.filterCategoryAll")}</option>
                  {interestCategories.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
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
              <ul className="divide-y divide-paper-100 max-h-[560px] overflow-y-auto" role="listbox" aria-label={t("salesControl.recentCustomers")}>
                {customers.map((c) => {
                  const selected = selectedCustomerId === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        data-testid={`sales-customer-row-${c.id}`}
                        className={cn(
                          "w-full text-left px-4 py-3 text-xs transition-colors",
                          selected ? "bg-accent-50/80" : "hover:bg-paper-50",
                        )}
                        onClick={() => setSelectedCustomerId(c.id)}
                      >
                        <div className="font-medium">{c.displayName}</div>
                        <div className="text-zinc-500 mt-0.5">{c.organisation}</div>
                        <div className="font-mono text-zinc-600 mt-1">{c.email}</div>
                        {c.interestAreas?.length ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {c.interestAreas.slice(0, 4).map((label) => (
                              <span
                                key={label}
                                className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600"
                              >
                                {label}
                              </span>
                            ))}
                            {c.interestAreas.length > 4 ? (
                              <span className="text-[10px] text-zinc-400">+{c.interestAreas.length - 4}</span>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            c.role === "BUYER" ? "bg-blue-50 text-blue-800" : "bg-emerald-50 text-emerald-800",
                          )}>
                            {c.role}
                          </span>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {c.role === "SUPPLIER" && (
                              <button
                                type="button"
                                data-testid={`sales-edit-branding-${c.id}`}
                                className="text-[10px] font-medium text-zinc-600 hover:text-accent-900 inline-flex items-center gap-1"
                                disabled={uploadBranding.isPending}
                                onClick={() => openBrandingModal(c)}
                                title={t("salesControl.editBranding")}
                              >
                                <Pencil className="h-3 w-3" />
                                {t("salesControl.editBranding")}
                              </button>
                            )}
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
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section
            className="dmx-card p-4 space-y-3"
            data-testid="sales-customer-detail"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{t("salesControl.customerDetail")}</h3>
              {selectedCustomerId && (
                <button
                  type="button"
                  className="text-zinc-400 hover:text-zinc-700"
                  aria-label={t("salesControl.clearSelection")}
                  data-testid="sales-customer-detail-close"
                  onClick={() => setSelectedCustomerId(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {!selectedCustomerId ? (
              <p className="text-xs text-zinc-500">{t("salesControl.customerDetailHint")}</p>
            ) : detailLoading ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : detailError || !selectedDetail ? (
              <div className="space-y-2">
                <p className="text-sm text-red-600">{t("common.error")}</p>
                <button type="button" className="dmx-btn-secondary text-xs" onClick={() => void refetchDetail()}>
                  {t("common.retry")}
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <SupplierLogoAvatar
                    logoUrl={selectedDetail.logoUrl}
                    supplierName={selectedDetail.displayName}
                    className="!h-12 !w-12 sm:!h-12 sm:!w-12 rounded border border-paper-100 bg-white"
                  />
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      selectedDetail.role === "BUYER" ? "bg-blue-50 text-blue-800" : "bg-emerald-50 text-emerald-800",
                    )}>
                      {selectedDetail.role}
                    </span>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {t("salesControl.createdAt")}: {new Date(selectedDetail.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <form
                  className="space-y-3"
                  data-testid="sales-customer-edit-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!selectedCustomerId) return;
                    updateCustomer.mutate();
                  }}
                >
                  <Field label={t("salesControl.fieldName")}>
                    <Input
                      data-testid="sales-edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      minLength={2}
                    />
                  </Field>
                  <Field label={t("salesControl.fieldCompany")}>
                    <Input
                      data-testid="sales-edit-company"
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      required
                      minLength={2}
                    />
                  </Field>
                  <Field label={t("salesControl.fieldEmail")}>
                    <Input
                      data-testid="sales-edit-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label={t("salesControl.fieldWhatsapp")}>
                    <Input
                      data-testid="sales-edit-whatsapp"
                      value={editWhatsapp}
                      onChange={(e) => setEditWhatsapp(e.target.value)}
                      placeholder="+90 5xx xxx xx xx"
                    />
                  </Field>
                  <DetailRow
                    label={t("salesControl.phoneStatus")}
                    value={selectedDetail.phoneVerificationStatus || "—"}
                  />
                  {selectedDetail.catalogUrl && (
                    <div>
                      <dt className="text-zinc-500">{t("salesControl.fieldCatalog")}</dt>
                      <dd className="mt-0.5">
                        <button
                          type="button"
                          data-testid="sales-preview-catalog"
                          className="underline text-accent-900 text-left"
                          onClick={() => {
                            const url = selectedDetail.catalogUrl!;
                            if (selectedDetail.catalogIsExternal || /^https?:\/\//i.test(url)) {
                              window.open(url, "_blank", "noopener,noreferrer");
                              return;
                            }
                            void openAuthenticatedDocument(url).catch(() => {
                              toast.error(t("common.error"));
                            });
                          }}
                        >
                          {t("salesControl.viewCatalog")}
                        </button>
                      </dd>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="submit"
                      data-testid="sales-customer-save"
                      className="dmx-btn-primary text-xs"
                      disabled={
                        updateCustomer.isPending
                        || editName.trim().length < 2
                        || editCompany.trim().length < 2
                        || !editEmail.trim()
                      }
                    >
                      {t("salesControl.saveCustomer")}
                    </button>
                    {selectedDetail.role === "SUPPLIER" && (
                      <button
                        type="button"
                        className="dmx-btn-secondary text-xs inline-flex items-center gap-1"
                        onClick={() => openBrandingModal(selectedDetail)}
                      >
                        <Pencil className="h-3 w-3" />
                        {t("salesControl.editBranding")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="dmx-btn-secondary text-xs inline-flex items-center gap-1"
                      onClick={() => openResetModal(selectedDetail)}
                    >
                      <KeyRound className="h-3 w-3" />
                      {t("salesControl.resetPassword")}
                    </button>
                  </div>
                </form>

                {selectedDetail.teammates.length > 0 && (
                  <div className="space-y-2 border-t border-paper-100 pt-3">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("salesControl.orgTeammates")}
                    </h4>
                    <ul className="space-y-2">
                      {selectedDetail.teammates.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            className="w-full text-left rounded border border-paper-100 px-2.5 py-2 hover:bg-paper-50"
                            onClick={() => setSelectedCustomerId(m.id)}
                            data-testid={`sales-teammate-${m.id}`}
                          >
                            <div className="font-medium">{m.displayName}</div>
                            <div className="font-mono text-zinc-600">{m.email}</div>
                            {(m.whatsappPhone || m.phoneNumber) && (
                              <div className="text-zinc-500 mt-0.5">{m.whatsappPhone || m.phoneNumber}</div>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
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
        open={!!brandingTarget}
        onClose={closeBrandingModal}
        title={t("salesControl.editBrandingTitle")}
        description={brandingTarget ? `${brandingTarget.displayName} · ${brandingTarget.organisation}` : undefined}
        size="md"
        testId="sales-edit-branding-modal"
        footer={
          <>
            <button type="button" className="dmx-btn-secondary text-sm" onClick={closeBrandingModal} disabled={uploadBranding.isPending}>
              {t("common.cancel")}
            </button>
            <button
              type="button"
              data-testid="sales-edit-branding-save"
              className="dmx-btn-primary text-sm"
              disabled={
                uploadBranding.isPending
                || (!brandingLogo && !brandingCatalog && !brandingCatalogLink.trim())
              }
              onClick={() => {
                if (!brandingTarget) return;
                uploadBranding.mutate({
                  customerId: brandingTarget.id,
                  logo: brandingLogo,
                  catalog: brandingCatalog,
                  catalogLink: brandingCatalogLink,
                });
              }}
            >
              {t("salesControl.saveBranding")}
            </button>
          </>
        }
      >
        {brandingTarget && (
          <SupplierBrandingUploadFields
            logoFile={brandingLogo}
            catalogFile={brandingCatalog}
            logoUrl={brandingTarget.logoUrl}
            catalogUrl={brandingTarget.catalogUrl}
            catalogIsExternal={brandingTarget.catalogIsExternal}
            catalogLinkDraft={brandingCatalogLink}
            disabled={uploadBranding.isPending}
            testIdPrefix={`sales-edit-branding-${brandingTarget.id}`}
            onLogoChange={setBrandingLogo}
            onCatalogChange={setBrandingCatalog}
            onCatalogLinkChange={setBrandingCatalogLink}
          />
        )}
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

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className={cn("mt-0.5 break-all", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

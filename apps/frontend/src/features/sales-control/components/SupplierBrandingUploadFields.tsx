import { useEffect, useRef, useState } from "react";
import { BookOpen, ImageIcon, Link2, Upload, X } from "lucide-react";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";
import { fetchAuthenticatedBlob, openAuthenticatedDocument } from "@/lib/authenticated-file";

type Props = {
  logoFile: File | null;
  catalogFile: File | null;
  logoUrl?: string | null;
  catalogUrl?: string | null;
  catalogIsExternal?: boolean;
  catalogLinkDraft?: string;
  onLogoChange: (file: File | null) => void;
  onCatalogChange: (file: File | null) => void;
  onCatalogLinkChange?: (url: string) => void;
  disabled?: boolean;
  testIdPrefix?: string;
  variant?: "default" | "create";
};

function openCatalog(url: string, isExternal?: boolean) {
  if (isExternal || /^https?:\/\//i.test(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  void openAuthenticatedDocument(url);
}

export function SupplierBrandingUploadFields({
  logoFile,
  catalogFile,
  logoUrl,
  catalogUrl,
  catalogIsExternal,
  catalogLinkDraft,
  onLogoChange,
  onCatalogChange,
  onCatalogLinkChange,
  disabled,
  testIdPrefix = "sales-branding",
  variant = "default",
}: Props) {
  const { t } = useT();
  const logoRef = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState(catalogLinkDraft ?? "");

  useEffect(() => {
    setLinkValue(catalogLinkDraft ?? "");
  }, [catalogLinkDraft]);

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }

    if (!logoUrl) {
      setLogoPreview(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    void fetchAuthenticatedBlob(logoUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setLogoPreview(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setLogoPreview(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [logoFile, logoUrl]);

  const hasCatalog = !!(catalogFile || catalogUrl || linkValue.trim());

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3",
      variant === "create"
        ? "border-paper-200 bg-paper-50/60"
        : "rounded-xl border-accent-900/10 bg-accent-50/30",
    )}>
      <div>
        <p className="text-sm font-semibold text-ink-900">{t("salesControl.brandingTitle")}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {variant === "create" ? t("salesControl.brandingCreateHint") : t("salesControl.brandingHint")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-paper-200 bg-white p-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            {logoPreview ? (
              <img src={logoPreview} alt="" className="h-10 w-10 rounded-md border border-paper-200 object-contain bg-white shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-md border border-dashed border-paper-200 bg-paper-50 flex items-center justify-center shrink-0">
                <ImageIcon className="h-4 w-4 text-zinc-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-900">{t("salesControl.fieldLogo")}</p>
              <p className="text-[10px] text-zinc-500 truncate">
                {logoFile?.name ?? (logoUrl ? t("salesControl.logoReady") : "PNG, JPG, WebP")}
              </p>
            </div>
            {logoFile && (
              <button
                type="button"
                className="text-zinc-400 hover:text-red-600"
                onClick={() => onLogoChange(null)}
                aria-label="Remove logo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-paper-200 bg-paper-50 px-2 py-2 text-xs font-medium text-accent-900 hover:bg-accent-50 transition-colors disabled:opacity-50"
            disabled={disabled}
            onClick={() => logoRef.current?.click()}
            data-testid={`${testIdPrefix}-upload-logo`}
          >
            <Upload className="h-3.5 w-3.5" />
            {logoFile || logoUrl ? t("salesControl.replaceLogo") : t("salesControl.uploadLogo")}
          </button>
          <input
            ref={logoRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (file) onLogoChange(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="rounded-lg border border-paper-200 bg-white p-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "h-10 w-10 rounded-md border flex items-center justify-center shrink-0",
              hasCatalog ? "border-accent-900/20 bg-accent-50" : "border-dashed border-paper-200 bg-paper-50",
            )}>
              <BookOpen className={cn("h-4 w-4", hasCatalog ? "text-accent-900" : "text-zinc-400")} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-900">{t("salesControl.fieldCatalog")}</p>
              <p className="text-[10px] text-zinc-500 truncate">
                {catalogFile?.name
                  ?? (catalogUrl
                    ? (catalogIsExternal ? t("salesControl.catalogLinkReady") : t("salesControl.catalogReady"))
                    : t("salesControl.catalogHint"))}
              </p>
            </div>
            {catalogFile && (
              <button
                type="button"
                className="text-zinc-400 hover:text-red-600"
                onClick={() => onCatalogChange(null)}
                aria-label="Remove catalog"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-paper-200 bg-paper-50 px-2 py-2 text-xs font-medium text-accent-900 hover:bg-accent-50 transition-colors disabled:opacity-50"
            disabled={disabled}
            onClick={() => catalogRef.current?.click()}
            data-testid={`${testIdPrefix}-upload-catalog`}
          >
            <Upload className="h-3.5 w-3.5" />
            {catalogFile || (catalogUrl && !catalogIsExternal)
              ? t("salesControl.replaceCatalog")
              : t("salesControl.uploadCatalog")}
          </button>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-medium text-zinc-500" htmlFor={`${testIdPrefix}-catalog-link`}>
              {t("salesControl.catalogLinkLabel")}
            </label>
            <div className="flex gap-1.5">
              <input
                id={`${testIdPrefix}-catalog-link`}
                type="url"
                inputMode="url"
                placeholder="https://…"
                className="h-9 min-w-0 flex-1 rounded-md border border-paper-200 px-2 text-xs"
                value={linkValue}
                disabled={disabled}
                data-testid={`${testIdPrefix}-catalog-link`}
                onChange={(e) => {
                  setLinkValue(e.target.value);
                  onCatalogLinkChange?.(e.target.value);
                  if (e.target.value.trim() && catalogFile) onCatalogChange(null);
                }}
              />
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-paper-200 text-zinc-400" aria-hidden>
                <Link2 className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">{t("salesControl.catalogLinkHint")}</p>
          </div>

          {catalogUrl && !catalogFile && (
            <button
              type="button"
              className="block w-full text-center text-[10px] text-zinc-500 hover:text-accent-900"
              onClick={() => openCatalog(catalogUrl, catalogIsExternal)}
            >
              {t("salesControl.viewCatalog")}
            </button>
          )}
          <input
            ref={catalogRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (file) {
                onCatalogChange(file);
                setLinkValue("");
                onCatalogLinkChange?.("");
              }
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}

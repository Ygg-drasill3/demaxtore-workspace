import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "@/store/toast.store";
import { useT } from "@/i18n/useT";

const CATALOG_RFQ_BASE =
  import.meta.env.VITE_CATALOG_RFQ_URL ?? "https://demaxtore.com/rfq";

const CATALOG_ORIGIN = new URL(CATALOG_RFQ_BASE.replace(/\/rfq$/, "") || "https://demaxtore.com").origin;
const EMBED_BASE = `${CATALOG_RFQ_BASE.replace(/\/$/, "").replace(/\/rfq$/, "")}/rfq/workspace`;

function buildEmbedUrl(buyerEmail?: string) {
  const url = new URL(EMBED_BASE);
  url.searchParams.set("embed", "workspace");
  url.searchParams.set("compact", "1");
  url.searchParams.set("hideChrome", "1");
  url.searchParams.set("hideCookieBanner", "1");
  if (buyerEmail) url.searchParams.set("buyerEmail", buyerEmail);
  return url.toString();
}

/** Workspace içinde demaxtore.com RFQ formu — sepet ve "How it Works" gizli embed */
export default function RfqCatalogEmbedPage() {
  const { t } = useT();
  const nav = useNavigate();
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmbed = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSrc(null);
    setIframeLoading(true);

    api
      .get<{ buyerEmail: string }>("/integrations/catalog-rfq/context")
      .then(({ data }) => {
        if (cancelled) return;
        setSrc(buildEmbedUrl(data.buyerEmail));
      })
      .catch(() => {
        if (cancelled) return;
        setSrc(buildEmbedUrl());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cleanup = loadEmbed();
    return cleanup;
  }, [loadEmbed]);

  useEffect(() => {
    const allowedOrigins = new Set([
      CATALOG_ORIGIN,
      "https://demaxtore.com",
      "https://www.demaxtore.com",
    ]);
    const onMessage = (ev: MessageEvent) => {
      if (!allowedOrigins.has(ev.origin)) return;
      const data = ev.data as { type?: string; workspaceId?: string };
      if (data?.type !== "demaxtore:rfq-submitted") return;
      toast.success(t("rfq.embed.submitted"));
      nav("/buyer/rfq");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [nav, t]);

  const openExternal = () => {
    const url = src ?? buildEmbedUrl();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      data-testid="rfq-catalog-embed"
      className="relative w-full min-w-0 -mt-3 -mb-5 lg:-mt-5 lg:-mb-7 pb-24"
      style={{ minWidth: 320 }}
    >
      {loading && (
        <div className="flex h-[calc(100vh-3.25rem)] min-h-[720px] items-center justify-center text-sm text-zinc-500">
          {t("rfq.embed.loading")}
        </div>
      )}

      {!loading && error && (
        <div className="flex h-[calc(100vh-3.25rem)] min-h-[720px] flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button type="button" className="dmx-btn-secondary text-sm" onClick={loadEmbed}>
            {t("common.retry")}
          </button>
        </div>
      )}

      {!loading && !error && src && (
        <>
          {iframeLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper-50 text-sm text-zinc-500">
              {t("rfq.embed.loading")}
            </div>
          )}
          <iframe
            key={src}
            title="DeMaxtore RFQ Form"
            src={src}
            className="block w-full min-w-full h-[calc(100vh-3.25rem)] min-h-[720px] border-0 rounded-xl bg-white shadow-sm"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="clipboard-write"
            onLoad={() => setIframeLoading(false)}
            onError={() => setError(t("rfq.embed.loadFailed"))}
          />
          <p className="mt-2 text-center text-xs text-zinc-500">
            {t("rfq.embed.fallback")}{" "}
            <button type="button" className="text-accent-900 underline" onClick={openExternal}>
              {t("common.openExternal")}
            </button>
            .
          </p>
        </>
      )}
    </div>
  );
}

import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useT } from "@/i18n/useT";
import { useSsoEmbed } from "@/hooks/useSsoEmbed";

const PANEL_BASE =
  import.meta.env.VITE_COMMODITYBID_PANEL_URL ??
  "https://commoditybid.demaxtore.com/panel";

export const CREATE_PATH =
  import.meta.env.VITE_COMMODITYBID_CREATE_PATH ?? "/productionRequests/create";

export const LIST_PATH =
  import.meta.env.VITE_COMMODITYBID_LIST_PATH ?? "/productionRequests";

type Props = {
  /** Opens Production Requests create form (Request Details). */
  createMode?: boolean;
  /** Opens production requests / auctions list (List Auctions). */
  listMode?: boolean;
  /** Center embed in a constrained column (procurement strategy page). */
  centered?: boolean;
};

/** Workspace oturumu ile CommodityBid panel — iframe embed */
export default function CommodityBidEmbedPage({ createMode = false, listMode = false, centered = false }: Props) {
  const { t } = useT();
  const location = useLocation();
  const redirectPath = createMode ? CREATE_PATH : listMode ? LIST_PATH : undefined;
  const embedWorkspace = Boolean(redirectPath);

  const { ssoPath, fallbackNext } = useMemo(() => {
    const params = new URLSearchParams();
    if (redirectPath) params.set("next", redirectPath);
    if (embedWorkspace) {
      params.set("embed", "workspace");
      params.set("compact", "1");
    }
    const qs = params.toString() ? `?${params.toString()}` : "";
    const next = redirectPath
      ? (embedWorkspace ? `${redirectPath}?embed=workspace&compact=1` : redirectPath)
      : "/productionRequests";
    return {
      ssoPath: `/integrations/commoditybid/sso${qs}`,
      fallbackNext: next,
    };
  }, [redirectPath, embedWorkspace]);

  const {
    src,
    error,
    ssoLoading,
    iframeLoading,
    retry,
    onIframeLoad,
    openExternal,
  } = useSsoEmbed({
    ssoPath,
    panelBase: PANEL_BASE,
    fallbackNext,
    deps: [location.key],
    mapError: (err: unknown) => {
      const ax = err as { code?: string; response?: { status?: number; data?: { message?: string } } };
      const status = ax.response?.status;
      const msg = ax.response?.data?.message;
      if (ax.code === "ECONNABORTED") return t("cb.embed.error.timeout");
      if (status === 503) return t("cb.embed.error.sso");
      if (status === 401) return t("cb.embed.error.auth");
      return msg ?? t("cb.embed.error.generic");
    },
  });

  const minH = centered ? "min-h-[640px]" : "min-h-[720px]";
  const frameH = centered ? "h-[calc(100vh-14rem)]" : "h-[calc(100vh-0px)]";

  return (
    <div
      data-testid={createMode ? "cb-external-embed-create" : listMode ? "cb-external-embed-list" : "cb-external-embed"}
      className={`relative min-w-0 h-full ${centered ? "w-full max-w-6xl mx-auto" : "w-full"}`}
      style={{ minWidth: 320, minHeight: centered ? "640px" : "calc(100vh - 0px)" }}
    >
      {ssoLoading && (
        <div className={`flex ${frameH} ${minH} items-center justify-center text-sm text-zinc-500`}>
          {t("cb.embed.loading")}
        </div>
      )}

      {!ssoLoading && error && (
        <div className={`flex ${frameH} ${minH} flex-col items-center justify-center gap-3 px-6 text-center`}>
          <p className="text-sm text-red-600">{error}</p>
          <button type="button" className="dmx-btn-secondary text-sm" onClick={retry}>
            {t("common.retry")}
          </button>
        </div>
      )}

      {!ssoLoading && !error && src && (
        <>
          {iframeLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper-50 text-sm text-zinc-500">
              {createMode ? t("cb.embed.formLoading") : listMode ? t("cb.embed.listLoading") : t("cb.embed.panelLoading")}
            </div>
          )}
          <iframe
            key={src}
            title="CommodityBid"
            src={src}
            className={`block w-full border-0 bg-white rounded-xl shadow-sm transition-opacity duration-200 ${frameH} ${minH}`}
            style={{ opacity: iframeLoading ? 0 : 1 }}
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="clipboard-write; fullscreen"
            onLoad={onIframeLoad}
          />
          <p className="mt-2 text-center text-xs text-zinc-500">
            <button type="button" className="text-accent-900 underline" onClick={openExternal}>
              {t("cb.embed.openExternal")}
            </button>
            .
          </p>
        </>
      )}
    </div>
  );
}

/** Quick Action "Create Bid" — always opens Production Requests create form. */
export function CommodityBidCreateEmbedPage() {
  return <CommodityBidEmbedPage createMode />;
}

/** Sidebar "Commodity Bids" — opens List Auctions in the external panel. */
export function CommodityBidListEmbedPage() {
  return <CommodityBidEmbedPage listMode />;
}

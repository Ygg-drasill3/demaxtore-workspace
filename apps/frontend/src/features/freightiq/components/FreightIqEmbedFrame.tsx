import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useT } from "@/i18n/useT";

type WorkspaceRfqEmbedItem = {
  workspaceRfqId: string;
  externalRef: string;
  title: string;
  state: string;
  originPort: string;
  destinationPort: string;
  cargoType: string;
};

type SsoResponse = {
  bridgeUrl: string;
  embedUrl?: string | null;
  sso: string;
  workspaceRfqs?: WorkspaceRfqEmbedItem[];
};

const PANEL_BASE =
  import.meta.env.VITE_FREIGHTIQ_PANEL_URL ?? "https://freightiq.demaxtore.com";

const SSO_TIMEOUT_MS = 15_000;
const IFRAME_LOAD_TIMEOUT_MS = 20_000;

type EmbedSize = "compact" | "inline" | "create" | "fullscreen";

type Props = {
  /** FreightIQ panel path after SSO (e.g. /dashboard, /shipments) */
  nextPath?: string;
  /** Tam ekran iframe — alt bilgi satırı gizlenir */
  fullscreen?: boolean;
  /** compact: sipariş paneli önizleme (~300px); inline: orta boy */
  size?: EmbedSize;
  /** Workspace order id — syncs spawned shipments into FreightIQ before embed */
  orderId?: string;
  /** Workspace RFQ uuid — synced to FreightIQ before embed; maps to WhatsApp thread. */
  workspaceRfqId?: string;
  className?: string;
  testId?: string;
};

const SIZE_CLASSES: Record<EmbedSize, string> = {
  compact: "h-[300px] min-h-[280px]",
  inline: "h-[min(420px,45vh)] min-h-[300px]",
  create: "h-[min(520px,58vh)] min-h-[400px]",
  fullscreen: "h-full min-h-[calc(100vh)]",
};

/** Workspace SSO → FreightIQ iframe */
export function FreightIqEmbedFrame({
  nextPath = "/dashboard",
  fullscreen = true,
  size,
  className = "",
  orderId,
  workspaceRfqId,
  testId = "freightiq-external-embed",
}: Props) {
  const resolvedSize: EmbedSize = size ?? (fullscreen ? "fullscreen" : "inline");
  const { t } = useT();
  const [retryKey, setRetryKey] = useState(0);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ssoLoading, setSsoLoading] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);
  const iframeTimerRef = useRef<number | null>(null);
  const onLoadTimerRef = useRef<number | null>(null);
  const readyMessageRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const workspaceRfqsRef = useRef<WorkspaceRfqEmbedItem[]>([]);
  const panelOrigin = new URL(PANEL_BASE).origin;

  const postWorkspaceRfqs = () => {
    const rfqs = workspaceRfqsRef.current;
    if (!rfqs.length || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "workspace:rfqs", rfqs },
      panelOrigin,
    );
  };

  const retry = () => {
    readyMessageRef.current = false;
    setRetryKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    setSsoLoading(true);
    setError(null);
    setSrc(null);
    setIframeLoading(true);

    const params = new URLSearchParams({ next: nextPath, embed: "workspace" });
    if (resolvedSize !== "fullscreen") params.set("compact", "1");
    if (orderId) params.set("orderId", orderId);
    if (workspaceRfqId) params.set("workspaceRfqId", workspaceRfqId);

    api
      .get<SsoResponse>(
        `/integrations/freightiq/sso?${params.toString()}`,
        { timeout: SSO_TIMEOUT_MS },
      )
      .then(({ data }) => {
        if (cancelled) return;
        workspaceRfqsRef.current = data.workspaceRfqs ?? [];
        setSrc(
          data.embedUrl
            || data.bridgeUrl
            || `${PANEL_BASE}/auth/bridge?sso=${encodeURIComponent(data.sso)}&next=${encodeURIComponent(nextPath)}&embed=workspace`,
        );
      })
      .catch((err: { code?: string; response?: { status?: number; data?: { message?: string } } }) => {
        if (cancelled) return;
        const status = err.response?.status;
        const msg = err.response?.data?.message;
        if (err.code === "ECONNABORTED") {
          setError(t("freightiq.embed.timeout"));
        } else if (status === 503) {
          setError(t("freightiq.embed.ssoNotConfigured"));
        } else if (status === 401) {
          setError(t("freightiq.embed.sessionExpired"));
        } else {
          setError(msg ?? t("freightiq.embed.ssoFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) setSsoLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [nextPath, resolvedSize, orderId, workspaceRfqId, t, retryKey]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== panelOrigin) return;
      if (event.data?.type === "freightiq:ready") {
        readyMessageRef.current = true;
        setIframeLoading(false);
        postWorkspaceRfqs();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [panelOrigin]);

  useEffect(() => {
    if (!src || ssoLoading || error) return;

    readyMessageRef.current = false;
    setIframeLoading(true);
    iframeTimerRef.current = window.setTimeout(() => {
      setIframeLoading(false);
    }, IFRAME_LOAD_TIMEOUT_MS);

    return () => {
      if (iframeTimerRef.current) window.clearTimeout(iframeTimerRef.current);
      if (onLoadTimerRef.current) window.clearTimeout(onLoadTimerRef.current);
    };
  }, [src, ssoLoading, error]);

  useEffect(() => () => {
    if (onLoadTimerRef.current) window.clearTimeout(onLoadTimerRef.current);
  }, []);

  const openExternal = () => {
    if (src) window.open(src, "_blank", "noopener,noreferrer");
  };

  const frameHeight = SIZE_CLASSES[resolvedSize];

  return (
    <div
      data-testid={testId}
      className={`relative w-full min-w-0 ${resolvedSize === "fullscreen" ? "h-full" : ""} ${className}`}
    >
      {ssoLoading && (
        <div className={`flex ${frameHeight} items-center justify-center bg-paper-50 text-sm text-zinc-500`}>
          {t("freightiq.embed.loading")}
        </div>
      )}

      {!ssoLoading && error && (
        <div className={`flex ${frameHeight} flex-col items-center justify-center gap-3 px-6 text-center`}>
          <p className="text-sm text-red-600">{error}</p>
          <button type="button" className="dmx-btn-secondary text-sm" onClick={retry}>
            {t("common.retry")}
          </button>
        </div>
      )}

      {!ssoLoading && !error && src && (
        <>
          {iframeLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-paper-50 text-sm text-zinc-500">
              {t("freightiq.embed.panelLoading")}
            </div>
          )}
          <iframe
            key={src}
            ref={iframeRef}
            title="FreightIQ"
            src={src}
            className={`block w-full border-0 bg-white ${frameHeight} ${resolvedSize === "fullscreen" ? "" : "rounded-b-xl"}`}
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="clipboard-write; fullscreen"
            onLoad={() => {
              if (onLoadTimerRef.current) window.clearTimeout(onLoadTimerRef.current);
              onLoadTimerRef.current = window.setTimeout(() => {
                if (!readyMessageRef.current) setIframeLoading(false);
                postWorkspaceRfqs();
              }, 600);
            }}
          />
          <p className="mt-2 text-center text-xs text-zinc-500">
            {t("freightiq.embed.openFullscreen")}{" "}
            <button type="button" className="font-medium text-accent-900 hover:underline" onClick={openExternal}>
              {t("freightiq.embed.openExternal")}
            </button>
          </p>
        </>
      )}
    </div>
  );
}

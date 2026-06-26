import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-errors";

const DEFAULT_SSO_TIMEOUT_MS = 15_000;
const DEFAULT_IFRAME_TIMEOUT_MS = 20_000;

type SsoResponse = {
  bridgeUrl: string;
  embedUrl?: string | null;
  sso: string;
  next?: string | null;
};

type Options = {
  /** API path including query string, e.g. `/integrations/commoditybid/sso?next=...` */
  ssoPath: string;
  panelBase: string;
  fallbackNext: string;
  /** Extra deps that should re-fetch SSO (besides retryKey). */
  deps?: readonly unknown[];
  ssoTimeoutMs?: number;
  iframeTimeoutMs?: number;
  mapError?: (err: unknown) => string | null;
};

/**
 * Shared SSO → iframe flow (FreightIQ / CommodityBid pattern).
 * Retry re-runs SSO fetch without a full page reload.
 */
export function useSsoEmbed({
  ssoPath,
  panelBase,
  fallbackNext,
  deps = [],
  ssoTimeoutMs = DEFAULT_SSO_TIMEOUT_MS,
  iframeTimeoutMs = DEFAULT_IFRAME_TIMEOUT_MS,
  mapError,
}: Options) {
  const [retryKey, setRetryKey] = useState(0);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ssoLoading, setSsoLoading] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);
  const iframeTimerRef = useRef<number | null>(null);
  const onLoadTimerRef = useRef<number | null>(null);

  const retry = useCallback(() => setRetryKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setSsoLoading(true);
    setError(null);
    setSrc(null);
    setIframeLoading(true);

    api
      .get<SsoResponse>(ssoPath, { timeout: ssoTimeoutMs })
      .then(({ data }) => {
        if (cancelled) return;
        setSrc(
          data.embedUrl
            || data.bridgeUrl
            || `${panelBase}/auth/bridge?sso=${encodeURIComponent(data.sso)}&next=${encodeURIComponent(fallbackNext)}`,
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(mapError?.(err) ?? getApiErrorMessage(err, "SSO failed."));
      })
      .finally(() => {
        if (!cancelled) setSsoLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- retryKey + caller deps
  }, [ssoPath, panelBase, fallbackNext, ssoTimeoutMs, retryKey, ...deps]);

  useEffect(() => {
    if (!src || ssoLoading || error) return;

    setIframeLoading(true);
    iframeTimerRef.current = window.setTimeout(() => {
      setIframeLoading(false);
    }, iframeTimeoutMs);

    return () => {
      if (iframeTimerRef.current) window.clearTimeout(iframeTimerRef.current);
      if (onLoadTimerRef.current) window.clearTimeout(onLoadTimerRef.current);
    };
  }, [src, ssoLoading, error, iframeTimeoutMs]);

  useEffect(() => () => {
    if (onLoadTimerRef.current) window.clearTimeout(onLoadTimerRef.current);
  }, []);

  const onIframeLoad = useCallback(() => {
    if (onLoadTimerRef.current) window.clearTimeout(onLoadTimerRef.current);
    onLoadTimerRef.current = window.setTimeout(() => setIframeLoading(false), 400);
  }, []);

  const openExternal = useCallback(() => {
    if (src) window.open(src, "_blank", "noopener,noreferrer");
  }, [src]);

  return {
    src,
    error,
    ssoLoading,
    iframeLoading,
    retry,
    onIframeLoad,
    openExternal,
  };
}

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@dmx/contracts/socket-events";
import type { ControlTowerAlertCreatedPayload } from "@dmx/contracts/control-tower";
import type { ExceptionSeverity } from "@dmx/contracts/exception-hub";
import { toast } from "@/store/toast.store";
import { exceptionHubApi } from "../lib/exception-hub.api";

const recentKeys = new Set<string>();

function dedupeKey(key: string): boolean {
  if (recentKeys.has(key)) return false;
  recentKeys.add(key);
  setTimeout(() => recentKeys.delete(key), 90_000);
  return true;
}

function pushBySeverity(severity: string, title: string, body?: string) {
  const key = `${severity}::${title}::${body ?? ""}`;
  if (!dedupeKey(key)) return;
  if (severity === "CRITICAL" || severity === "Critical" || severity === "High") {
    toast.error(title, body);
    return;
  }
  if (severity === "WARNING" || severity === "Medium") {
    toast.warning(title, body);
    return;
  }
  toast.info(title, body);
}

function exceptionSeverityToast(sev: ExceptionSeverity) {
  if (sev === "Critical" || sev === "High") return toast.error;
  if (sev === "Medium") return toast.warning;
  return toast.info;
}

/**
 * Real-time + polling bridge: shows toast alerts for delays and exceptions
 * anywhere in the app (not only on /exceptions).
 */
export function useGlobalAlertToasts(enabled: boolean) {
  const seenExceptionIds = useRef(new Set<string>());
  const primed = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const s = getSocket();

    const onAlertCreated = (p: ControlTowerAlertCreatedPayload) => {
      const { alert } = p;
      pushBySeverity(alert.severity, alert.title, alert.description);
    };

    const onTrackingDelay = (p: { workspaceId: string; delayFlag?: string | null }) => {
      pushBySeverity(
        "WARNING",
        "Shipment delay detected",
        p.delayFlag
          ? `Maritime tracking reported delay (${p.delayFlag}).`
          : "Maritime tracking reported a vessel delay.",
      );
    };

    const onShipmentException = (p: { type?: string; message?: string; exceptionType?: string }) => {
      pushBySeverity(
        "WARNING",
        p.exceptionType ?? p.type ?? "New shipment exception",
        p.message ?? "A shipment exception requires your attention.",
      );
    };

    s.on(SocketEvents.CONTROL_TOWER_ALERT_CREATED, onAlertCreated);
    s.on(SocketEvents.SHIPMENT_TRACKING_DELAY, onTrackingDelay);
    s.on("shipment.exception.created", onShipmentException);

    return () => {
      s.off(SocketEvents.CONTROL_TOWER_ALERT_CREATED, onAlertCreated);
      s.off(SocketEvents.SHIPMENT_TRACKING_DELAY, onTrackingDelay);
      s.off("shipment.exception.created", onShipmentException);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await exceptionHubApi.list({ limit: 40, offset: 0, status: "Open" });
        if (cancelled) return;

        for (const item of data.items) {
          if (!primed.current) {
            seenExceptionIds.current.add(item.id);
            continue;
          }
          if (seenExceptionIds.current.has(item.id)) continue;
          seenExceptionIds.current.add(item.id);

          const key = `ex:${item.id}`;
          if (!dedupeKey(key)) continue;

          const fn = exceptionSeverityToast(item.severity);
          fn(
            item.exceptionType,
            item.requiredAction ?? `${item.tradeId} · ${item.exceptionRef}`,
          );
        }
        primed.current = true;
      } catch {
        // retry on next interval
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);
}

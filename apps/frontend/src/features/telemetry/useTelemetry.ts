// apps/frontend/src/features/telemetry/useTelemetry.ts
//
// Phase 4 — Workspace Telemetry capture (no dashboard yet).
// Fire-and-forget POST /api/telemetry. Failures never affect UX.
//
import { useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth.store";
import type { TelemetryEventInput, TelemetryEventName } from "@dmx/contracts/telemetry";

function postTelemetry(body: TelemetryEventInput, token: string | null) {
  const url = (api.defaults.baseURL ?? "") + "/telemetry";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  // fetch+keepalive survives page unload and supports Authorization (sendBeacon cannot).
  if (typeof fetch !== "undefined") {
    fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      keepalive: true,
      credentials: "include",
    }).catch(() => { /* swallow */ });
    return;
  }
  api.post("/telemetry", body).catch(() => { /* swallow */ });
}

export function useTelemetry() {
  const track = useCallback(
    (name: TelemetryEventName, payload: Omit<TelemetryEventInput, "event" | "clientAt"> = {}) => {
      const body: TelemetryEventInput = {
        event: name,
        clientAt: new Date().toISOString(),
        ...payload,
      };
      postTelemetry(body, useAuth.getState().accessToken);
    },
    [],
  );

  return { track };
}

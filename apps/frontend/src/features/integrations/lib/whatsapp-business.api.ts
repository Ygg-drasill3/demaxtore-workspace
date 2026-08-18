import { api } from "@/lib/api";

export type WhatsAppConnectionStatus =
  | "PENDING"
  | "CONNECTED"
  | "EXPIRED"
  | "REVOKED"
  | "DISCONNECTED"
  | "ERROR";

export type WhatsAppHealthStatus =
  | "healthy"
  | "degraded"
  | "disconnected"
  | "reauth_required"
  | "not_connected";

export type WhatsAppBusinessConnectionDto = {
  status: WhatsAppConnectionStatus;
  connected: boolean;
  businessName: string | null;
  verifiedName: string | null;
  displayPhoneNumber: string | null;
  connectedAt: string | null;
  healthStatus: WhatsAppHealthStatus;
  lastHealthCheckAt: string | null;
  lastErrorMessage: string | null;
};

export type ConnectWhatsAppInput = {
  code: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
};

export type HealthCheckResult = {
  ok: boolean;
  healthStatus: WhatsAppHealthStatus;
  message: string;
  checkedAt: string;
};

export const whatsappBusinessApi = {
  getConnection: () =>
    api.get<{ connection: WhatsAppBusinessConnectionDto }>("/integrations/whatsapp/me").then((r) => r.data.connection),

  completeEmbeddedSignup: (input: ConnectWhatsAppInput) =>
    api
      .post<{ connection: WhatsAppBusinessConnectionDto }>(
        "/integrations/whatsapp/embedded-signup/complete",
        input,
      )
      .then((r) => r.data.connection),

  testConnection: () =>
    api.post<HealthCheckResult>("/integrations/whatsapp/test").then((r) => r.data),

  disconnect: () =>
    api.post<{ ok: true }>("/integrations/whatsapp/disconnect").then((r) => r.data),

  prepareReconnect: () =>
    api.post<{ ready: true; message: string }>("/integrations/whatsapp/reconnect").then((r) => r.data),
};

declare global {
  interface Window {
    FB?: {
      init: (params: Record<string, unknown>) => void;
      login: (
        callback: (response: {
          authResponse?: { code?: string };
          status?: string;
        }) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

function metaAppId(): string {
  return import.meta.env.VITE_META_APP_ID ?? "";
}

function metaConfigId(): string {
  return import.meta.env.VITE_META_WHATSAPP_CONFIG_ID ?? "";
}

export function isEmbeddedSignupConfigured(): boolean {
  return Boolean(metaAppId() && metaConfigId());
}

export function loadFacebookSdk(apiVersion = "v21.0"): Promise<void> {
  const appId = metaAppId();
  if (!appId) return Promise.reject(new Error("VITE_META_APP_ID is not configured"));

  if (window.FB) return Promise.resolve();

  return new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, cookie: true, xfbml: true, version: apiVersion });
      resolve();
    };

    if (document.getElementById("facebook-jssdk")) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onerror = () => reject(new Error("Failed to load Facebook SDK"));
    document.body.appendChild(script);
  });
}

export type EmbeddedSignupResult = {
  code: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
};

export function launchEmbeddedSignup(): Promise<EmbeddedSignupResult> {
  const configId = metaConfigId();
  if (!configId) return Promise.reject(new Error("VITE_META_WHATSAPP_CONFIG_ID is not configured"));

  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("Facebook SDK not loaded"));
      return;
    }

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code) {
          reject(new Error(response.status === "unknown" ? "Signup cancelled" : "Embedded signup failed"));
          return;
        }
        resolve({ code });
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      },
    );
  });
}

/** Listen for Meta Embedded Signup session info (wabaId, phoneNumberId, businessId). */
export function listenEmbeddedSignupSession(): Promise<Partial<EmbeddedSignupResult>> {
  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      if (typeof event.origin !== "string" || !event.origin.includes("facebook.com")) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.event === "FINISH") {
          window.removeEventListener("message", handler);
          resolve({
            wabaId: data.data?.waba_id,
            phoneNumberId: data.data?.phone_number_id,
            businessId: data.data?.business_id,
          });
        }
      } catch {
        // ignore non-json messages
      }
    };
    window.addEventListener("message", handler);
    setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve({});
    }, 120_000);
  });
}

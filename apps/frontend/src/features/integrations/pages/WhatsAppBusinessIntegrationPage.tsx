import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Loader2,
  MessageCircle,
  Phone,
  Plug,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import {
  useConnectWhatsAppBusiness,
  useDisconnectWhatsAppBusiness,
  useReconnectWhatsAppBusiness,
  useTestWhatsAppBusiness,
  useWhatsAppBusinessConnection,
  isEmbeddedSignupConfigured,
} from "../hooks/useWhatsAppBusiness";

function healthLabel(status: string) {
  switch (status) {
    case "healthy":
      return { text: "Healthy", className: "text-emerald-700" };
    case "degraded":
      return { text: "Needs attention", className: "text-amber-700" };
    case "reauth_required":
      return { text: "Re-authentication required", className: "text-red-700" };
    case "disconnected":
      return { text: "Disconnected", className: "text-zinc-500" };
    default:
      return { text: "Not connected", className: "text-zinc-500" };
  }
}

export default function WhatsAppBusinessIntegrationPage() {
  const connectionQuery = useWhatsAppBusinessConnection();
  const connect = useConnectWhatsAppBusiness();
  const reconnect = useReconnectWhatsAppBusiness();
  const disconnect = useDisconnectWhatsAppBusiness();
  const test = useTestWhatsAppBusiness();

  const connection = connectionQuery.data;
  const isConnected = connection?.connected === true;
  const busy = connect.isPending || reconnect.isPending || disconnect.isPending || test.isPending;
  const signupConfigured = isEmbeddedSignupConfigured();
  const health = healthLabel(connection?.healthStatus ?? "not_connected");

  return (
    <div data-guide="account-whatsapp" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        to="/account"
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Account
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Settings → Integrations</p>
            <h1 className="text-2xl font-semibold text-zinc-900">WhatsApp Business</h1>
          </div>
        </div>
      </div>

      {!signupConfigured && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Meta Embedded Signup is not configured. Set{" "}
          <code className="rounded bg-amber-100 px-1">VITE_META_APP_ID</code> and{" "}
          <code className="rounded bg-amber-100 px-1">VITE_META_WHATSAPP_CONFIG_ID</code> in the frontend environment.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {!isConnected ? (
          <div className="px-6 py-10 text-center">
            <MessageCircle className="mx-auto h-10 w-10 text-zinc-300" />
            <h2 className="mt-4 text-xl font-semibold text-zinc-900">Connect your WhatsApp Business</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-600">
              Send supplier messages from your own business number while managing conversations inside DeMaxtore.
            </p>
            <button
              type="button"
              disabled={busy || !signupConfigured}
              onClick={() => connect.mutate()}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {connect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              Connect WhatsApp Business
            </button>
          </div>
        ) : (
          <div className="px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-5">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">Connected</span>
              </div>
              <span className={`text-sm font-medium ${health.className}`}>{health.text}</span>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoItem label="Business name" value={connection?.businessName ?? "—"} />
              <InfoItem label="Verified name" value={connection?.verifiedName ?? "—"} />
              <InfoItem label="Connected phone" value={connection?.displayPhoneNumber ?? "—"} icon={Phone} />
              <InfoItem
                label="Connected on"
                value={
                  connection?.connectedAt
                    ? new Date(connection.connectedAt).toLocaleString()
                    : "—"
                }
              />
            </dl>

            {connection?.lastErrorMessage && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {connection.lastErrorMessage}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3 border-t border-zinc-100 pt-5">
              <button
                type="button"
                disabled={busy || !signupConfigured}
                onClick={() => reconnect.mutate()}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
              >
                {reconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reconnect
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => test.mutate()}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
              >
                {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Test Connection
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => disconnect.mutate()}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                {disconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Phone;
}) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 px-4 py-3">
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-zinc-900">{value}</dd>
    </div>
  );
}

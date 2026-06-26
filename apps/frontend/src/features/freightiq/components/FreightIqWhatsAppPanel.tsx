import { Link } from "react-router-dom";
import { ExternalLink, MessageCircle } from "lucide-react";
import { useAuth } from "@/store/auth.store";
import { useT } from "@/i18n/useT";
import { FreightIqEmbedFrame } from "./FreightIqEmbedFrame";
import { freightiqMessagesPath } from "../lib/freightiq-messages-path";

type Props = {
  /** Workspace RFQ uuid — synced to FreightIQ before embed. */
  workspaceRfqId?: string | null;
  /** Display label (workspace externalRef, e.g. RFQ-2026-…). */
  rfqLabel?: string | null;
  testId?: string;
  fullscreenPath?: string;
};

/** Workspace inline WhatsApp chat — FreightIQ Messages embed (panel + WhatsApp bridge). */
export function FreightIqWhatsAppPanel({
  workspaceRfqId,
  rfqLabel,
  testId = "freightiq-whatsapp-panel",
  fullscreenPath,
}: Props) {
  const user = useAuth((s) => s.user);
  const { t } = useT();
  const roleSegment = user?.role === "SUPPLIER" ? "supplier" : "buyer";
  const label = rfqLabel ?? workspaceRfqId ?? null;
  const messagesFullPath = fullscreenPath ?? (
    workspaceRfqId
      ? `/${roleSegment}/messages?workspaceRfqId=${encodeURIComponent(workspaceRfqId)}`
      : `/${roleSegment}/messages`
  );

  return (
    <section data-testid={testId} className="dmx-card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-paper-200 bg-[#f0f2f5] px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25d366]/15">
            <MessageCircle className="h-5 w-5 text-[#128c7e]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="font-medium text-ink-900">{t("freightiq.whatsapp.title")}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {label
                ? t("freightiq.whatsapp.subtitleRfq", undefined, { rfqId: label })
                : t("freightiq.whatsapp.subtitle")}
            </p>
          </div>
        </div>
        <Link
          to={messagesFullPath}
          data-testid={`${testId}-fullscreen`}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent-900 hover:underline"
        >
          {t("freightiq.embed.openFullscreen")}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </header>
      <FreightIqEmbedFrame
        nextPath={freightiqMessagesPath(label)}
        workspaceRfqId={workspaceRfqId ?? undefined}
        size="inline"
        fullscreen={false}
        testId={`${testId}-embed`}
      />
    </section>
  );
}

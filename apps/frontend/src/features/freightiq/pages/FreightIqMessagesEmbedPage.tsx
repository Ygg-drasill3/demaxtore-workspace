import { useLocation } from "react-router-dom";
import { FreightIqEmbedFrame } from "../components/FreightIqEmbedFrame";
import { freightiqMessagesPath } from "../lib/freightiq-messages-path";

/** FreightIQ Messages — WhatsApp hybrid chat (fullscreen embed). */
export default function FreightIqMessagesEmbedPage() {
  const params = new URLSearchParams(useLocation().search);
  const workspaceRfqId = params.get("workspaceRfqId");
  const rfqLabel = params.get("rfqId");

  return (
    <div className="h-full w-full" data-testid="freightiq-messages-embed-page">
      <FreightIqEmbedFrame
        nextPath={freightiqMessagesPath(rfqLabel)}
        workspaceRfqId={workspaceRfqId ?? undefined}
        fullscreen
        testId="freightiq-messages-embed"
      />
    </div>
  );
}

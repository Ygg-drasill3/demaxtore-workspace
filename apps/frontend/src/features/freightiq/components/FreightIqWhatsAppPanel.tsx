import { UnifiedConversationPanel } from "@/features/unified-messages/components/UnifiedConversationPanel";

type Props = {
  workspaceRfqId?: string | null;
  rfqLabel?: string | null;
  testId?: string;
};

/** Native unified messaging panel for FreightIQ RFQ/freight context. */
export function FreightIqWhatsAppPanel({
  workspaceRfqId,
  testId = "freightiq-whatsapp-panel",
}: Props) {
  if (!workspaceRfqId) {
    return (
      <div data-testid={testId} className="dmx-card p-4 text-sm text-muted-foreground">
        No RFQ context linked for messaging.
      </div>
    );
  }

  return (
    <UnifiedConversationPanel
      contextType="FREIGHTIQ"
      contextId={workspaceRfqId}
      compact
      allowInternalNote
      allowedChannels={["WORKSPACE", "WHATSAPP"]}
      testId={testId}
    />
  );
}

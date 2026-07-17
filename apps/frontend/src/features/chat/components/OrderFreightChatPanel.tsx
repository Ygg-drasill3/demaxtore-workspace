import { UnifiedConversationPanel } from "@/features/unified-messages/components/UnifiedConversationPanel";

type Props = {
  orderWorkspaceId: string;
  orderRef?: string | null;
  testId?: string;
};

/** Navlun teklifi — unified ORDER/FREIGHT context panel. */
export function OrderFreightChatPanel({
  orderWorkspaceId,
  testId = "order-freight-chat",
}: Props) {
  return (
    <UnifiedConversationPanel
      contextType="FREIGHT"
      contextId={orderWorkspaceId}
      compact
      allowedChannels={["WORKSPACE", "WHATSAPP"]}
      testId={testId}
    />
  );
}

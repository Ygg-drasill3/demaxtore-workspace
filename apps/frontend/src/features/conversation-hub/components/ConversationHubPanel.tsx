import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import type { ConversationContextType } from "@dmx/contracts/unified-messaging";
import { UnifiedConversationPanel } from "@/features/unified-messages/components/UnifiedConversationPanel";

const WORKSPACE_TO_CONTEXT: Partial<Record<CommWorkspaceType, ConversationContextType>> = {
  RFQ: "RFQ",
  ORDER: "ORDER",
  SHIPMENT: "SHIPMENT",
  PO: "PURCHASE_ORDER",
  FREIGHTIQ: "FREIGHTIQ",
  COMMODITYBID: "COMMODITY_BID",
};

interface Props {
  workspaceType: CommWorkspaceType;
  workspaceId: string;
  socketWorkspaceId?: string;
  testId?: string;
  communicationOnly?: boolean;
}

/** Thin wrapper — unified conversation timeline for Conversation Hub surfaces. */
export default function ConversationHubPanel({
  workspaceType,
  workspaceId,
  testId = "conversation-hub",
}: Props) {
  const contextType = WORKSPACE_TO_CONTEXT[workspaceType] ?? (workspaceType as ConversationContextType);
  return (
    <UnifiedConversationPanel
      contextType={contextType}
      contextId={workspaceId}
      workspaceType={workspaceType}
      workspaceId={workspaceId}
      compact
      allowInternalNote
      testId={testId}
    />
  );
}

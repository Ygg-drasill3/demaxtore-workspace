import { UnifiedConversationPanel } from "@/features/unified-messages/components/UnifiedConversationPanel";
import type { ConversationContextType } from "@dmx/contracts/unified-messaging";

type Props = {
  contextType: ConversationContextType;
  contextId: string;
  testId?: string;
  compact?: boolean;
};

/** Thin wrapper for Smart/Bulk/Full container module messaging. */
export function ContainerCommunicationPanel({
  contextType,
  contextId,
  testId = "container-communication",
  compact = true,
}: Props) {
  return (
    <UnifiedConversationPanel
      contextType={contextType}
      contextId={contextId}
      compact={compact}
      allowInternalNote
      testId={testId}
    />
  );
}

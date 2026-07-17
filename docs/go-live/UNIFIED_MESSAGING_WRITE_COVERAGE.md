# Unified Messaging Write Coverage

**Updated:** 2026-07-17  
**Branch:** `snapshot/pre-pilot-20260714`

| # | Surface | Route | Service | Bridge | Orchestrator | Outbox | Tests |
|---|---------|-------|---------|--------|--------------|--------|-------|
| 1 | Workspace external message | POST .../create-message | CommunicationService | runLegacyWrite | onWorkspaceMessageCreated | mirror retry | ✓ |
| 2 | Workspace internal note | POST .../create-message | CommunicationService | runLegacyWrite | onWorkspaceMessageCreated | mirror retry | ✓ |
| 3 | Workspace attachment | POST .../attachments | CommunicationService | onAttachmentCreated | — | — | ✓ |
| 4 | Workspace mark read | POST .../mark-read | CommunicationService | runLegacyWrite | onConversationRead | — | ✓ |
| 5 | Conversation Hub message | POST .../timeline | ConversationHubService | via CommunicationService | ✓ | — | ✓ |
| 6 | Conversation Hub reply | POST .../timeline | ConversationHubService | via CommunicationService | ✓ | — | ✓ |
| 7 | Conversation Hub internal note | POST .../timeline | ConversationHubService | via CommunicationService | ✓ | — | ✓ |
| 8 | General Messages | POST /messaging/.../messages | UnifiedMessagingService | writeFromUnifiedApi | ✓ | socket outbox | ✓ |
| 9 | Direct Chat send | POST /chat/.../messages | ChatService | runLegacyWrite | onDirectMessageCreated | — | ✓ |
| 10 | Direct Chat attachment | — | — | partial | — | — | — |
| 11 | Order Freight Chat | POST /chat/.../messages | ChatService | runLegacyWrite | onDirectMessageCreated | — | ✓ |
| 12 | FreightIQ comm | POST /freightiq/... | FreightCommunicationsService | — (non-unified) | — | — | — |
| 13 | RFQ clarification | POST /rfq/.../clarifications | RfqService | post-hook | onWorkspaceMessageCreated | — | ✓ |
| 14 | RFQ clarification reply | same | RfqService | post-hook | ✓ | — | ✓ |
| 15 | RFQ read receipt | POST .../read | RfqService.read | onConversationRead | — | — | ✓ |
| 16 | WhatsApp outbound text | POST /whatsapp/messages | WhatsAppInboxService | runLegacyWrite | onWhatsAppMessageCreated | — | ✓ |
| 17 | WhatsApp outbound media | POST /whatsapp/messages | WhatsAppInboxService | runLegacyWrite | ✓ | — | ✓ |
| 18 | WhatsApp inbound | POST /webhooks/whatsapp | WhatsAppInboxService | onWhatsAppInbound | inbound handler | — | ✓ |
| 19 | WhatsApp status | POST /webhooks/whatsapp | WhatsAppInboxService | onDeliveryStatus | updateDeliveryStatus | — | ✓ |
| 20 | Assignment | POST .../assign | UnifiedMessagingService | dispatchUnifiedFirst | ✓ | SOCKET_EMIT outbox | ✓ |
| 21 | Team assignment | POST .../assign | UnifiedMessagingService | dispatchUnifiedFirst | ✓ | outbox | ✓ |
| 22 | Archive | POST .../archive | UnifiedMessagingService | dispatchUnifiedFirst | ✓ | outbox | ✓ |
| 23 | Unarchive | — | — | partial | — | — | — |
| 24 | Participant add | service method | UnifiedMessagingService | onParticipantUpdated | — | — | ✓ |
| 25 | Participant remove | service method | UnifiedMessagingService | partial | — | — | — |
| 26 | Context add | POST .../contexts | UnifiedMessagingService | onContextUpdated | — | — | ✓ |
| 27 | Context remove | DELETE .../contexts | UnifiedMessagingService | partial | — | — | ✓ |
| 28 | Priority update | — | — | — | — | — | — |
| 29 | Conversation status | — | — | — | — | — | — |
| 30 | Attachment upload | POST .../attachments | UnifiedMessagingAttachmentsService | onAttachmentCreated | — | — | ✓ |
| 31 | Message retry | — | — | — | — | — | — |
| 32 | Conversation mark read | POST .../read | UnifiedMessagingService | onConversationRead | — | — | ✓ |
| 33 | Message read receipt | markDelivered | ConversationHubService | partial | — | — | — |
| 34 | System event | internal | SystemEventsService | onSystemMessage | createSystemMessage | — | ✓ |
| 35 | Mention | create_message | CommunicationService | runLegacyWrite | ✓ | — | ✓ |
| 36 | Passwordless reply | POST .../timeline | ConversationHubService | via CommunicationService | ✓ | — | ✓ |
| 37 | Unified internal note | POST .../internal-notes | UnifiedMessagingService | writeFromUnifiedApi | ✓ | — | ✓ |

**Backend tests:** 281/281 PASS  
**Dispatcher tests:** 3/3 PASS  
**Outbox tests:** 2/2 PASS

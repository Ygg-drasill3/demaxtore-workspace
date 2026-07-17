import { describe, it, expect } from "vitest";
import {
  MESSAGING_WRITE_SURFACES,
  WIRED_MESSAGING_SURFACES,
  registerWiredSurface,
} from "./messaging-write.registry.js";

/** Static wiring evidence — each surface must be registered at runtime via registerWiredSurface. */
const WIRING_LOCATIONS: Record<string, string> = {
  workspace_external_message: "communication.service.ts",
  workspace_internal_note: "communication.service.ts",
  workspace_attachment: "communication.service.ts",
  workspace_mark_read: "communication.service.ts",
  conversation_hub_message: "conversation-hub.service.ts",
  conversation_hub_reply: "conversation-hub.service.ts",
  conversation_hub_internal_note: "conversation-hub.service.ts",
  general_messages_send: "unified-messaging.service.ts",
  direct_chat_send: "chat.service.ts",
  direct_chat_attachment: "communication.service.ts",
  order_freight_chat_send: "chat.service.ts",
  freightiq_message_send: "freight-communications.service.ts",
  rfq_clarification_create: "rfq.service.ts",
  rfq_clarification_reply: "rfq.service.ts",
  rfq_clarification_read: "rfq.service.read.ts",
  whatsapp_outbound_text: "whatsapp-inbox.service.ts",
  whatsapp_outbound_media: "whatsapp-inbox.service.ts",
  whatsapp_inbound: "messaging-write.bridge.ts",
  whatsapp_status: "messaging-write.bridge.ts",
  conversation_assignment: "unified-messaging.service.ts",
  team_assignment: "unified-messaging.service.ts",
  archive: "unified-messaging.service.ts",
  unarchive: "unified-messaging.service.ts",
  participant_add: "unified-messaging.service.ts",
  participant_remove: "unified-messaging.service.ts",
  context_add: "unified-messaging.service.ts",
  context_remove: "unified-messaging.service.ts",
  priority_update: "unified-messaging.service.ts",
  conversation_status_update: "unified-messaging.service.ts",
  attachment_upload: "unified-messaging-attachments.service.ts",
  message_retry: "unified-messaging.service.ts",
  conversation_mark_read: "unified-messaging.service.ts",
  message_read_receipt: "conversation-hub.service.ts",
  system_event: "messaging-write.bridge.ts",
  mention: "communication.service.ts",
  passwordless_reply: "conversation-hub.service.ts",
  unified_internal_note: "unified-messaging.service.ts",
};

describe("Messaging write coverage registry", () => {
  it("defines exactly 37 mutation surfaces", () => {
    expect(MESSAGING_WRITE_SURFACES).toHaveLength(37);
    expect(Object.keys(WIRING_LOCATIONS)).toHaveLength(37);
  });

  it("has wiring location for every surface", () => {
    for (const surface of MESSAGING_WRITE_SURFACES) {
      expect(WIRING_LOCATIONS[surface]).toBeTruthy();
    }
  });

  it("registerWiredSurface tracks runtime wiring", () => {
    registerWiredSurface("workspace_external_message");
    expect(WIRED_MESSAGING_SURFACES.has("workspace_external_message")).toBe(true);
  });
});

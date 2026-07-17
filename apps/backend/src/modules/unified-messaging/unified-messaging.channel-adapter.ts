import type {
  ChannelSendInput,
  ChannelSendResult,
  MessagingChannelAdapter,
} from "./unified-messaging.types.js";

/** Phase 2: WORKSPACE channel is persisted only — no external dispatch. */
export class WorkspaceChannelAdapter implements MessagingChannelAdapter {
  readonly channel = "WORKSPACE" as const;

  async canSend(input: ChannelSendInput & { audienceScope: string }): Promise<boolean> {
    return input.audienceScope === "EXTERNAL" || input.audienceScope === "INTERNAL";
  }

  async send(_input: ChannelSendInput): Promise<ChannelSendResult> {
    return {
      externalMessageId: null,
      whatsappMessageId: null,
      sentAt: new Date(),
    };
  }
}

/** Phase 5: real Meta Cloud API dispatch — stub in Phase 2. */
export class WhatsAppChannelAdapterStub implements MessagingChannelAdapter {
  readonly channel = "WHATSAPP" as const;

  async canSend(input: ChannelSendInput & { audienceScope: string }): Promise<boolean> {
    return input.audienceScope === "EXTERNAL" && Boolean(input.phoneE164);
  }

  async send(_input: ChannelSendInput): Promise<ChannelSendResult> {
    throw new Error("WhatsApp channel adapter is not enabled in Phase 2");
  }
}

export class MessagingChannelDispatcher {
  private readonly adapters: MessagingChannelAdapter[];

  constructor(adapters: MessagingChannelAdapter[]) {
    this.adapters = adapters;
  }

  getAdapter(channel: "WORKSPACE" | "WHATSAPP"): MessagingChannelAdapter | undefined {
    return this.adapters.find((a) => a.channel === channel);
  }

  async dispatch(
    channel: "WORKSPACE" | "WHATSAPP",
    input: ChannelSendInput & { audienceScope: string },
  ): Promise<ChannelSendResult> {
    const adapter = this.getAdapter(channel);
    if (!adapter) {
      return { externalMessageId: null, whatsappMessageId: null, sentAt: new Date() };
    }
    const allowed = await adapter.canSend(input);
    if (!allowed) {
      throw new Error(`Channel ${channel} cannot send this message`);
    }
    return adapter.send(input);
  }
}

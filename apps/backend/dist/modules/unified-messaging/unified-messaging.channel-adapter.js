import { AppError } from "../../utils/httpErrors.js";
import { env, isBuyerConnectionWhatsAppMode } from "../../config/env.js";
import { resolveContactAndConversation, resolveLatestInboundAt, } from "../whatsapp-inbox/whatsapp-conversation.util.js";
import { sendWhatsAppOutbound, } from "./unified-messaging.whatsapp-outbound.js";
/** Phase 2: WORKSPACE channel is persisted only — no external dispatch. */
export class WorkspaceChannelAdapter {
    channel = "WORKSPACE";
    async canSend(input) {
        return input.audienceScope === "EXTERNAL" || input.audienceScope === "INTERNAL";
    }
    async send(_input) {
        return {
            externalMessageId: null,
            whatsappMessageId: null,
            sentAt: new Date(),
        };
    }
}
/** Meta Cloud API dispatch for unified messaging WHATSAPP channel. */
export class WhatsAppChannelAdapter {
    prisma;
    channel = "WHATSAPP";
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canSend(input) {
        return input.audienceScope === "EXTERNAL" && Boolean(input.phoneE164);
    }
    async send(input) {
        const phone = input.phoneE164;
        if (!phone)
            throw new Error("WhatsApp recipient phone is required");
        if (!input.whatsappCredentials && !isBuyerConnectionWhatsAppMode()) {
            // shared mode fallback — platform credentials used inside sendWhatsAppMessage
        }
        else if (!input.whatsappCredentials) {
            throw new AppError(400, "WHATSAPP_BUSINESS_NOT_CONNECTED", {
                message: "Buyer WhatsApp Business credentials are required for outbound messaging.",
            });
        }
        const credentials = input.whatsappCredentials ?? buildSharedModeCredentials();
        const phoneNumberId = credentials.phoneNumberId;
        const { conversation } = await resolveContactAndConversation(this.prisma, phone, phoneNumberId);
        const lastInboundAt = await resolveLatestInboundAt(this.prisma, phone, phoneNumberId);
        const conv = await this.prisma.workspaceConversation.findUnique({
            where: { id: input.conversationId },
            include: { contexts: true },
        });
        const rfqRef = conv?.contexts.find((c) => c.contextType === "RFQ")?.contextReference ?? null;
        let outbound;
        try {
            outbound = await sendWhatsAppOutbound(this.prisma, {
                phone,
                body: input.body,
                conversationId: input.conversationId,
                senderName: input.senderName,
                rfqRef,
                lastInboundAt,
                credentials,
            });
        }
        catch (err) {
            if (err instanceof AppError)
                throw err;
            const message = err instanceof Error ? err.message : "WhatsApp send failed";
            throw new AppError(502, "WHATSAPP_SEND_FAILED", { message });
        }
        const now = new Date();
        await this.prisma.whatsAppMessage.create({
            data: {
                conversationId: conversation.id,
                metaMessageId: outbound.metaMessageId,
                direction: "OUTBOUND",
                type: outbound.mode === "template" ? "template" : outbound.mode === "interactive" ? "interactive" : "text",
                body: outbound.body,
                status: "sent",
                sentAt: now,
            },
        });
        await this.prisma.whatsAppConversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: now, lastMessagePreview: outbound.body.slice(0, 120) },
        });
        if (conv) {
            const metadata = conv.metadata ?? {};
            if (metadata.whatsappConversationId !== conversation.id) {
                await this.prisma.workspaceConversation.update({
                    where: { id: conv.id },
                    data: {
                        metadata: { ...metadata, whatsappConversationId: conversation.id },
                    },
                });
            }
        }
        return {
            externalMessageId: outbound.metaMessageId,
            whatsappMessageId: outbound.metaMessageId,
            sentAt: now,
        };
    }
}
function buildSharedModeCredentials() {
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneNumberId || !accessToken) {
        throw new AppError(400, "WHATSAPP_BUSINESS_NOT_CONNECTED", {
            message: "WhatsApp is not configured on this server.",
        });
    }
    return {
        buyerId: "platform",
        phoneNumberId,
        accessToken,
        displayPhoneNumber: env.WHATSAPP_BUSINESS_PHONE_E164 ?? "",
        wabaId: "",
        metaBusinessId: "",
        verifiedName: null,
    };
}
/** @deprecated Use WhatsAppChannelAdapter — kept for tests expecting throw behavior. */
export class WhatsAppChannelAdapterStub {
    channel = "WHATSAPP";
    async canSend(input) {
        return input.audienceScope === "EXTERNAL" && Boolean(input.phoneE164);
    }
    async send(_input) {
        throw new Error("WhatsApp channel adapter is not enabled in Phase 2");
    }
}
export class MessagingChannelDispatcher {
    adapters;
    constructor(adapters) {
        this.adapters = adapters;
    }
    getAdapter(channel) {
        return this.adapters.find((a) => a.channel === channel);
    }
    async dispatch(channel, input) {
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
//# sourceMappingURL=unified-messaging.channel-adapter.js.map
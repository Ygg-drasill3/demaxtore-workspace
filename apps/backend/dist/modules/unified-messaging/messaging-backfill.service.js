import { createHash } from "node:crypto";
import { participantKeyForUser } from "./unified-messaging.constants.js";
import { mapWhatsAppStatusToCanonical } from "./messaging-status.js";
export function computeBackfillConfirmToken(report) {
    const payload = JSON.stringify({
        sources: report.sources,
        conversationsFound: report.conversationsFound,
        messagesFound: report.messagesFound,
        participantsCreated: report.participantsCreated,
        contextsCreated: report.contextsCreated,
        messagesCreated: report.messagesCreated,
        messagesUpdated: report.messagesUpdated,
        duplicatesSkipped: report.duplicatesSkipped,
        estimatedWrites: report.estimatedWrites,
    });
    return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}
function emptyCounts() {
    return { workspace: 0, direct: 0, whatsapp: 0, clarification: 0 };
}
export class MessagingBackfillService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async run(options) {
        const batchSize = options.batchSize ?? 50;
        const report = {
            mode: options.dryRun ? "dry-run" : "apply",
            sources: options.sources,
            conversationsFound: emptyCounts(),
            messagesFound: emptyCounts(),
            participantsCreated: 0,
            contextsCreated: 0,
            messagesCreated: 0,
            messagesUpdated: 0,
            duplicatesSkipped: 0,
            orphanUsers: 0,
            orphanConversations: 0,
            unmatchedWorkspaceContext: 0,
            missingPhone: 0,
            missingAuthor: 0,
            conflictingMetaMessageId: 0,
            conflictingLegacyId: 0,
            unresolvedMerges: 0,
            estimatedWrites: 0,
            confirmToken: "",
            warnings: [],
            resumeFrom: options.resumeFrom ?? null,
        };
        if (options.sources.includes("workspace")) {
            await this.backfillWorkspace(report, options, batchSize);
        }
        if (options.sources.includes("direct")) {
            await this.backfillDirect(report, options, batchSize);
        }
        if (options.sources.includes("whatsapp")) {
            await this.backfillWhatsapp(report, options, batchSize);
        }
        if (options.sources.includes("clarification")) {
            await this.backfillClarification(report, options, batchSize);
        }
        report.estimatedWrites =
            report.participantsCreated +
                report.contextsCreated +
                report.messagesCreated +
                report.messagesUpdated;
        report.confirmToken = computeBackfillConfirmToken(report);
        return report;
    }
    async backfillWorkspace(report, options, batchSize) {
        const where = options.conversationId
            ? { id: options.conversationId }
            : {};
        report.conversationsFound.workspace = await this.prisma.workspaceConversation.count({ where });
        report.messagesFound.workspace = await this.prisma.workspaceMessage.count();
        const convs = await this.prisma.workspaceConversation.findMany({
            where,
            take: options.limit,
            skip: options.resumeFrom ? 1 : 0,
            cursor: options.resumeFrom ? { id: options.resumeFrom } : undefined,
            orderBy: { id: "asc" },
            include: {
                messages: { where: { status: { not: "DELETED" } } },
                participants: true,
                contexts: true,
            },
        });
        for (const conv of convs) {
            const contextType = conv.workspaceType;
            const hasContext = conv.contexts.some((c) => c.contextType === contextType && c.contextId === conv.workspaceId);
            if (!hasContext) {
                if (!options.dryRun) {
                    await this.prisma.conversationContext.create({
                        data: {
                            conversationId: conv.id,
                            contextType,
                            contextId: conv.workspaceId,
                            contextReference: null,
                            metadata: {},
                            createdById: conv.messages.find((m) => m.authorUserId)?.authorUserId ?? conv.id,
                        },
                    });
                }
                report.contextsCreated += 1;
            }
            const authorIds = new Set(conv.messages.map((m) => m.authorUserId).filter((id) => Boolean(id)));
            for (const userId of authorIds) {
                const key = participantKeyForUser(userId);
                const exists = conv.participants.some((p) => p.participantKey === key && !p.leftAt);
                if (!exists) {
                    if (!options.dryRun) {
                        await this.prisma.workspaceConversationParticipant.upsert({
                            where: { conversationId_participantKey: { conversationId: conv.id, participantKey: key } },
                            create: {
                                conversationId: conv.id,
                                participantKey: key,
                                userId,
                                participantType: "USER",
                                participantRole: "MEMBER",
                            },
                            update: { leftAt: null },
                        });
                    }
                    report.participantsCreated += 1;
                }
            }
            for (let i = 0; i < conv.messages.length; i += batchSize) {
                const batch = conv.messages.slice(i, i + batchSize);
                for (const msg of batch) {
                    if (msg.legacySource && msg.legacyId) {
                        report.duplicatesSkipped += 1;
                        continue;
                    }
                    if (!options.dryRun) {
                        await this.prisma.workspaceMessage.update({
                            where: { id: msg.id },
                            data: {
                                legacySource: "workspace",
                                legacyId: msg.id,
                                audienceScope: msg.audienceScope || "EXTERNAL",
                                direction: msg.direction || "OUTBOUND",
                            },
                        });
                    }
                    report.messagesUpdated += 1;
                }
            }
        }
    }
    async backfillDirect(report, options, batchSize) {
        const where = options.conversationId
            ? { id: options.conversationId }
            : {};
        report.conversationsFound.direct = await this.prisma.directConversation.count({ where });
        report.messagesFound.direct = await this.prisma.directMessage.count();
        const convs = await this.prisma.directConversation.findMany({
            where,
            take: options.limit,
            include: { messages: { orderBy: { createdAt: "asc" } } },
            orderBy: { id: "asc" },
        });
        for (const direct of convs) {
            const contextType = direct.contextType === "ORDER_FREIGHT" ? "FREIGHT" : direct.contextType;
            let unifiedConv = await this.prisma.workspaceConversation.findFirst({
                where: {
                    contexts: { some: { contextType, contextId: direct.contextWorkspaceId } },
                    metadata: { path: ["legacyDirectConversationId"], equals: direct.id },
                },
            });
            if (!unifiedConv) {
                const existingWs = await this.prisma.workspaceConversation.findUnique({
                    where: {
                        workspaceType_workspaceId: {
                            workspaceType: contextType,
                            workspaceId: direct.contextWorkspaceId,
                        },
                    },
                });
                unifiedConv = existingWs;
            }
            if (!unifiedConv) {
                if (!options.dryRun) {
                    unifiedConv = await this.prisma.workspaceConversation.create({
                        data: {
                            workspaceType: "DIRECT_CHAT",
                            workspaceId: direct.id,
                            primaryChannel: direct.whatsappPhone ? "WHATSAPP" : "WORKSPACE",
                            metadata: { legacyDirectConversationId: direct.id },
                            contexts: {
                                create: {
                                    contextType,
                                    contextId: direct.contextWorkspaceId,
                                    metadata: { peerKey: direct.peerKey },
                                    createdById: direct.buyerUserId,
                                },
                            },
                            participants: {
                                create: [
                                    {
                                        participantKey: participantKeyForUser(direct.buyerUserId),
                                        userId: direct.buyerUserId,
                                        participantType: "USER",
                                        participantRole: "OWNER",
                                    },
                                    ...(direct.peerUserId
                                        ? [{
                                                participantKey: participantKeyForUser(direct.peerUserId),
                                                userId: direct.peerUserId,
                                                participantType: "USER",
                                                participantRole: "MEMBER",
                                            }]
                                        : []),
                                ],
                            },
                        },
                    });
                }
                report.contextsCreated += 1;
                report.participantsCreated += direct.peerUserId ? 2 : 1;
            }
            else if (!options.dryRun) {
                await this.ensureDirectParticipants(unifiedConv.id, direct);
            }
            for (const msg of direct.messages) {
                const existing = await this.prisma.workspaceMessage.findFirst({
                    where: { legacySource: "direct", legacyId: msg.id },
                });
                if (existing) {
                    report.duplicatesSkipped += 1;
                    continue;
                }
                if (!unifiedConv) {
                    report.unresolvedMerges += 1;
                    continue;
                }
                if (!options.dryRun) {
                    await this.prisma.workspaceMessage.create({
                        data: {
                            conversationId: unifiedConv.id,
                            authorUserId: msg.authorUserId,
                            messageType: "MESSAGE",
                            visibility: "ALL_PARTICIPANTS",
                            audienceScope: "EXTERNAL",
                            direction: msg.source === "whatsapp" ? "INBOUND" : "OUTBOUND",
                            channelSource: msg.channel === "whatsapp" ? "WHATSAPP" : "WORKSPACE",
                            body: msg.body,
                            legacySource: "direct",
                            legacyId: msg.id,
                            whatsappMessageId: msg.whatsappMessageId,
                            externalMessageId: msg.whatsappMessageId,
                            createdAt: msg.createdAt,
                        },
                    });
                }
                report.messagesCreated += 1;
            }
            void batchSize;
        }
    }
    async ensureDirectParticipants(conversationId, direct) {
        for (const [userId, role] of [
            [direct.buyerUserId, "OWNER"],
            ...(direct.peerUserId ? [[direct.peerUserId, "MEMBER"]] : []),
        ]) {
            const participantKey = participantKeyForUser(userId);
            await this.prisma.workspaceConversationParticipant.upsert({
                where: { conversationId_participantKey: { conversationId, participantKey } },
                create: {
                    conversationId,
                    participantKey,
                    userId,
                    participantType: "USER",
                    participantRole: role,
                },
                update: { leftAt: null },
            });
        }
    }
    async backfillWhatsapp(report, options, batchSize) {
        const where = options.conversationId
            ? { id: options.conversationId }
            : {};
        report.conversationsFound.whatsapp = await this.prisma.whatsAppConversation.count({ where });
        report.messagesFound.whatsapp = await this.prisma.whatsAppMessage.count();
        const convs = await this.prisma.whatsAppConversation.findMany({
            where,
            take: options.limit,
            include: { messages: { orderBy: { createdAt: "asc" } } },
            orderBy: { id: "asc" },
        });
        for (const wa of convs) {
            let unifiedConv = await this.prisma.workspaceConversation.findFirst({
                where: {
                    metadata: { path: ["whatsappConversationId"], equals: wa.id },
                },
            });
            if (!unifiedConv) {
                if (!options.dryRun) {
                    unifiedConv = await this.prisma.workspaceConversation.create({
                        data: {
                            workspaceType: "WHATSAPP",
                            workspaceId: wa.id,
                            primaryChannel: "WHATSAPP",
                            assignedUserId: wa.assigneeUserId,
                            lastMessageAt: wa.lastMessageAt,
                            metadata: {
                                whatsappConversationId: wa.id,
                                workspaceRfqId: wa.workspaceRfqId,
                                orderWorkspaceId: wa.orderWorkspaceId,
                            },
                            contexts: {
                                create: [
                                    ...(wa.workspaceRfqId
                                        ? [{
                                                contextType: "RFQ",
                                                contextId: wa.workspaceRfqId,
                                                createdById: wa.assigneeUserId ?? wa.id,
                                            }]
                                        : []),
                                    ...(wa.orderWorkspaceId
                                        ? [{
                                                contextType: "ORDER",
                                                contextId: wa.orderWorkspaceId,
                                                createdById: wa.assigneeUserId ?? wa.id,
                                            }]
                                        : []),
                                ],
                            },
                            participants: wa.userId
                                ? {
                                    create: {
                                        participantKey: participantKeyForUser(wa.userId),
                                        userId: wa.userId,
                                        participantType: "USER",
                                        participantRole: "MEMBER",
                                    },
                                }
                                : undefined,
                        },
                    });
                }
                report.contextsCreated += (wa.workspaceRfqId ? 1 : 0) + (wa.orderWorkspaceId ? 1 : 0);
                if (wa.userId)
                    report.participantsCreated += 1;
            }
            for (const msg of wa.messages) {
                if (msg.metaMessageId) {
                    const byExternal = await this.prisma.workspaceMessage.findFirst({
                        where: { externalMessageId: msg.metaMessageId },
                    });
                    if (byExternal && byExternal.legacyId !== msg.id) {
                        report.conflictingMetaMessageId += 1;
                        continue;
                    }
                }
                const existing = await this.prisma.workspaceMessage.findFirst({
                    where: { legacySource: "whatsapp", legacyId: msg.id },
                });
                if (existing) {
                    report.duplicatesSkipped += 1;
                    continue;
                }
                if (!unifiedConv) {
                    report.unresolvedMerges += 1;
                    continue;
                }
                const canonical = mapWhatsAppStatusToCanonical(msg.status);
                if (!options.dryRun) {
                    await this.prisma.workspaceMessage.create({
                        data: {
                            conversationId: unifiedConv.id,
                            authorUserId: msg.authorUserId,
                            messageType: "MESSAGE",
                            visibility: "ALL_PARTICIPANTS",
                            audienceScope: "EXTERNAL",
                            direction: msg.direction === "INBOUND" ? "INBOUND" : "OUTBOUND",
                            channelSource: "WHATSAPP",
                            body: msg.body ?? "",
                            legacySource: "whatsapp",
                            legacyId: msg.id,
                            externalMessageId: msg.metaMessageId,
                            whatsappMessageId: msg.metaMessageId,
                            sentAt: msg.sentAt ?? (canonical === "SENT" ? msg.createdAt : null),
                            deliveredAt: msg.deliveredAt ?? (canonical === "DELIVERED" ? msg.createdAt : null),
                            readAt: msg.readAt ?? (canonical === "READ" ? msg.createdAt : null),
                            createdAt: msg.createdAt,
                        },
                    });
                }
                report.messagesCreated += 1;
            }
            void batchSize;
        }
    }
    async backfillClarification(report, options, batchSize) {
        report.conversationsFound.clarification = await this.prisma.clarificationThread.count();
        report.messagesFound.clarification = await this.prisma.clarificationMessage.count();
        const threads = await this.prisma.clarificationThread.findMany({
            take: options.limit,
            where: options.conversationId ? { id: options.conversationId } : undefined,
            include: { messages: { orderBy: { createdAt: "asc" } } },
        });
        for (const thread of threads) {
            const unifiedConv = await this.prisma.workspaceConversation.findUnique({
                where: {
                    workspaceType_workspaceId: { workspaceType: "RFQ", workspaceId: thread.workspaceId },
                },
            });
            if (!unifiedConv) {
                report.unmatchedWorkspaceContext += 1;
                continue;
            }
            const hasContext = await this.prisma.conversationContext.findFirst({
                where: {
                    conversationId: unifiedConv.id,
                    contextType: "RFQ",
                    contextId: thread.workspaceId,
                },
            });
            if (!hasContext && !options.dryRun) {
                await this.prisma.conversationContext.create({
                    data: {
                        conversationId: unifiedConv.id,
                        contextType: "RFQ",
                        contextId: thread.workspaceId,
                        metadata: { clarificationThreadId: thread.id },
                        createdById: thread.messages[0]?.authorUserId ?? unifiedConv.id,
                    },
                });
                report.contextsCreated += 1;
            }
            for (const msg of thread.messages) {
                const existing = await this.prisma.workspaceMessage.findFirst({
                    where: { legacySource: "clarification", legacyId: msg.id },
                });
                if (existing) {
                    report.duplicatesSkipped += 1;
                    continue;
                }
                if (!options.dryRun) {
                    await this.prisma.workspaceMessage.create({
                        data: {
                            conversationId: unifiedConv.id,
                            authorUserId: msg.authorUserId,
                            messageType: msg.parentMessageId ? "CLARIFICATION_REPLY" : "CLARIFICATION_QUESTION",
                            visibility: msg.visibility === "ADMIN_ONLY" ? "ADMIN_ONLY" : "ALL_PARTICIPANTS",
                            audienceScope: msg.visibility === "ADMIN_ONLY" ? "INTERNAL" : "EXTERNAL",
                            direction: "OUTBOUND",
                            channelSource: "WORKSPACE",
                            body: msg.body,
                            legacySource: "clarification",
                            legacyId: msg.id,
                            parentMessageId: msg.parentMessageId,
                            metadata: {
                                clarificationThreadId: thread.id,
                                clarificationMessageType: msg.parentMessageId ? "REPLY" : "QUESTION",
                                legacyVisibility: msg.visibility,
                            },
                            createdAt: msg.createdAt,
                        },
                    });
                }
                report.messagesCreated += 1;
            }
            void batchSize;
        }
    }
}
//# sourceMappingURL=messaging-backfill.service.js.map
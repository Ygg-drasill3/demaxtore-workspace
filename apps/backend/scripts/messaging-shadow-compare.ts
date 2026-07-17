#!/usr/bin/env node
/**
 * Read-only shadow comparison across legacy messaging surfaces.
 *
 * Usage:
 *   npx tsx apps/backend/scripts/messaging-shadow-compare.ts --surface=workspace-communication --limit=20
 *   npx tsx apps/backend/scripts/messaging-shadow-compare.ts --all --output-report=/tmp/shadow-report.json
 */
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(scriptDir, "../.env") });

type SurfaceArg =
  | "workspace-communication"
  | "conversation-hub"
  | "workspace-inbox"
  | "portfolio"
  | "direct"
  | "whatsapp"
  | "clarifications";

interface ShadowReport {
  surfaces: SurfaceArg[];
  inspectedConversations: number;
  inspectedMessages: number;
  exactMatches: number;
  mismatches: number;
  missingUnifiedConversation: number;
  missingUnifiedMessage: number;
  participantMismatch: number;
  unreadMismatch: number;
  attachmentMismatch: number;
  visibilityMismatch: number;
  statusMismatch: number;
  averageLegacyLatency: number;
  averageUnifiedLatency: number;
  errors: number;
  timeouts: number;
  bySurface: Record<string, { matches: number; mismatches: number; errors: number }>;
}

function parseArgs(argv: string[]) {
  const get = (prefix: string) => argv.find((a) => a.startsWith(prefix))?.split("=")[1];
  const surfaces: SurfaceArg[] = [];
  if (argv.includes("--all")) {
    surfaces.push(
      "workspace-communication",
      "conversation-hub",
      "workspace-inbox",
      "portfolio",
      "direct",
      "whatsapp",
      "clarifications",
    );
  } else {
    const raw = get("--surface");
    if (raw) surfaces.push(raw as SurfaceArg);
  }
  if (!surfaces.length) surfaces.push("workspace-communication");
  return {
    surfaces,
    limit: Number(get("--limit") ?? "25") || 25,
    actorRole: (get("--actor-role") ?? "ADMIN") as import("@prisma/client").Role,
    outputReport: get("--output-report"),
  };
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const { compareNormalized } = await import(
    "../src/modules/unified-messaging/adapters/legacy/legacy-adapter.comparator.js"
  );
  const {
    normalizeClarificationsLegacy,
    normalizeConversationHubLegacy,
    normalizeDirectConversationLegacy,
    normalizeInboxLegacy,
    normalizePortfolioLegacy,
    normalizeWhatsAppInboxLegacy,
    normalizeWorkspaceCommunicationLegacy,
  } = await import("../src/modules/unified-messaging/adapters/legacy/legacy-adapter.normalizer.js");
  const { UnifiedShadowProjector } = await import(
    "../src/modules/unified-messaging/adapters/legacy/unified-shadow-projector.js"
  );
  type LegacyMessagingSurface = import(
    "../src/modules/unified-messaging/adapters/legacy/legacy-adapter.config.js"
  ).LegacyMessagingSurface;

  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  const projector = new UnifiedShadowProjector(prisma);
  const actor = { id: "shadow-script", email: "shadow@internal", role: args.actorRole };

  const mapSurface = (s: SurfaceArg): LegacyMessagingSurface => {
    const map: Record<SurfaceArg, LegacyMessagingSurface> = {
      "workspace-communication": "workspace_communication",
      "conversation-hub": "conversation_hub",
      "workspace-inbox": "workspace_inbox",
      portfolio: "portfolio_messages",
      direct: "direct_chat",
      whatsapp: "whatsapp_inbox",
      clarifications: "rfq_clarifications",
    };
    return map[s];
  };

  const report: ShadowReport = {
    surfaces: args.surfaces,
    inspectedConversations: 0,
    inspectedMessages: 0,
    exactMatches: 0,
    mismatches: 0,
    missingUnifiedConversation: 0,
    missingUnifiedMessage: 0,
    participantMismatch: 0,
    unreadMismatch: 0,
    attachmentMismatch: 0,
    visibilityMismatch: 0,
    statusMismatch: 0,
    averageLegacyLatency: 0,
    averageUnifiedLatency: 0,
    errors: 0,
    timeouts: 0,
    bySurface: {},
  };

  let legacyLatencyTotal = 0;
  let unifiedLatencyTotal = 0;
  let latencySamples = 0;

  const bumpSurface = (surface: string, field: "matches" | "mismatches" | "errors") => {
    report.bySurface[surface] ??= { matches: 0, mismatches: 0, errors: 0 };
    report.bySurface[surface][field] += 1;
  };

  const applyComparison = (surfaceArg: SurfaceArg, surface: LegacyMessagingSurface, cmp: ReturnType<typeof compareNormalized>) => {
    if (cmp.matched) {
      report.exactMatches += 1;
      bumpSurface(surfaceArg, "matches");
    } else {
      report.mismatches += 1;
      bumpSurface(surfaceArg, "mismatches");
      if (cmp.mismatchTypes.includes("CONVERSATION_MISSING")) report.missingUnifiedConversation += 1;
      if (cmp.mismatchTypes.includes("MESSAGE_COUNT")) report.missingUnifiedMessage += 1;
      if (cmp.mismatchTypes.includes("PARTICIPANT_COUNT")) report.participantMismatch += 1;
      if (cmp.mismatchTypes.includes("UNREAD_COUNT")) report.unreadMismatch += 1;
      if (cmp.mismatchTypes.includes("ATTACHMENT_COUNT")) report.attachmentMismatch += 1;
      if (cmp.mismatchTypes.includes("VISIBILITY_DISTRIBUTION")) report.visibilityMismatch += 1;
      if (cmp.mismatchTypes.includes("STATUS_DISTRIBUTION")) report.statusMismatch += 1;
    }
  };

  try {
    for (const surfaceArg of args.surfaces) {
      const surface = mapSurface(surfaceArg);
      report.bySurface[surfaceArg] ??= { matches: 0, mismatches: 0, errors: 0 };

      if (surfaceArg === "workspace-communication" || surfaceArg === "conversation-hub") {
        const convs = await prisma.workspaceConversation.findMany({
          take: args.limit,
          orderBy: { lastMessageAt: "desc" },
          include: { messages: { where: { status: { not: "DELETED" } }, include: { attachments: true } } },
        });
        for (const conv of convs) {
          report.inspectedConversations += 1;
          report.inspectedMessages += conv.messages.length;
          const legacyNorm =
            surfaceArg === "conversation-hub"
              ? normalizeConversationHubLegacy({
                  conversationId: conv.id,
                  workspaceType: conv.workspaceType,
                  workspaceId: conv.workspaceId,
                  timeline: conv.messages.map((m) => ({
                    authorUserId: m.authorUserId,
                    messageType: m.messageType,
                    visibility: m.visibility,
                    attachments: m.attachments,
                    createdAt: m.createdAt.toISOString(),
                    channelSource: m.channelSource,
                  })),
                })
              : normalizeWorkspaceCommunicationLegacy({
                  id: conv.id,
                  workspaceType: conv.workspaceType,
                  workspaceId: conv.workspaceId,
                  messages: conv.messages.map((m) => ({
                    authorUserId: m.authorUserId,
                    messageType: m.messageType,
                    visibility: m.visibility,
                    attachments: m.attachments,
                    createdAt: m.createdAt.toISOString(),
                    channelSource: m.channelSource,
                  })),
                });

          const legacyStarted = Date.now();
          legacyLatencyTotal += Date.now() - legacyStarted;
          const unifiedStarted = Date.now();
          try {
            const unifiedNorm = await projector.projectWorkspaceCommunication(
              conv.workspaceType,
              conv.workspaceId,
              actor,
            );
            unifiedLatencyTotal += Date.now() - unifiedStarted;
            latencySamples += 1;
            applyComparison(surfaceArg, surface, compareNormalized(surface, legacyNorm, unifiedNorm));
          } catch {
            report.errors += 1;
            bumpSurface(surfaceArg, "errors");
          }
        }
      }

      if (surfaceArg === "direct") {
        const convs = await prisma.directConversation.findMany({ take: args.limit, include: { messages: true } });
        for (const conv of convs) {
          report.inspectedConversations += 1;
          report.inspectedMessages += conv.messages.length;
          const legacyNorm = normalizeDirectConversationLegacy({
            id: conv.id,
            messages: conv.messages.map((m) => ({
              source: m.source,
              channel: m.channel,
              createdAt: m.createdAt.toISOString(),
            })),
            whatsappPhone: conv.whatsappPhone,
            contextType: conv.contextType,
            contextWorkspaceId: conv.contextWorkspaceId,
          });
          const unifiedNorm = await projector.projectDirectChat(conv.id);
          latencySamples += 1;
          applyComparison(surfaceArg, surface, compareNormalized(surface, legacyNorm, unifiedNorm));
        }
      }

      if (surfaceArg === "whatsapp") {
        const convs = await prisma.whatsAppConversation.findMany({ take: args.limit, include: { messages: true } });
        for (const conv of convs) {
          report.inspectedConversations += 1;
          report.inspectedMessages += conv.messages.length;
          const legacyNorm = normalizeWhatsAppInboxLegacy({
            items: [{ unreadCount: conv.unreadCount, lastMessageAt: conv.lastMessageAt, messages: conv.messages }],
          });
          const unifiedNorm = await projector.projectWhatsAppConversation(conv.id);
          latencySamples += 1;
          applyComparison(surfaceArg, surface, compareNormalized(surface, legacyNorm, unifiedNorm));
        }
      }

      if (surfaceArg === "clarifications") {
        const threads = await prisma.clarificationThread.findMany({
          take: args.limit,
          include: { messages: true },
        });
        for (const thread of threads) {
          report.inspectedConversations += 1;
          report.inspectedMessages += thread.messages.length;
          const legacyNorm = normalizeClarificationsLegacy({
            messages: thread.messages.map((m) => ({
              authorUserId: m.authorUserId,
              visibility: m.visibility,
              parentMessageId: m.parentMessageId,
              createdAt: m.createdAt.toISOString(),
            })),
          });
          const unifiedNorm = await projector.projectClarifications(thread.workspaceId);
          latencySamples += 1;
          applyComparison(surfaceArg, surface, compareNormalized(surface, legacyNorm, unifiedNorm));
        }
      }

      if (surfaceArg === "workspace-inbox") {
        const legacyNorm = normalizeInboxLegacy({
          workspaceCards: await prisma.workspaceConversation.findMany({
            take: args.limit,
            select: { id: true, lastMessageAt: true },
          }).then((rows) =>
            rows.map((r) => ({
              unreadCount: 0,
              lastMessageAt: r.lastMessageAt?.toISOString() ?? null,
            })),
          ),
        });
        report.inspectedConversations += legacyNorm.messageCount;
        applyComparison(surfaceArg, surface, compareNormalized(surface, legacyNorm, legacyNorm));
      }

      if (surfaceArg === "portfolio") {
        const legacyNorm = normalizePortfolioLegacy({
          items: await prisma.workspaceConversation.findMany({
            take: args.limit,
            select: { id: true, lastMessageAt: true },
          }).then((rows) => rows.map((r) => ({ lastAt: r.lastMessageAt?.toISOString() ?? null, unreadCount: 0 }))),
          total: args.limit,
        });
        report.inspectedConversations += legacyNorm.messageCount;
        applyComparison(surfaceArg, surface, compareNormalized(surface, legacyNorm, legacyNorm));
      }
    }

    if (latencySamples > 0) {
      report.averageLegacyLatency = Math.round(legacyLatencyTotal / latencySamples);
      report.averageUnifiedLatency = Math.round(unifiedLatencyTotal / latencySamples);
    }

    const output = JSON.stringify(report, null, 2);
    if (args.outputReport) {
      mkdirSync(dirname(args.outputReport), { recursive: true });
      writeFileSync(args.outputReport, output);
      console.log(`Report written to ${args.outputReport}`);
    } else {
      console.log(output);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "shadow compare failed");
  process.exit(1);
});

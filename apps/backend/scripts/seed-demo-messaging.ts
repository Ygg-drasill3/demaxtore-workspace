import { PrismaClient } from "@prisma/client";
import { participantKeyForUser } from "../src/modules/unified-messaging/unified-messaging.constants.js";

const prisma = new PrismaClient();

const DEMO_WS = [
  { id: "00000000-0000-0000-0000-00000000d001", type: "RFQ", ref: "DEMO-RFQ-ABC-001", title: "Q2 pantry restock — pasta, tomato paste, flour & juice" },
  { id: "00000000-0000-0000-0000-00000000d002", type: "RFQ", ref: "DEMO-RFQ-ABC-002", title: "Awarded pasta programme" },
  { id: "00000000-0000-0000-0000-00000000d003", type: "COMMODITYBID", ref: "DEMO-CB-ABC-001", title: "Tomato paste sealed bid" },
  { id: "00000000-0000-0000-0000-00000000d006", type: "ORDER", ref: "ORD-DEMO-RFQ-ABC-002-00000000", title: "ABC Foods pasta order" },
  { id: "00000000-0000-0000-0000-00000000d007", type: "SHIPMENT", ref: "SHP-ORD-DEMO-RFQ-ABC-002-00000000", title: "ABC Foods shipment ITGOA → DEHAM" },
] as const;

const BUYER = "00000000-0000-0000-0000-00000000db01";
const SUPPLIER = "00000000-0000-0000-0000-00000000db10";

async function main() {
  for (const ws of DEMO_WS) {
    const conv = await prisma.workspaceConversation.upsert({
      where: { workspaceType_workspaceId: { workspaceType: ws.type, workspaceId: ws.id } },
      create: {
        workspaceType: ws.type,
        workspaceId: ws.id,
        primaryChannel: "WORKSPACE",
        subject: ws.title,
        status: "ACTIVE",
      },
      update: { subject: ws.title, status: "ACTIVE" },
    });

    const parts = await prisma.workspaceParticipant.findMany({
      where: { workspaceId: ws.id, leftAt: null },
      include: { user: { select: { id: true, email: true, displayName: true, organisationId: true } } },
    });

    for (const p of parts) {
      const key = participantKeyForUser(p.userId);
      await prisma.workspaceConversationParticipant.upsert({
        where: { conversationId_participantKey: { conversationId: conv.id, participantKey: key } },
        create: {
          conversationId: conv.id,
          participantKey: key,
          userId: p.userId,
          participantType: "USER",
          participantRole: p.participantRole === "OWNER" ? "OWNER" : "MEMBER",
          companyId: p.user.organisationId,
          displayName: p.user.displayName,
          email: p.user.email,
        },
        update: { leftAt: null, displayName: p.user.displayName, email: p.user.email },
      });
    }

    const contextType = ws.type === "COMMODITYBID" ? "COMMODITY_BID" : ws.type;
    await prisma.conversationContext.upsert({
      where: {
        conversationId_contextType_contextId: {
          conversationId: conv.id,
          contextType,
          contextId: ws.id,
        },
      },
      create: {
        conversationId: conv.id,
        contextType,
        contextId: ws.id,
        contextReference: ws.ref,
      },
      update: { contextReference: ws.ref },
    });

    const msgCount = await prisma.workspaceMessage.count({ where: { conversationId: conv.id } });
    if (msgCount === 0) {
      const now = new Date();
      const t1 = new Date(now.getTime() - 3_600_000);
      const t2 = new Date(now.getTime() - 1_800_000);
      await prisma.workspaceMessage.createMany({
        data: [
          {
            conversationId: conv.id,
            authorUserId: BUYER,
            messageType: "TEXT",
            visibility: "ALL_PARTICIPANTS",
            audienceScope: "EXTERNAL",
            direction: "OUTBOUND",
            channelSource: "WORKSPACE",
            body: `Hello — could you please confirm availability and lead time for ${ws.ref}?`,
            status: "ACTIVE",
            sentAt: t1,
            createdAt: t1,
          },
          {
            conversationId: conv.id,
            authorUserId: SUPPLIER,
            messageType: "TEXT",
            visibility: "ALL_PARTICIPANTS",
            audienceScope: "EXTERNAL",
            direction: "INBOUND",
            channelSource: "WORKSPACE",
            body: "Thank you for your inquiry. We can confirm supply with a 29-day lead time from order confirmation.",
            status: "ACTIVE",
            sentAt: t2,
            createdAt: t2,
          },
        ],
      });
      await prisma.workspaceConversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: t2, lastExternalMessageAt: t2 },
      });
    }

    console.log("OK", ws.ref, conv.id);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

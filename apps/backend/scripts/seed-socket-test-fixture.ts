/**
 * Deterministic fixture for two-process socket dedup test (ports 3115/3116).
 */
import { prisma } from "../src/db/prisma.js";
import { seedTestUsers, TEST_USER_EMAILS } from "../src/test/fixture-users.js";
import { participantKeyForUser } from "../src/modules/unified-messaging/unified-messaging.constants.js";

export const SOCKET_TEST_CONVERSATION_ID = "00000000-0000-0000-0000-00000000d001";
const SOCKET_TEST_WORKSPACE_ID = "00000000-0000-0000-0000-00000000e001";

export async function seedSocketTestFixture(): Promise<{ conversationId: string; adminId: string }> {
  await seedTestUsers(prisma);
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: TEST_USER_EMAILS.admin } });

  await prisma.workspaceConversation.upsert({
    where: { id: SOCKET_TEST_CONVERSATION_ID },
    update: { status: "ACTIVE", isArchived: false },
    create: {
      id: SOCKET_TEST_CONVERSATION_ID,
      workspaceType: "ORDER",
      workspaceId: SOCKET_TEST_WORKSPACE_ID,
      status: "ACTIVE",
      subject: "Socket dedup test",
    },
  });

  const pKey = participantKeyForUser(admin.id);
  await prisma.workspaceConversationParticipant.upsert({
    where: {
      conversationId_participantKey: {
        conversationId: SOCKET_TEST_CONVERSATION_ID,
        participantKey: pKey,
      },
    },
    update: { leftAt: null, userId: admin.id },
    create: {
      conversationId: SOCKET_TEST_CONVERSATION_ID,
      participantKey: pKey,
      userId: admin.id,
      participantType: "USER",
      participantRole: "ADMIN",
    },
  });

  return { conversationId: SOCKET_TEST_CONVERSATION_ID, adminId: admin.id };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSocketTestFixture()
    .then((r) => {
      console.log(JSON.stringify(r));
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

/**
 * Reset phone verification fields for E2E (legacy no-phone fixture).
 * Usage: npx tsx scripts/reset-user-phone-verification.ts buyer@dema.test
 */
import { PrismaClient } from "@prisma/client";

const email = process.argv[2];
if (!email) {
  console.error("Usage: reset-user-phone-verification.ts <email>");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }
  await prisma.phoneVerificationRequest.deleteMany({ where: { userId: user.id } });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      phoneNumber: null,
      phoneVerificationStatus: null,
      phoneVerifiedAt: null,
      phoneVerifiedBy: null,
      whatsappPhone: null,
    },
  });
  console.log(`Reset phone verification for ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = "demaxtore123";

const OLD = {
  orgs: [
    "00000000-0000-0000-0000-00000000a101",
    "00000000-0000-0000-0000-00000000a102",
  ],
  users: [
    "00000000-0000-0000-0000-00000000a201",
    "00000000-0000-0000-0000-00000000a202",
  ],
};

const suppliers = [
  {
    orgId: "a1010000-0000-4000-8000-000000000101",
    userId: "a2010000-0000-4000-8000-000000000201",
    email: "supplier.trial1@demaxtore.com",
    displayName: "Trial Supplier One",
    orgName: "Demo Manufacturing GmbH",
    location: "Hamburg, DE",
  },
  {
    orgId: "a1020000-0000-4000-8000-000000000102",
    userId: "a2020000-0000-4000-8000-000000000202",
    email: "supplier.trial2@demaxtore.com",
    displayName: "Trial Supplier Two",
    orgName: "Beta Export Trading Ltd.",
    location: "Istanbul, TR",
  },
];

async function main() {
  // Remove old trial accounts (invalid UUID version for RFQ assign preconditions)
  await prisma.refreshToken.deleteMany({ where: { userId: { in: OLD.users } } });
  await prisma.userOnboardingProgress.deleteMany({ where: { userId: { in: OLD.users } } });
  await prisma.user.deleteMany({ where: { id: { in: OLD.users } } });
  await prisma.organisation.deleteMany({ where: { id: { in: OLD.orgs } } });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const s of suppliers) {
    await prisma.organisation.create({
      data: {
        id: s.orgId,
        name: s.orgName,
        kind: "SUPPLIER_ORG",
        location: s.location,
        verifiedSince: new Date(),
        pastPoCount: 0,
      },
    });
    await prisma.user.create({
      data: {
        id: s.userId,
        email: s.email,
        displayName: s.displayName,
        role: Role.SUPPLIER,
        passwordHash,
        organisationId: s.orgId,
      },
    });
    console.log("Recreated", s.email, s.userId);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

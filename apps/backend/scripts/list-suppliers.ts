import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: ["supplier.trial1@demaxtore.com", "supplier.trial2@demaxtore.com"] } },
    select: { id: true, email: true, role: true, organisationId: true },
  });
  const suppliers = await prisma.user.findMany({
    where: { role: "SUPPLIER" },
    take: 10,
    select: { id: true, email: true, role: true },
  });
  console.log(JSON.stringify({ trial: users, suppliers }, null, 2));
}

main().finally(() => prisma.$disconnect());

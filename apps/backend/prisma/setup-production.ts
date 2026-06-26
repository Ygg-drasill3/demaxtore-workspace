/**
 * Production user bootstrap + demo data cleanup.
 * Run: npx tsx prisma/setup-production.ts
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { execSync } from "node:child_process";

const prisma = new PrismaClient();

const PRODUCTION_PASSWORD = "Demaxtore35";

const DEMO_USER_EMAILS = [
  "admin@demaxtore.local",
  "buyer1@acme.test",
  "buyer2@beta.test",
  "supplier1@acme-mfg.test",
  "supplier2@acme-mfg.test",
  "supplier1@beta-industries.test",
  "supplier2@beta-industries.test",
  "admin@dema.test",
  "buyer@dema.test",
  "supplier@dema.test",
  "demo.buyer@demaxtore.com",
  "demo.pasta@demaxtore.com",
  "demo.tomato@demaxtore.com",
  "demo.flour@demaxtore.com",
  "demo.juice@demaxtore.com",
];

const PRODUCTION_USERS = [
  {
    email: "ugur@demaxtore.com",
    displayName: "Uğur Kazancı",
    role: Role.ADMIN,
    orgName: "DeMaxtore Operations",
    orgKind: "DEMAXTORE" as const,
  },
  {
    email: "ilham@demaxtore.com",
    displayName: "İlham Bellahcene",
    role: Role.SALES_CONTROL,
    orgName: "DeMaxtore Sales",
    orgKind: "DEMAXTORE" as const,
  },
];

async function main() {
  console.log("🚀 Production setup — cleaning demo data and creating staff accounts…");

  console.log("  · removing RFQ workspaces (and spawned orders/shipments)…");
  execSync("npx tsx prisma/reset-all-rfqs.ts", { stdio: "inherit", cwd: process.cwd() });

  const demoWorkspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { externalRef: { startsWith: "DEMO-" } },
        { externalRef: { startsWith: "ORD-DEMO-" } },
        { externalRef: { startsWith: "SHP-ORD-DEMO-" } },
      ],
    },
    select: { id: true, externalRef: true },
  });
  if (demoWorkspaces.length > 0) {
    await prisma.controlTowerAlert.deleteMany({ where: { workspaceId: { in: demoWorkspaces.map((w) => w.id) } } });
    await prisma.tradeException.deleteMany({ where: { workspaceId: { in: demoWorkspaces.map((w) => w.id) } } });
    await prisma.workspace.deleteMany({ where: { id: { in: demoWorkspaces.map((w) => w.id) } } });
    console.log("  · removed demo workspaces:", demoWorkspaces.map((w) => w.externalRef).join(", "));
  }

  const passwordHash = await bcrypt.hash(PRODUCTION_PASSWORD, 10);

  for (const u of PRODUCTION_USERS) {
    const org = await prisma.organisation.upsert({
      where: { id: u.email === "ugur@demaxtore.com" ? "00000000-0000-0000-0000-000000000001" : "00000000-0000-0000-0000-0000000000a1" },
      update: { name: u.orgName, kind: u.orgKind },
      create: {
        id: u.email === "ugur@demaxtore.com" ? "00000000-0000-0000-0000-000000000001" : "00000000-0000-0000-0000-0000000000a1",
        name: u.orgName,
        kind: u.orgKind,
      },
    });

    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        displayName: u.displayName,
        role: u.role,
        passwordHash,
        organisationId: org.id,
      },
      create: {
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        passwordHash,
        organisationId: org.id,
      },
    });
    console.log(`  · staff account ready: ${u.email} (${u.role})`);
  }

  const deletedUsers = { count: 0 };
  for (const email of DEMO_USER_EMAILS) {
    try {
      const r = await prisma.user.delete({ where: { email } });
      void r;
      deletedUsers.count += 1;
    } catch {
      // User may still be referenced by historical procurement rows — skip.
    }
  }
  console.log(`  · removed ${deletedUsers.count} demo user(s) (others skipped if still referenced)`);

  console.log("\n✅ Production setup complete.");
  console.log("   Admin:         ugur@demaxtore.com");
  console.log("   Sales Control: ilham@demaxtore.com");
  console.log(`   Password:      ${PRODUCTION_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("❌ Production setup failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

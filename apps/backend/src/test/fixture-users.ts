/**
 * Idempotent test-user fixture for backend integration tests.
 * Run before vitest via vitest.global-setup.ts; cleaned after suite via globalTeardown.
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

export const TEST_PASSWORD = "Passw0rd!";

export const TEST_USER_EMAILS = {
  admin: "admin@demaxtore.local",
  buyer1: "buyer1@acme.test",
  buyer2: "buyer2@beta.test",
  supplier1: "supplier1@acme-mfg.test",
  supplier2: "supplier1@beta-industries.test",
  forwarder: "forwarder@demaxtore.test",
  finance: "finance@demaxtore.test",
  operations: "ops@demaxtore.test",
  quality: "quality@demaxtore.test",
  buyerLegacy: "buyer@dema.test",
  supplierLegacy: "supplier@dema.test",
} as const;

const ORG_IDS = {
  demaxtore: "00000000-0000-0000-0000-00000000c001",
  acme: "00000000-0000-0000-0000-00000000c002",
  beta: "00000000-0000-0000-0000-00000000c003",
  mfg: "00000000-0000-0000-0000-00000000c004",
  betaInd: "00000000-0000-0000-0000-00000000c005",
} as const;

type SeedUser = {
  email: string;
  displayName: string;
  role: Role;
  orgId: string;
  orgName: string;
  orgKind: string;
};

const FIXTURE_USERS: SeedUser[] = [
  { email: TEST_USER_EMAILS.admin, displayName: "DeMaxtore Admin", role: Role.ADMIN, orgId: ORG_IDS.demaxtore, orgName: "DeMaxtore Operations", orgKind: "DEMAXTORE" },
  { email: TEST_USER_EMAILS.buyer1, displayName: "Buyer One Acme", role: Role.BUYER, orgId: ORG_IDS.acme, orgName: "Acme Foods", orgKind: "BUYER_ORG" },
  { email: TEST_USER_EMAILS.buyer2, displayName: "Buyer Two Beta", role: Role.BUYER, orgId: ORG_IDS.beta, orgName: "Beta Imports", orgKind: "BUYER_ORG" },
  { email: TEST_USER_EMAILS.supplier1, displayName: "Supplier One Mfg", role: Role.SUPPLIER, orgId: ORG_IDS.mfg, orgName: "Acme Manufacturing", orgKind: "SUPPLIER_ORG" },
  { email: TEST_USER_EMAILS.supplier2, displayName: "Supplier Beta Industries", role: Role.SUPPLIER, orgId: ORG_IDS.betaInd, orgName: "Beta Industries", orgKind: "SUPPLIER_ORG" },
  { email: TEST_USER_EMAILS.forwarder, displayName: "Forwarder Portal User", role: Role.FORWARDER, orgId: ORG_IDS.demaxtore, orgName: "DeMaxtore Operations", orgKind: "DEMAXTORE" },
  { email: TEST_USER_EMAILS.finance, displayName: "Finance Operator", role: Role.FINANCE_OPERATOR, orgId: ORG_IDS.demaxtore, orgName: "DeMaxtore Operations", orgKind: "DEMAXTORE" },
  { email: TEST_USER_EMAILS.operations, displayName: "Operations Manager", role: Role.OPS_MANAGER, orgId: ORG_IDS.demaxtore, orgName: "DeMaxtore Operations", orgKind: "DEMAXTORE" },
  { email: TEST_USER_EMAILS.quality, displayName: "Quality Inspector", role: Role.DOCUMENT_CONTROLLER, orgId: ORG_IDS.demaxtore, orgName: "DeMaxtore Operations", orgKind: "DEMAXTORE" },
  { email: TEST_USER_EMAILS.buyerLegacy, displayName: "Legacy Buyer", role: Role.BUYER, orgId: ORG_IDS.acme, orgName: "Acme Foods", orgKind: "BUYER_ORG" },
  { email: TEST_USER_EMAILS.supplierLegacy, displayName: "Legacy Supplier", role: Role.SUPPLIER, orgId: ORG_IDS.mfg, orgName: "Acme Manufacturing", orgKind: "SUPPLIER_ORG" },
];

export async function seedTestUsers(prisma: PrismaClient): Promise<void> {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const orgCache = new Map<string, string>();

  for (const u of FIXTURE_USERS) {
    if (!orgCache.has(u.orgId)) {
      await prisma.organisation.upsert({
        where: { id: u.orgId },
        update: { name: u.orgName, kind: u.orgKind },
        create: { id: u.orgId, name: u.orgName, kind: u.orgKind },
      });
      orgCache.set(u.orgId, u.orgId);
    }
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        displayName: u.displayName,
        role: u.role,
        passwordHash,
        organisationId: u.orgId,
      },
      create: {
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        passwordHash,
        organisationId: u.orgId,
      },
    });
  }
}

/** Soft cleanup — only removes users created exclusively for tests if flagged via env. */
export async function cleanupTestUsers(prisma: PrismaClient): Promise<void> {
  if (process.env.TEST_FIXTURE_CLEANUP !== "1") return;
  for (const email of Object.values(TEST_USER_EMAILS)) {
    try {
      await prisma.user.delete({ where: { email } });
    } catch {
      // referenced rows — keep
    }
  }
}

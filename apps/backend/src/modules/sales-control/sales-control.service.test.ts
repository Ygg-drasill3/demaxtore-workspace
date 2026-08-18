// Unit tests for the customer DTO projection and interest-category listing
// that back the Sales Control dashboard (mocked Prisma).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SalesControlService } from "./sales-control.service.js";

const ORG_ID = "22222222-2222-2222-2222-222222222222";
const USER_ID = "11111111-1111-1111-1111-111111111111";

function customerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: "buyer@acme.test",
    displayName: "Acme Buyer",
    role: "BUYER",
    organisationId: ORG_ID,
    whatsappPhone: "905551112233",
    phoneNumber: "905551112233",
    phoneVerificationStatus: "PHONE_VERIFIED",
    createdAt: new Date("2026-01-02T03:04:05.000Z"),
    organisation: {
      name: "Acme Trading",
      interestAreas: ["PASTA", "OLIVE OIL"],
      logoStorageKey: null,
      catalogStorageKey: null,
      catalogExternalUrl: null,
    },
    ...overrides,
  };
}

function mockPrisma() {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    organisation: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

describe("SalesControlService customer projection", () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let svc: SalesControlService;

  beforeEach(() => {
    prisma = mockPrisma();
    svc = new SalesControlService(prisma as never);
  });

  it("projects organisation branding and interest areas onto the account", async () => {
    prisma.user.findUnique.mockResolvedValue(customerRow());

    const dto = await svc.getCustomer(USER_ID);

    expect(dto.organisationId).toBe(ORG_ID);
    expect(dto.organisation).toBe("Acme Trading");
    expect(dto.interestAreas).toEqual(["PASTA", "OLIVE OIL"]);
    expect(dto.whatsappPhone).toBe("905551112233");
    expect(dto.teammates).toEqual([]);
  });

  it("serves uploaded files through the API rather than exposing storage keys", async () => {
    prisma.user.findUnique.mockResolvedValue(
      customerRow({
        organisation: {
          name: "Acme Trading",
          interestAreas: [],
          logoStorageKey: "abc.png",
          catalogStorageKey: "def.pdf",
          catalogExternalUrl: null,
        },
      }),
    );

    const dto = await svc.getCustomer(USER_ID);

    expect(dto.logoUrl).toBe(`/api/supplier-organisations/${ORG_ID}/logo`);
    expect(dto.catalogUrl).toBe(`/api/supplier-organisations/${ORG_ID}/catalog`);
    expect(dto.catalogIsExternal).toBe(false);
  });

  it("prefers an external catalog link over an uploaded file", async () => {
    prisma.user.findUnique.mockResolvedValue(
      customerRow({
        organisation: {
          name: "Acme Trading",
          interestAreas: [],
          logoStorageKey: null,
          catalogStorageKey: "def.pdf",
          catalogExternalUrl: "https://example.com/c.pdf",
        },
      }),
    );

    const dto = await svc.getCustomer(USER_ID);

    expect(dto.catalogUrl).toBe("https://example.com/c.pdf");
    expect(dto.catalogIsExternal).toBe(true);
  });

  it("lists teammates from the same organisation, excluding the account itself", async () => {
    prisma.user.findUnique.mockResolvedValue(customerRow());
    prisma.user.findMany.mockResolvedValue([
      customerRow({ id: "33333333-3333-3333-3333-333333333333", email: "two@acme.test" }),
    ]);

    const dto = await svc.getCustomer(USER_ID);

    expect(dto.teammates).toHaveLength(1);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organisationId: ORG_ID, id: { not: USER_ID } }),
      }),
    );
  });

  it("hides internal staff behind a 404 rather than leaking the record", async () => {
    prisma.user.findUnique.mockResolvedValue(
      customerRow({ email: "ops@demaxtore.com", role: "ADMIN" }),
    );

    await expect(svc.getCustomer(USER_ID)).rejects.toMatchObject({ status: 404 });
  });

  it("rejects an email that already belongs to another account", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(customerRow())
      .mockResolvedValueOnce({ id: "other" });

    await expect(
      svc.updateCustomer(USER_ID, {
        displayName: "Acme Buyer",
        email: "taken@acme.test",
        organisationName: "Acme Trading",
        whatsappPhone: undefined,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("renames the organisation only when the name actually changed", async () => {
    prisma.user.findUnique.mockResolvedValue(customerRow());

    await svc.updateCustomer(USER_ID, {
      displayName: "Acme Buyer",
      email: "buyer@acme.test",
      organisationName: "Acme Trading",
      whatsappPhone: undefined,
    });

    expect(prisma.organisation.update).not.toHaveBeenCalled();
  });
});

describe("SalesControlService interest categories", () => {
  it("de-duplicates, trims and sorts labels across organisations", async () => {
    const prisma = mockPrisma();
    prisma.organisation.findMany.mockResolvedValue([
      { interestAreas: ["PASTA", " OLIVE OIL "] },
      { interestAreas: ["PASTA", "BULGUR", "  "] },
    ]);
    const svc = new SalesControlService(prisma as never);

    expect(await svc.listInterestCategories()).toEqual(["BULGUR", "OLIVE OIL", "PASTA"]);
  });
});

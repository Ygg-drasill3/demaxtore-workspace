/**
 * Sprint 36B — Product Master unit tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductMasterService } from "./product-master.service.js";
import { AppError } from "../../utils/httpErrors.js";

const buyer = {
  id: "buyer-1",
  role: "BUYER",
  email: "buyer@test.com",
} as const;

const buyer2 = {
  id: "buyer-2",
  role: "BUYER",
  email: "buyer2@test.com",
} as const;

const supplier = {
  id: "sup-1",
  role: "SUPPLIER",
  email: "sup@test.com",
} as const;

const agent = {
  id: "agent-1",
  role: "ORIGIN_AGENT",
  email: "agent@test.com",
} as const;

function makePrisma(overrides: Record<string, unknown> = {}) {
  const productStore = new Map<string, Record<string, unknown>>();
  return {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === buyer.id) return { organisationId: "org-a", id: buyer.id, role: "BUYER" };
        if (where.id === buyer2.id) return { organisationId: "org-b", id: buyer2.id, role: "BUYER" };
        if (where.id === supplier.id) return { id: supplier.id, role: "SUPPLIER" };
        return { organisationId: null, id: where.id, role: "BUYER" };
      }),
    },
    product: {
      findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if (where.id) return productStore.get(String(where.id)) ?? null;
        const key = where.organisationId_sku as { organisationId: string; sku: string } | undefined;
        if (key) {
          for (const p of productStore.values()) {
            if (p.organisationId === key.organisationId && p.sku === key.sku) return p;
          }
        }
        return null;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        const p = productStore.get(where.id);
        if (!p) throw new Error("not found");
        return p;
      }),
      findMany: vi.fn(async () => [...productStore.values()]),
      count: vi.fn(async () => productStore.size),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: "prod-1",
          ...data,
          classificationStatus: data.classificationStatus ?? "UNCLASSIFIED",
          classificationSource: data.classificationSource ?? null,
          classificationNotes: data.classificationNotes ?? null,
          classificationUpdatedAt: data.classificationUpdatedAt ?? null,
          classificationUpdatedById: data.classificationUpdatedById ?? null,
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
          supplierReferences: [],
        };
        productStore.set(String(row.id), row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const prev = productStore.get(where.id)!;
        const next = {
          ...prev,
          ...data,
          updatedAt: new Date(),
          supplierReferences: prev.supplierReferences ?? [],
        };
        productStore.set(where.id, next);
        return next;
      }),
    },
    productSupplierReference: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
    productChangeEvent: {
      create: vi.fn(),
    },
    purchaseOrderLine: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    shipmentLineAllocation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    shipmentWorkspace: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(makePrisma({}))),
    _store: productStore,
    ...overrides,
  };
}

describe("ProductMasterService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let svc: ProductMasterService;

  beforeEach(() => {
    prisma = makePrisma();
    // Fix transaction to use same store
    prisma.$transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
    svc = new ProductMasterService(prisma as never);
  });

  it("TEST 1/2 — tenant can create Product with stable id", async () => {
    const dto = await svc.create(buyer as never, {
      sku: "mtr-500",
      name: "Industrial Electric Motor",
      unitOfMeasure: "PCS",
      countryOfOrigin: "CN",
    });
    expect(dto.id).toBeTruthy();
    expect(dto.sku).toBe("MTR-500");
    expect(dto.countryOfOrigin).toBe("CN");
  });

  it("TEST 3 — tenant-scoped SKU uniqueness", async () => {
    await svc.create(buyer as never, { sku: "MTR-500", name: "Motor", unitOfMeasure: "PCS" });
    await expect(
      svc.create(buyer as never, { sku: "MTR-500", name: "Motor 2", unitOfMeasure: "PCS" }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("TEST 5/6 — country of origin stored; not inferred from supplier", async () => {
    const dto = await svc.create(buyer as never, {
      sku: "MTR-501",
      name: "Motor",
      unitOfMeasure: "PCS",
      countryOfOrigin: "CN",
      supplierUserId: supplier.id,
      supplierSku: "ABC-500",
    });
    expect(dto.countryOfOrigin).toBe("CN");
    // supplier ref created separately — origin remains explicit CN
    expect(prisma.productSupplierReference.create).toHaveBeenCalled();
  });

  it("TEST 8/9 — search by sku/name", async () => {
    await svc.create(buyer as never, { sku: "MTR-500", name: "Industrial Motor", unitOfMeasure: "PCS" });
    prisma.product.findMany = vi.fn(async () => [...prisma._store.values()]);
    prisma.product.count = vi.fn(async () => prisma._store.size);
    const list = await svc.list(buyer as never, { page: 1, pageSize: 25, q: "MTR" });
    expect(list.items.length).toBeGreaterThan(0);
  });

  it("TEST 10/29/30 — supplier and origin agent denied", async () => {
    await expect(svc.list(supplier as never, { page: 1, pageSize: 10 })).rejects.toBeInstanceOf(AppError);
    await expect(svc.list(agent as never, { page: 1, pageSize: 10 })).rejects.toBeInstanceOf(AppError);
  });

  it("TEST 12 — cross-tenant product link denied", async () => {
    const created = await svc.create(buyer as never, {
      sku: "X-1",
      name: "X",
      unitOfMeasure: "PCS",
    });
    await expect(svc.assertProductForBuyerOrg(created.id, "org-b")).rejects.toBeInstanceOf(AppError);
  });

  it("TEST 23/24 — gtip stored as CANDIDATE, not auto VERIFIED", async () => {
    const dto = await svc.create(buyer as never, {
      sku: "MTR-GTIP",
      name: "Motor",
      unitOfMeasure: "PCS",
      gtipCode: "8501.10.00.00.00",
      classificationStatus: "VERIFIED", // attempt — without broker provenance → CANDIDATE
    });
    expect(dto.gtipCode).toBe("8501.10.00.00.00");
    expect(dto.classificationStatus).toBe("CANDIDATE");
  });

  it("TEST 26 — no HS→GTİP transform (stored as provided)", async () => {
    const dto = await svc.create(buyer as never, {
      sku: "MTR-HS",
      name: "Motor",
      unitOfMeasure: "PCS",
      gtipCode: "8501.10",
    });
    expect(dto.gtipCode).toBe("8501.10");
  });
});

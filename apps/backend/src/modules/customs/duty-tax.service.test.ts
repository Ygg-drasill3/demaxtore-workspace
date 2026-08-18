import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  dutyTaxCompletenessLabel,
  roundMoney,
  MATERIAL_ESTIMATE_CHANGE_THRESHOLD,
} from "@dmx/contracts/duty-tax";
import { createDutyTaxService } from "./duty-tax.service.js";

describe("Sprint 40 duty-tax contracts", () => {
  it("roundMoney is stable", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
  });

  it("completeness labels", () => {
    expect(
      dutyTaxCompletenessLabel({ status: "INCOMPLETE", provisional: false, missingCritical: true }),
    ).toBe("LOW");
    expect(
      dutyTaxCompletenessLabel({ status: "PROVISIONAL", provisional: true, missingCritical: false }),
    ).toBe("PROVISIONAL");
    expect(
      dutyTaxCompletenessLabel({ status: "ESTIMATED", provisional: false, missingCritical: false }),
    ).toBe("COMPLETE");
  });

  it("material change threshold is 10%", () => {
    expect(MATERIAL_ESTIMATE_CHANGE_THRESHOLD).toBe(0.1);
  });
});

function mockDb() {
  const caseRow = {
    id: "case-1",
    organisationId: "org-1",
    shipmentWorkspaceId: "ship-1",
    orderWorkspaceId: "order-1",
    status: "BROKER_REVIEW",
    brokerUserId: "broker-1",
  };
  return {
    customsCase: {
      findUnique: vi.fn().mockResolvedValue(caseRow),
    },
    partnerAssignment: {
      findFirst: vi.fn().mockResolvedValue({ id: "a1", userId: "broker-1" }),
    },
    shipmentLineAllocation: {
      findMany: vi.fn().mockResolvedValue([
        {
          quantity: 10,
          unit: "KG",
          purchaseOrderLine: {
            id: "pol-1",
            productId: "prod-1",
            sku: "MTR-500",
            description: "Flour",
            unitPrice: 100,
            quantity: 10,
            purchaseOrder: { currency: "USD" },
            product: {
              id: "prod-1",
              sku: "MTR-500",
              name: "Flour",
              gtipCode: "1101.00.10",
              classificationStatus: "VERIFIED",
              classificationSource: "CUSTOMS_BROKER_VERIFIED",
              countryOfOrigin: "CN",
              unitOfMeasure: "KG",
            },
          },
        },
      ]),
    },
    shipmentWorkspace: {
      findUnique: vi.fn().mockResolvedValue({ freightOfferId: null }),
    },
    freightOffer: { findUnique: vi.fn() },
    dutyTaxRule: {
      findMany: vi.fn().mockImplementation(async ({ where }: any) => {
        if (where.componentType === "CUSTOMS_DUTY") {
          return [
            {
              id: "rule-duty",
              componentType: "CUSTOMS_DUTY",
              gtipCode: "1101.00.10",
              originCountryCode: null,
              ratePercent: 5,
              baseFormula: "GOODS_PLUS_FREIGHT",
              priority: 100,
              version: 1,
              source: "ADMIN_CONFIGURED",
              active: true,
              effectiveFrom: new Date("2020-01-01"),
              effectiveTo: null,
            },
          ];
        }
        if (where.componentType === "VAT") {
          return [
            {
              id: "rule-vat",
              componentType: "VAT",
              gtipCode: "1101.00.10",
              originCountryCode: null,
              ratePercent: 20,
              baseFormula: "GOODS_PLUS_FREIGHT_PLUS_DUTY",
              priority: 100,
              version: 1,
              source: "ADMIN_CONFIGURED",
              active: true,
              effectiveFrom: new Date("2020-01-01"),
              effectiveTo: null,
            },
          ];
        }
        return [];
      }),
    },
    dutyTaxCalculation: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async ({ data }: any) => ({
        id: "calc-1",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewedAt: null,
        reviewedById: null,
        supersededAt: null,
        lines: (data.lines?.create ?? []).map((l: any, i: number) => ({
          id: `line-${i}`,
          ...l,
          createdAt: new Date(),
          overrideAmount: null,
          overrideReason: null,
          overrideById: null,
          overrideAt: null,
        })),
      })),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    customsCaseEvent: { create: vi.fn() },
    operationalIssue: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "issue-1" }),
      update: vi.fn(),
    },
    operationalTask: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "task-1" }),
      update: vi.fn(),
    },
    timelineEvent: {
      create: vi.fn().mockResolvedValue({ id: "tl-1" }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
    workspaceParticipant: { findFirst: vi.fn().mockResolvedValue({ id: "p1" }) },
    user: { findUnique: vi.fn().mockResolvedValue({ organisationId: "org-1" }) },
  } as any;
}

describe("Sprint 40 duty-tax service", () => {
  const broker = { id: "broker-1", role: "CUSTOMS_BROKER", email: "b@x.com" } as any;

  beforeEach(() => vi.clearAllMocks());

  it("calculates CUSTOMS_DUTY and VAT with configured rules", async () => {
    const db = mockDb();
    const svc = createDutyTaxService(db);
    const dto = await svc.calculate(broker, "case-1", {
      exchangeRate: 30,
      exchangeRateSource: "MANUAL",
      targetCurrency: "TRY",
      freightAllocationMethod: "VALUE",
      freightAmountOverride: 100,
    });
    expect(dto.status).toBe("PROVISIONAL"); // manual FX
    expect(dto.goodsValueEstimate).toBe(30000); // 10*100*30
    const duty = dto.lines.find((l) => l.componentType === "CUSTOMS_DUTY" && l.componentStatus === "EVALUATED");
    const vat = dto.lines.find((l) => l.componentType === "VAT" && l.componentStatus === "EVALUATED");
    expect(duty?.ratePercent).toBe(5);
    expect(vat?.ratePercent).toBe(20);
    expect(duty?.amount).toBeGreaterThan(0);
    expect(vat?.amount).toBeGreaterThan(0);
    const anti = dto.lines.find((l) => l.componentType === "ANTI_DUMPING");
    expect(anti?.componentStatus).toBe("NOT_EVALUATED");
    expect(anti?.amount).toBeNull();
    expect(dto.totalsByComponent?.ANTI_DUMPING).toBeNull();
  });

  it("UNCLASSIFIED GTİP → incomplete", async () => {
    const db = mockDb();
    db.shipmentLineAllocation.findMany.mockResolvedValue([
      {
        quantity: 1,
        unit: "KG",
        purchaseOrderLine: {
          id: "pol-1",
          productId: "prod-1",
          sku: "X",
          description: "X",
          unitPrice: 10,
          quantity: 1,
          purchaseOrder: { currency: "TRY" },
          product: {
            id: "prod-1",
            sku: "X",
            name: "X",
            gtipCode: null,
            classificationStatus: "UNCLASSIFIED",
            classificationSource: null,
            countryOfOrigin: "CN",
            unitOfMeasure: "KG",
          },
        },
      },
    ]);
    const svc = createDutyTaxService(db);
    const dto = await svc.calculate(broker, "case-1", {
      targetCurrency: "TRY",
      freightAllocationMethod: "VALUE",
    });
    expect(dto.status).toBe("INCOMPLETE");
    expect(dto.diagnostics).toContain("CLASSIFICATION_REQUIRED");
  });

  it("idempotent calculate returns same current when hash matches", async () => {
    const db = mockDb();
    const existing = {
      id: "calc-1",
      customsCaseId: "case-1",
      organisationId: "org-1",
      version: 1,
      status: "PROVISIONAL",
      calculationDate: new Date(),
      calculationCurrency: "TRY",
      sourceCurrency: "USD",
      goodsValueEstimate: 30000,
      freightAmount: 3000,
      insuranceAmount: null,
      customsValueEstimate: 33000,
      exchangeRate: 30,
      exchangeRateSource: "MANUAL",
      exchangeRateDate: null,
      freightAllocationMethod: "VALUE",
      totalEvaluatedAmount: 1000,
      provisional: true,
      completenessLabel: "PROVISIONAL",
      inputHash: "will-set",
      ruleSetFingerprint: "will-set",
      diagnostics: [],
      reviewedAt: null,
      reviewedById: null,
      createdAt: new Date(),
      createdById: "broker-1",
      supersededAt: null,
      lines: [],
    };
    // First call creates; capture hashes from create then second returns existing
    let createdHash = "";
    let createdFp = "";
    db.dutyTaxCalculation.create.mockImplementation(async ({ data }: any) => {
      createdHash = data.inputHash;
      createdFp = data.ruleSetFingerprint;
      return {
        ...existing,
        ...data,
        inputHash: data.inputHash,
        ruleSetFingerprint: data.ruleSetFingerprint,
        lines: (data.lines?.create ?? []).map((l: any, i: number) => ({
          id: `line-${i}`,
          ...l,
          createdAt: new Date(),
          overrideAmount: null,
          overrideReason: null,
        })),
      };
    });
    const svc = createDutyTaxService(db);
    const first = await svc.calculate(broker, "case-1", {
      exchangeRate: 30,
      exchangeRateSource: "MANUAL",
      targetCurrency: "TRY",
      freightAllocationMethod: "VALUE",
      freightAmountOverride: 100,
    });
    expect(first.version).toBe(1);
    db.dutyTaxCalculation.findFirst.mockResolvedValue({
      ...existing,
      inputHash: createdHash,
      ruleSetFingerprint: createdFp,
      lines: first.lines.map((l) => ({ ...l, createdAt: new Date() })),
    });
    const second = await svc.calculate(broker, "case-1", {
      exchangeRate: 30,
      exchangeRateSource: "MANUAL",
      targetCurrency: "TRY",
      freightAllocationMethod: "VALUE",
      freightAmountOverride: 100,
    });
    expect(db.dutyTaxCalculation.create).toHaveBeenCalledTimes(1);
    expect(second.id).toBe("calc-1");
  });
});

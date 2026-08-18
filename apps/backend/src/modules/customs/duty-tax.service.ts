/**
 * Sprint 40 — Turkey Duty & Tax Engine V1.
 * Estimation only — not official Turkish Customs assessment / liability.
 */
import { createHash } from "node:crypto";
import type { DutyTaxCalculation, DutyTaxRule, PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";
import {
  MATERIAL_ESTIMATE_CHANGE_THRESHOLD,
  dutyTaxCompletenessLabel,
  roundMoney,
  type DutyTaxCalculateInput,
  type DutyTaxCalculationDto,
  type DutyTaxLineDto,
  type DutyTaxOverrideInput,
  type DutyTaxReviewInput,
  type DutyTaxRuleUpsertInput,
} from "@dmx/contracts/duty-tax";
import { AppError } from "../../utils/httpErrors.js";
import type { AuthUser } from "../../types/auth-user.js";
import { OperationalIssueService } from "../operational-issue/operational-issue.service.js";
import { createLandedCostService } from "../landed-cost/landed-cost.service.js";
import { assertCustomsCaseAccess } from "./customs.policy.js";

const DISCLAIMER =
  "Preliminary customs cost estimate — not an official Turkish Customs assessment or tax liability.";

const EVALUABLE = ["CUSTOMS_DUTY", "VAT"] as const;
const ALWAYS_NOT_EVALUATED = [
  "ADDITIONAL_CUSTOMS_DUTY",
  "SCT_OTV",
  "ANTI_DUMPING",
  "SURVEILLANCE_ADJUSTMENT",
  "SAFEGUARD",
] as const;

type LineCtx = {
  purchaseOrderLineId: string;
  productId: string | null;
  sku: string | null;
  description: string;
  gtipCode: string | null;
  classificationStatus: string | null;
  classificationSource: string | null;
  originCountryCode: string | null;
  quantity: number;
  uom: string | null;
  unitPrice: number;
  goodsValue: number;
  goodsValueSource: string;
};

function num(v: unknown): number {
  return Number(v ?? 0);
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function hashPayload(obj: unknown): string {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export function createDutyTaxService(db: PrismaClient) {
  const issues = new OperationalIssueService(db);

  async function requireCaseAccess(actor: AuthUser, caseId: string) {
    const row = await db.customsCase.findUnique({ where: { id: caseId } });
    if (!row) throw new AppError(404, "CUSTOMS_CASE_NOT_FOUND");
    const access = await assertCustomsCaseAccess(db, actor, row);
    return { row, access };
  }

  async function refreshLandedCost(shipmentWorkspaceId: string): Promise<void> {
    try {
      const sw = await db.shipmentWorkspace.findUnique({
        where: { workspaceId: shipmentWorkspaceId },
        select: { buyerUserId: true },
      });
      const buyer = sw?.buyerUserId
        ? await db.user.findUnique({ where: { id: sw.buyerUserId } })
        : null;
      if (!buyer) return;
      await createLandedCostService(db).calculate(
        { id: buyer.id, role: buyer.role, email: buyer.email } as AuthUser,
        {
          shipmentWorkspaceId,
          calculationCurrency: "USD",
          fxRates: {
            TRY: 1 / env.CUSTOMS_DEFAULT_USD_TRY_RATE,
            EUR: env.CUSTOMS_DEFAULT_USD_EUR_RATE,
          },
        },
      );
    } catch {
      // Duty-tax remains source of truth; buyer can Recalculate LC from shipment UI.
    }
  }

  function mapLine(l: {
    id: string;
    purchaseOrderLineId: string | null;
    productId: string | null;
    sku: string | null;
    description: string | null;
    gtipCode: string | null;
    classificationStatus: string | null;
    classificationSource: string | null;
    originCountryCode: string | null;
    quantity: unknown;
    uom: string | null;
    goodsValue: unknown;
    allocatedFreight: unknown;
    customsValue: unknown;
    componentType: string;
    componentStatus: string;
    taxableBase: unknown;
    ratePercent: unknown;
    amount: unknown;
    ruleId: string | null;
    ruleVersion: number | null;
    ruleSource: string | null;
    warning: string | null;
    overrideAmount: unknown;
    overrideReason: string | null;
  }): DutyTaxLineDto {
    return {
      id: l.id,
      purchaseOrderLineId: l.purchaseOrderLineId,
      productId: l.productId,
      sku: l.sku,
      description: l.description,
      gtipCode: l.gtipCode,
      classificationStatus: l.classificationStatus,
      classificationSource: l.classificationSource,
      originCountryCode: l.originCountryCode,
      quantity: num(l.quantity),
      uom: l.uom,
      goodsValue: l.goodsValue == null ? null : num(l.goodsValue),
      allocatedFreight: l.allocatedFreight == null ? null : num(l.allocatedFreight),
      customsValue: l.customsValue == null ? null : num(l.customsValue),
      componentType: l.componentType as DutyTaxLineDto["componentType"],
      componentStatus: l.componentStatus as DutyTaxLineDto["componentStatus"],
      taxableBase: l.taxableBase == null ? null : num(l.taxableBase),
      ratePercent: l.ratePercent == null ? null : num(l.ratePercent),
      amount: l.amount == null ? null : num(l.amount),
      ruleId: l.ruleId,
      ruleVersion: l.ruleVersion,
      ruleSource: l.ruleSource,
      warning: l.warning,
      overrideAmount: l.overrideAmount == null ? null : num(l.overrideAmount),
      overrideReason: l.overrideReason,
    };
  }

  function mapCalc(
    row: DutyTaxCalculation & { lines?: Array<Parameters<typeof mapLine>[0]> },
  ): DutyTaxCalculationDto {
    const lines = (row.lines ?? []).map(mapLine);
    const totalsByComponent: Record<string, number | null> = {};
    for (const t of [...EVALUABLE, ...ALWAYS_NOT_EVALUATED]) {
      const matching = lines.filter((l) => l.componentType === t);
      if (matching.length === 0) {
        totalsByComponent[t] = null;
        continue;
      }
      if (matching.every((l) => l.componentStatus === "NOT_EVALUATED" || l.componentStatus === "RULE_MISSING" || l.componentStatus === "MISSING_INPUT")) {
        totalsByComponent[t] = null;
        continue;
      }
      totalsByComponent[t] = roundMoney(
        matching.reduce((s, l) => s + (l.overrideAmount ?? l.amount ?? 0), 0),
      );
    }
    return {
      id: row.id,
      customsCaseId: row.customsCaseId,
      organisationId: row.organisationId,
      version: row.version,
      status: row.status as DutyTaxCalculationDto["status"],
      calculationDate: row.calculationDate.toISOString(),
      calculationCurrency: row.calculationCurrency,
      sourceCurrency: row.sourceCurrency,
      goodsValueEstimate: row.goodsValueEstimate == null ? null : num(row.goodsValueEstimate),
      freightAmount: row.freightAmount == null ? null : num(row.freightAmount),
      insuranceAmount: row.insuranceAmount == null ? null : num(row.insuranceAmount),
      customsValueEstimate:
        row.customsValueEstimate == null ? null : num(row.customsValueEstimate),
      exchangeRate: row.exchangeRate == null ? null : num(row.exchangeRate),
      exchangeRateSource: row.exchangeRateSource,
      exchangeRateDate: iso(row.exchangeRateDate),
      freightAllocationMethod: row.freightAllocationMethod,
      totalEvaluatedAmount:
        row.totalEvaluatedAmount == null ? null : num(row.totalEvaluatedAmount),
      provisional: row.provisional,
      completenessLabel: row.completenessLabel as DutyTaxCalculationDto["completenessLabel"],
      inputHash: row.inputHash,
      diagnostics: Array.isArray(row.diagnostics) ? (row.diagnostics as string[]) : [],
      disclaimer: DISCLAIMER,
      reviewedAt: iso(row.reviewedAt),
      reviewedById: row.reviewedById,
      createdAt: row.createdAt.toISOString(),
      createdById: row.createdById,
      lines,
      totalsByComponent,
    };
  }

  async function loadLineContexts(shipmentWorkspaceId: string): Promise<{
    lines: LineCtx[];
    sourceCurrency: string | null;
  }> {
    const allocations = await db.shipmentLineAllocation.findMany({
      where: { shipmentWorkspaceId },
      include: {
        purchaseOrderLine: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                gtipCode: true,
                classificationStatus: true,
                classificationSource: true,
                countryOfOrigin: true,
                unitOfMeasure: true,
              },
            },
            purchaseOrder: { select: { currency: true } },
          },
        },
      },
    });

    const lines: LineCtx[] = allocations.map((a) => {
      const pol = a.purchaseOrderLine;
      const product = pol.product;
      const qty = num(a.quantity);
      const unitPrice = num(pol.unitPrice);
      return {
        purchaseOrderLineId: pol.id,
        productId: product?.id ?? pol.productId ?? null,
        sku: product?.sku ?? pol.sku ?? null,
        description: pol.description,
        gtipCode: product?.gtipCode ?? null,
        classificationStatus: product?.classificationStatus ?? null,
        classificationSource: product?.classificationSource ?? null,
        originCountryCode: product?.countryOfOrigin ?? null,
        quantity: qty,
        uom: a.unit ?? product?.unitOfMeasure ?? null,
        unitPrice,
        goodsValue: roundMoney(unitPrice * qty),
        goodsValueSource: "PURCHASE_ORDER",
      };
    });

    const sourceCurrency = allocations[0]?.purchaseOrderLine.purchaseOrder.currency ?? null;
    return { lines, sourceCurrency };
  }

  async function resolveFreight(
    shipmentWorkspaceId: string,
    override: number | null | undefined,
  ): Promise<{ amount: number | null; source: string }> {
    if (override != null) return { amount: roundMoney(override), source: "MANUAL" };
    const sw = await db.shipmentWorkspace.findUnique({
      where: { workspaceId: shipmentWorkspaceId },
      select: { freightOfferId: true },
    });
    if (!sw?.freightOfferId) return { amount: null, source: "MISSING" };
    const offer = await db.freightOffer.findUnique({
      where: { id: sw.freightOfferId },
      select: { displayPriceUsd: true, price: true, currency: true },
    });
    if (!offer) return { amount: null, source: "MISSING" };
    const amt = offer.displayPriceUsd != null ? num(offer.displayPriceUsd) : num(offer.price);
    return { amount: roundMoney(amt), source: "FREIGHTIQ_CUSTOMS_VALUE_COMPONENT" };
  }

  /** HS/GTIP variants so 8501.52 matches seeded 8501.52.00 rules. */
  function gtipMatchCandidates(gtipCode: string): string[] {
    const raw = gtipCode.trim();
    const digits = raw.replace(/\D/g, "");
    const out = new Set<string>([raw]);
    if (raw.endsWith(".00")) out.add(raw.slice(0, -3));
    else out.add(`${raw}.00`);
    if (digits.length >= 6) {
      const base = `${digits.slice(0, 4)}.${digits.slice(4, 6)}`;
      out.add(base);
      out.add(`${base}.00`);
      if (digits.length >= 8) {
        out.add(`${base}.${digits.slice(6, 8)}`);
      }
    }
    return [...out];
  }

  async function matchRule(
    componentType: string,
    gtipCode: string,
    origin: string | null,
    at: Date,
  ): Promise<{ rule: DutyTaxRule | null; conflict: boolean }> {
    const candidates = gtipMatchCandidates(gtipCode);
    const rules = await db.dutyTaxRule.findMany({
      where: {
        active: true,
        componentType,
        gtipCode: { in: candidates },
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
      },
      orderBy: [{ priority: "asc" }, { version: "desc" }, { createdAt: "desc" }],
    });
    const applicable = rules.filter(
      (r) => !r.originCountryCode || (origin && r.originCountryCode === origin),
    );
    if (applicable.length === 0) return { rule: null, conflict: false };
    const top = applicable[0]!;
    const samePriority = applicable.filter((r) => r.priority === top.priority);
    if (samePriority.length > 1) {
      // Same priority + different rates = conflict
      const rates = new Set(samePriority.map((r) => String(r.ratePercent)));
      if (rates.size > 1) return { rule: null, conflict: true };
    }
    return { rule: top, conflict: false };
  }

  async function syncIssues(
    caseRow: { id: string; orderWorkspaceId: string; shipmentWorkspaceId: string },
    dto: DutyTaxCalculationDto,
  ) {
    const missingInput = dto.diagnostics.some((d) =>
      ["CLASSIFICATION_REQUIRED", "ORIGIN_REQUIRED", "EXCHANGE_RATE_REQUIRED"].includes(d),
    );
    const ruleMissing = dto.diagnostics.includes("RULE_MISSING") || dto.diagnostics.includes("RULE_CONFLICT");

    if (missingInput) {
      await issues.ensureAutomatedIssue({
        orderId: caseRow.orderWorkspaceId,
        automationKey: `duty_tax_input_missing:${caseRow.id}`,
        title: "Duty & tax estimate incomplete — missing inputs",
        description: dto.diagnostics.join("; "),
        category: "OTHER",
        severity: "HIGH",
        relatedEntityType: "SHIPMENT",
        relatedEntityId: caseRow.shipmentWorkspaceId,
        impactType: "CUSTOMS_COST_RISK",
        ownerRole: "OPERATIONS",
        recommendedAction: "Provide GTİP/origin/FX/value inputs for customs cost estimate",
        sourceEventType: "DUTY_TAX_INPUT_MISSING",
        sourceRuleId: "RULE_DUTY_TAX_INPUT_MISSING",
      });
    } else {
      await issues.resolveAutomatedIssue({
        orderId: caseRow.orderWorkspaceId,
        automationKey: `duty_tax_input_missing:${caseRow.id}`,
        resolutionNote: "Duty/tax inputs completed",
      }).catch(() => null);
      const open = await db.operationalIssue.findFirst({
        where: {
          orderId: caseRow.orderWorkspaceId,
          automationKey: `duty_tax_input_missing:${caseRow.id}`,
          status: { in: ["OPEN", "IN_PROGRESS"] },
          deletedAt: null,
        },
      });
      if (open && !missingInput) {
        await db.operationalIssue.update({
          where: { id: open.id },
          data: {
            status: "RESOLVED",
            resolvedAt: new Date(),
            resolutionNote: "Inputs available for estimate",
          },
        });
      }
    }

    if (ruleMissing) {
      await issues.ensureAutomatedIssue({
        orderId: caseRow.orderWorkspaceId,
        automationKey: `duty_tax_rule_missing:${caseRow.id}`,
        title: "Duty & tax rule missing or conflicting",
        description: "Configured duty/VAT rule could not be resolved for one or more lines.",
        category: "OTHER",
        severity: "HIGH",
        relatedEntityType: "SHIPMENT",
        relatedEntityId: caseRow.shipmentWorkspaceId,
        impactType: "CUSTOMS_COST_RISK",
        ownerRole: "OPERATIONS",
        recommendedAction: "Configure/review DutyTaxRule or broker review estimate",
        sourceEventType: "DUTY_TAX_RULE_MISSING",
        sourceRuleId: "RULE_DUTY_TAX_RULE_MISSING",
      });
    } else {
      const open = await db.operationalIssue.findFirst({
        where: {
          orderId: caseRow.orderWorkspaceId,
          automationKey: `duty_tax_rule_missing:${caseRow.id}`,
          status: { in: ["OPEN", "IN_PROGRESS"] },
          deletedAt: null,
        },
      });
      if (open) {
        await db.operationalIssue.update({
          where: { id: open.id },
          data: { status: "RESOLVED", resolvedAt: new Date(), resolutionNote: "Rules resolved" },
        });
      }
    }
  }

  return {
    async getCurrent(actor: AuthUser, caseId: string): Promise<DutyTaxCalculationDto | null> {
      await requireCaseAccess(actor, caseId);
      const row = await db.dutyTaxCalculation.findFirst({
        where: { customsCaseId: caseId, status: { not: "SUPERSEDED" } },
        orderBy: { version: "desc" },
        include: { lines: { orderBy: { createdAt: "asc" } } },
      });
      return row ? mapCalc(row) : null;
    },

    async listVersions(actor: AuthUser, caseId: string) {
      await requireCaseAccess(actor, caseId);
      const rows = await db.dutyTaxCalculation.findMany({
        where: { customsCaseId: caseId },
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          status: true,
          totalEvaluatedAmount: true,
          provisional: true,
          createdAt: true,
          calculationCurrency: true,
        },
      });
      return rows.map((r) => ({
        id: r.id,
        version: r.version,
        status: r.status,
        totalEvaluatedAmount: r.totalEvaluatedAmount == null ? null : num(r.totalEvaluatedAmount),
        provisional: r.provisional,
        calculationCurrency: r.calculationCurrency,
        createdAt: r.createdAt.toISOString(),
      }));
    },

    async getById(actor: AuthUser, caseId: string, calculationId: string) {
      await requireCaseAccess(actor, caseId);
      const row = await db.dutyTaxCalculation.findFirst({
        where: { id: calculationId, customsCaseId: caseId },
        include: { lines: { orderBy: { createdAt: "asc" } } },
      });
      if (!row) throw new AppError(404, "DUTY_TAX_CALCULATION_NOT_FOUND");
      return mapCalc(row);
    },

    async calculate(
      actor: AuthUser,
      caseId: string,
      input: DutyTaxCalculateInput,
    ): Promise<DutyTaxCalculationDto> {
      const { row: caseRow } = await requireCaseAccess(actor, caseId);
      const calcDate = input.calculationDate ? new Date(input.calculationDate) : new Date();
      const { lines, sourceCurrency } = await loadLineContexts(caseRow.shipmentWorkspaceId);
      const freight = await resolveFreight(
        caseRow.shipmentWorkspaceId,
        input.freightAmountOverride ?? null,
      );
      const insurance =
        input.insuranceAmount == null ? null : roundMoney(input.insuranceAmount);
      const targetCurrency = (input.targetCurrency || "TRY").toUpperCase();
      const needsFx =
        !!sourceCurrency && sourceCurrency.toUpperCase() !== targetCurrency;
      const fxRate = input.exchangeRate ?? null;
      const fxSource = input.exchangeRateSource ?? (fxRate != null ? "MANUAL" : null);

      const diagnostics: string[] = [];
      let provisional = false;
      let missingCritical = false;

      if (lines.length === 0) {
        diagnostics.push("NO_LINE_ALLOCATIONS");
        missingCritical = true;
      }

      const goodsTotalSource = roundMoney(
        input.goodsValueOverride != null
          ? input.goodsValueOverride
          : lines.reduce((s, l) => s + l.goodsValue, 0),
      );
      if (input.goodsValueOverride != null) {
        // distribute override proportionally
        const base = lines.reduce((s, l) => s + l.goodsValue, 0) || 1;
        for (const l of lines) {
          l.goodsValue = roundMoney((l.goodsValue / base) * goodsTotalSource);
          l.goodsValueSource = "MANUAL";
        }
      }

      const convert = (amount: number): number => {
        if (!needsFx) return amount;
        if (fxRate == null || fxRate <= 0) return amount;
        return roundMoney(amount * fxRate);
      };

      if (needsFx && (fxRate == null || fxRate <= 0)) {
        diagnostics.push("EXCHANGE_RATE_REQUIRED");
        missingCritical = true;
      } else if (needsFx && fxSource === "MANUAL") {
        provisional = true;
        diagnostics.push("MANUAL_EXCHANGE_RATE");
      }

      if (freight.amount == null) {
        diagnostics.push("FREIGHT_MISSING");
        // not always critical — CIF may still estimate goods-only
      }
      if (insurance == null) {
        diagnostics.push("INSURANCE_MISSING");
      }

      const freightAmt = freight.amount == null ? 0 : freight.amount;
      const insuranceAmt = insurance ?? 0;
      const goodsConverted = convert(goodsTotalSource);
      const freightConverted = convert(freightAmt);
      const insuranceConverted = convert(insuranceAmt);
      const customsValueTotal = roundMoney(goodsConverted + freightConverted + insuranceConverted);

      type BuiltLine = Omit<DutyTaxLineDto, "id"> & {
        inputSources: Record<string, string>;
        ruleVersion: number | null;
      };
      const built: BuiltLine[] = [];
      const ruleIds: string[] = [];

      for (const line of lines) {
        const gtipMissing = !line.gtipCode || line.classificationStatus === "UNCLASSIFIED";
        const originMissing = !line.originCountryCode;
        if (gtipMissing) {
          diagnostics.push("CLASSIFICATION_REQUIRED");
          missingCritical = true;
        }
        if (originMissing) {
          diagnostics.push("ORIGIN_REQUIRED");
          missingCritical = true;
        }
        if (line.classificationStatus === "CANDIDATE") {
          provisional = true;
          diagnostics.push("GTIP_CANDIDATE_PROVISIONAL");
        }

        const goodsC = convert(line.goodsValue);
        const share =
          goodsTotalSource > 0 ? line.goodsValue / goodsTotalSource : 1 / Math.max(lines.length, 1);
        const allocFreight =
          input.freightAllocationMethod === "NONE" || freight.amount == null
            ? 0
            : roundMoney(freightConverted * share);
        const allocInsurance = roundMoney(insuranceConverted * share);
        const lineCustoms = roundMoney(goodsC + allocFreight + allocInsurance);

        let dutyAmount = 0;
        let dutyEvaluated = false;

        for (const componentType of EVALUABLE) {
          if (gtipMissing || originMissing || (needsFx && fxRate == null)) {
            built.push({
              purchaseOrderLineId: line.purchaseOrderLineId,
              productId: line.productId,
              sku: line.sku,
              description: line.description,
              gtipCode: line.gtipCode,
              classificationStatus: line.classificationStatus,
              classificationSource: line.classificationSource,
              originCountryCode: line.originCountryCode,
              quantity: line.quantity,
              uom: line.uom,
              goodsValue: goodsC,
              allocatedFreight: allocFreight,
              customsValue: lineCustoms,
              componentType,
              componentStatus: "MISSING_INPUT",
              taxableBase: null,
              ratePercent: null,
              amount: null,
              ruleId: null,
              ruleVersion: null,
              ruleSource: null,
              warning: gtipMissing
                ? "GTİP classification required"
                : originMissing
                  ? "Country of Origin required"
                  : "Exchange rate required",
              overrideAmount: null,
              overrideReason: null,
              inputSources: {
                goods: line.goodsValueSource,
                freight: freight.source,
                insurance: insurance == null ? "MISSING" : "MANUAL",
              },
            });
            continue;
          }

          const { rule, conflict } = await matchRule(
            componentType,
            line.gtipCode!,
            line.originCountryCode,
            calcDate,
          );

          if (conflict) {
            diagnostics.push("RULE_CONFLICT");
            built.push({
              purchaseOrderLineId: line.purchaseOrderLineId,
              productId: line.productId,
              sku: line.sku,
              description: line.description,
              gtipCode: line.gtipCode,
              classificationStatus: line.classificationStatus,
              classificationSource: line.classificationSource,
              originCountryCode: line.originCountryCode,
              quantity: line.quantity,
              uom: line.uom,
              goodsValue: goodsC,
              allocatedFreight: allocFreight,
              customsValue: lineCustoms,
              componentType,
              componentStatus: "RULE_MISSING",
              taxableBase: null,
              ratePercent: null,
              amount: null,
              ruleId: null,
              ruleVersion: null,
              ruleSource: null,
              warning: "Conflicting active rules — broker/admin review required",
              overrideAmount: null,
              overrideReason: null,
              inputSources: {
                goods: line.goodsValueSource,
                freight: freight.source,
                insurance: insurance == null ? "MISSING" : "MANUAL",
              },
            });
            continue;
          }

          if (!rule) {
            diagnostics.push("RULE_MISSING");
            built.push({
              purchaseOrderLineId: line.purchaseOrderLineId,
              productId: line.productId,
              sku: line.sku,
              description: line.description,
              gtipCode: line.gtipCode,
              classificationStatus: line.classificationStatus,
              classificationSource: line.classificationSource,
              originCountryCode: line.originCountryCode,
              quantity: line.quantity,
              uom: line.uom,
              goodsValue: goodsC,
              allocatedFreight: allocFreight,
              customsValue: lineCustoms,
              componentType,
              componentStatus: "RULE_MISSING",
              taxableBase: null,
              ratePercent: null,
              amount: null,
              ruleId: null,
              ruleVersion: null,
              ruleSource: null,
              warning: "No configured rule — not evaluated (not zero)",
              overrideAmount: null,
              overrideReason: null,
              inputSources: {
                goods: line.goodsValueSource,
                freight: freight.source,
                insurance: insurance == null ? "MISSING" : "MANUAL",
              },
            });
            continue;
          }

          ruleIds.push(`${rule.id}:${rule.version}`);
          let base = lineCustoms;
          if (rule.baseFormula === "GOODS_VALUE") base = goodsC;
          if (rule.baseFormula === "GOODS_PLUS_FREIGHT") base = roundMoney(goodsC + allocFreight);
          if (rule.baseFormula === "GOODS_PLUS_FREIGHT_PLUS_DUTY") {
            base = roundMoney(lineCustoms + dutyAmount);
          }
          const rate = num(rule.ratePercent);
          const amount = roundMoney(base * (rate / 100));
          if (componentType === "CUSTOMS_DUTY") {
            dutyAmount = amount;
            dutyEvaluated = true;
          }
          if (componentType === "VAT" && rule.baseFormula === "GOODS_PLUS_FREIGHT_PLUS_DUTY" && !dutyEvaluated) {
            provisional = true;
          }

          built.push({
            purchaseOrderLineId: line.purchaseOrderLineId,
            productId: line.productId,
            sku: line.sku,
            description: line.description,
            gtipCode: line.gtipCode,
            classificationStatus: line.classificationStatus,
            classificationSource: line.classificationSource,
            originCountryCode: line.originCountryCode,
            quantity: line.quantity,
            uom: line.uom,
            goodsValue: goodsC,
            allocatedFreight: allocFreight,
            customsValue: lineCustoms,
            componentType,
            componentStatus: "EVALUATED",
            taxableBase: base,
            ratePercent: rate,
            amount,
            ruleId: rule.id,
            ruleVersion: rule.version,
            ruleSource: rule.source,
            warning:
              line.classificationStatus === "CANDIDATE"
                ? "GTİP is CANDIDATE — provisional estimate"
                : null,
            overrideAmount: null,
            overrideReason: null,
            inputSources: {
              goods: line.goodsValueSource,
              freight: freight.source,
              insurance: insurance == null ? "MISSING" : "MANUAL",
              rule: rule.source,
            },
          });
        }

        // Unsupported measures — never show as 0
        for (const componentType of ALWAYS_NOT_EVALUATED) {
          built.push({
            purchaseOrderLineId: line.purchaseOrderLineId,
            productId: line.productId,
            sku: line.sku,
            description: line.description,
            gtipCode: line.gtipCode,
            classificationStatus: line.classificationStatus,
            classificationSource: line.classificationSource,
            originCountryCode: line.originCountryCode,
            quantity: line.quantity,
            uom: line.uom,
            goodsValue: goodsC,
            allocatedFreight: allocFreight,
            customsValue: lineCustoms,
            componentType,
            componentStatus: "NOT_EVALUATED",
            taxableBase: null,
            ratePercent: null,
            amount: null,
            ruleId: null,
            ruleVersion: null,
            ruleSource: null,
            warning: "Not evaluated in V1 — rule/data not configured",
            overrideAmount: null,
            overrideReason: null,
            inputSources: {
              goods: line.goodsValueSource,
              freight: freight.source,
              insurance: insurance == null ? "MISSING" : "MANUAL",
            },
          });
        }
      }

      const uniqueDiagnostics = [...new Set(diagnostics)];
      const evaluatedTotal = roundMoney(
        built
          .filter((l) => l.componentStatus === "EVALUATED" || l.componentStatus === "OVERRIDDEN")
          .reduce((s, l) => s + (l.overrideAmount ?? l.amount ?? 0), 0),
      );

      let status: DutyTaxCalculationDto["status"] = "ESTIMATED";
      if (missingCritical) status = "INCOMPLETE";
      else if (provisional || uniqueDiagnostics.includes("RULE_MISSING") || uniqueDiagnostics.includes("RULE_CONFLICT")) {
        status = "PROVISIONAL";
      }

      const completenessLabel = dutyTaxCompletenessLabel({
        status,
        provisional,
        missingCritical,
      });

      const inputIdentity = {
        caseId,
        calcDate: calcDate.toISOString().slice(0, 10),
        lines: lines.map((l) => ({
          pol: l.purchaseOrderLineId,
          q: l.quantity,
          gtip: l.gtipCode,
          cls: l.classificationStatus,
          origin: l.originCountryCode,
          gv: l.goodsValue,
        })),
        freight: freight.amount,
        freightSource: freight.source,
        insurance,
        fxRate,
        fxSource,
        targetCurrency,
        method: input.freightAllocationMethod,
        goodsOverride: input.goodsValueOverride ?? null,
      };
      const inputHash = hashPayload(inputIdentity);
      const ruleSetFingerprint = hashPayload(ruleIds.sort());

      const current = await db.dutyTaxCalculation.findFirst({
        where: { customsCaseId: caseId, status: { not: "SUPERSEDED" } },
        orderBy: { version: "desc" },
        include: { lines: true },
      });

      if (
        current
        && current.inputHash === inputHash
        && current.ruleSetFingerprint === ruleSetFingerprint
        && current.status !== "SUPERSEDED"
      ) {
        const existingDto = mapCalc(current);
        await refreshLandedCost(caseRow.shipmentWorkspaceId);
        return existingDto;
      }

      const nextVersion = current ? current.version + 1 : 1;
      if (current) {
        const prevTotal = current.totalEvaluatedAmount == null ? null : num(current.totalEvaluatedAmount);
        await db.dutyTaxCalculation.update({
          where: { id: current.id },
          data: { status: "SUPERSEDED", supersededAt: new Date() },
        });
        if (
          prevTotal != null
          && prevTotal > 0
          && Math.abs(evaluatedTotal - prevTotal) / prevTotal >= MATERIAL_ESTIMATE_CHANGE_THRESHOLD
        ) {
          await issues.ensureAutomatedIssue({
            orderId: caseRow.orderWorkspaceId,
            automationKey: `duty_tax_estimate_changed:${caseId}`,
            title: "Material customs cost estimate change",
            description: `Estimated duties/taxes changed from ${prevTotal} to ${evaluatedTotal} ${targetCurrency}`,
            category: "OTHER",
            severity: "MEDIUM",
            relatedEntityType: "SHIPMENT",
            relatedEntityId: caseRow.shipmentWorkspaceId,
            impactType: "CUSTOMS_COST_RISK",
            ownerRole: "OPERATIONS",
            recommendedAction: "Review updated customs cost estimate",
            sourceEventType: "DUTY_TAX_ESTIMATE_CHANGED",
            sourceRuleId: "RULE_DUTY_TAX_ESTIMATE_CHANGED",
          });
        }
      }

      const created = await db.dutyTaxCalculation.create({
        data: {
          organisationId: caseRow.organisationId,
          customsCaseId: caseId,
          version: nextVersion,
          status,
          calculationDate: calcDate,
          calculationCurrency: targetCurrency,
          sourceCurrency,
          goodsValueEstimate: goodsConverted,
          freightAmount: freight.amount == null ? null : freightConverted,
          insuranceAmount: insurance == null ? null : insuranceConverted,
          customsValueEstimate: customsValueTotal,
          exchangeRate: fxRate,
          exchangeRateSource: fxSource,
          exchangeRateDate: input.exchangeRateDate ? new Date(input.exchangeRateDate) : null,
          freightAllocationMethod: input.freightAllocationMethod ?? "VALUE",
          totalEvaluatedAmount: missingCritical ? null : evaluatedTotal,
          provisional,
          completenessLabel,
          inputHash,
          ruleSetFingerprint,
          diagnostics: uniqueDiagnostics,
          createdById: actor.id,
          lines: {
            create: built.map((l) => ({
              purchaseOrderLineId: l.purchaseOrderLineId,
              productId: l.productId,
              sku: l.sku,
              description: l.description,
              gtipCode: l.gtipCode,
              classificationStatus: l.classificationStatus,
              classificationSource: l.classificationSource,
              originCountryCode: l.originCountryCode,
              quantity: l.quantity,
              uom: l.uom,
              goodsValue: l.goodsValue,
              allocatedFreight: l.allocatedFreight,
              customsValue: l.customsValue,
              componentType: l.componentType,
              componentStatus: l.componentStatus,
              taxableBase: l.taxableBase,
              ratePercent: l.ratePercent,
              amount: l.amount,
              ruleId: l.ruleId,
              ruleVersion: l.ruleVersion,
              ruleSource: l.ruleSource,
              warning: l.warning,
              inputSources: l.inputSources,
            })),
          },
        },
        include: { lines: true },
      });

      await db.customsCaseEvent.create({
        data: {
          customsCaseId: caseId,
          actorUserId: actor.id,
          source: String(actor.role) === "CUSTOMS_BROKER" ? "CUSTOMS_BROKER" : "DEMAXTORE_OPERATIONS",
          fromStatus: caseRow.status,
          toStatus: caseRow.status,
          reason: "DUTY_TAX_CALCULATION_CREATED",
          payload: {
            calculationId: created.id,
            version: created.version,
            status: created.status,
            totalEvaluatedAmount: created.totalEvaluatedAmount,
          },
        },
      });

      const dto = mapCalc(created);
      await syncIssues(caseRow, dto);
      await refreshLandedCost(caseRow.shipmentWorkspaceId);
      return dto;
    },

    async review(actor: AuthUser, caseId: string, input: DutyTaxReviewInput) {
      const { row: caseRow, access } = await requireCaseAccess(actor, caseId);
      if (access !== "BROKER" && access !== "OPS") {
        throw new AppError(403, "DUTY_TAX_REVIEW_FORBIDDEN");
      }
      const current = await db.dutyTaxCalculation.findFirst({
        where: { customsCaseId: caseId, status: { not: "SUPERSEDED" } },
        orderBy: { version: "desc" },
        include: { lines: true },
      });
      if (!current) throw new AppError(404, "DUTY_TAX_CALCULATION_NOT_FOUND");
      if (current.status === "INCOMPLETE") {
        throw new AppError(409, "DUTY_TAX_INCOMPLETE");
      }
      const updated = await db.dutyTaxCalculation.update({
        where: { id: current.id },
        data: {
          status: "BROKER_REVIEWED",
          reviewedAt: new Date(),
          reviewedById: actor.id,
          provisional: false,
          completenessLabel: "COMPLETE",
        },
        include: { lines: true },
      });
      await db.customsCaseEvent.create({
        data: {
          customsCaseId: caseId,
          actorUserId: actor.id,
          source: "CUSTOMS_BROKER",
          fromStatus: caseRow.status,
          toStatus: caseRow.status,
          reason: "DUTY_TAX_BROKER_REVIEWED",
          payload: { calculationId: updated.id, note: input.note ?? null },
        },
      });
      return mapCalc(updated);
    },

    async override(actor: AuthUser, caseId: string, input: DutyTaxOverrideInput) {
      const { row: caseRow, access } = await requireCaseAccess(actor, caseId);
      if (access !== "BROKER" && access !== "OPS") {
        throw new AppError(403, "DUTY_TAX_OVERRIDE_FORBIDDEN");
      }
      const current = await db.dutyTaxCalculation.findFirst({
        where: { customsCaseId: caseId, status: { not: "SUPERSEDED" } },
        orderBy: { version: "desc" },
        include: { lines: true },
      });
      if (!current) throw new AppError(404, "DUTY_TAX_CALCULATION_NOT_FOUND");
      const line = current.lines.find((l) => l.id === input.lineId);
      if (!line) throw new AppError(404, "DUTY_TAX_LINE_NOT_FOUND");
      if (line.componentStatus === "NOT_EVALUATED") {
        throw new AppError(400, "CANNOT_OVERRIDE_NOT_EVALUATED");
      }

      await db.dutyTaxCalculationLine.update({
        where: { id: line.id },
        data: {
          overrideAmount: input.overrideAmount,
          overrideReason: input.reason,
          overrideById: actor.id,
          overrideAt: new Date(),
          componentStatus: "OVERRIDDEN",
          warning: `Overridden from ${line.amount ?? "null"} — original retained`,
        },
      });

      const refreshedLines = await db.dutyTaxCalculationLine.findMany({
        where: { calculationId: current.id },
      });
      const total = roundMoney(
        refreshedLines
          .filter((l) => ["EVALUATED", "OVERRIDDEN"].includes(l.componentStatus))
          .reduce((s, l) => s + num(l.overrideAmount ?? l.amount ?? 0), 0),
      );
      const updated = await db.dutyTaxCalculation.update({
        where: { id: current.id },
        data: {
          totalEvaluatedAmount: total,
          status: "BROKER_REVIEWED",
          reviewedAt: new Date(),
          reviewedById: actor.id,
        },
        include: { lines: true },
      });

      await db.customsCaseEvent.create({
        data: {
          customsCaseId: caseId,
          actorUserId: actor.id,
          source: "CUSTOMS_BROKER",
          fromStatus: caseRow.status,
          toStatus: caseRow.status,
          reason: "DUTY_TAX_OVERRIDDEN",
          payload: {
            lineId: line.id,
            originalAmount: line.amount,
            overrideAmount: input.overrideAmount,
            reason: input.reason,
          },
        },
      });
      return mapCalc(updated);
    },

    async upsertRule(actor: AuthUser, input: DutyTaxRuleUpsertInput) {
      const role = String(actor.role);
      if (!["ADMIN", "SUPER_ADMIN", "OPS_MANAGER"].includes(role)) {
        throw new AppError(403, "DUTY_TAX_RULE_FORBIDDEN");
      }
      // New version: deactivate prior exact matches overlapping
      const existing = await db.dutyTaxRule.findMany({
        where: {
          active: true,
          componentType: input.componentType,
          gtipCode: input.gtipCode.trim(),
          originCountryCode: input.originCountryCode?.toUpperCase() ?? null,
        },
        orderBy: { version: "desc" },
      });
      const nextVersion = (existing[0]?.version ?? 0) + 1;
      if (existing.length) {
        await db.dutyTaxRule.updateMany({
          where: { id: { in: existing.map((e) => e.id) } },
          data: { active: false, effectiveTo: new Date(input.effectiveFrom) },
        });
      }
      const row = await db.dutyTaxRule.create({
        data: {
          componentType: input.componentType,
          gtipCode: input.gtipCode.trim(),
          originCountryCode: input.originCountryCode?.toUpperCase() ?? null,
          ratePercent: input.ratePercent,
          baseFormula: input.baseFormula,
          effectiveFrom: new Date(input.effectiveFrom),
          effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
          priority: input.priority,
          source: input.source,
          version: nextVersion,
          active: input.active,
          notes: input.notes ?? null,
          createdById: actor.id,
        },
      });
      return row;
    },

    async listRules(actor: AuthUser) {
      const role = String(actor.role);
      if (
        !["ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR", "BUYER", "CUSTOMS_BROKER"].includes(
          role,
        )
      ) {
        throw new AppError(403, "DUTY_TAX_RULE_FORBIDDEN");
      }
      // Buyers/brokers: read-only active rules metadata (no secret admin notes required)
      return db.dutyTaxRule.findMany({
        where: role === "BUYER" || role === "CUSTOMS_BROKER" ? { active: true } : undefined,
        orderBy: [{ gtipCode: "asc" }, { componentType: "asc" }, { version: "desc" }],
        take: 200,
      });
    },
  };
}

export type DutyTaxService = ReturnType<typeof createDutyTaxService>;

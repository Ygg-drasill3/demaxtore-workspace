/**
 * Sprint 42 — True Landed Cost Engine V1 (GLOBAL CORE).
 * Customer costs only. Unknown ≠ 0. Versioned snapshots.
 */
import { createHash } from "node:crypto";
import { LANDED_COST_REQUIRED_DEFAULT, LANDED_COST_REQUIRED_TURKEY, landedCostDisplayLabel, roundMoney, } from "@dmx/contracts/landed-cost";
import { AppError } from "../../utils/httpErrors.js";
import { canAccessShipment } from "../shipment/shipment.policy.js";
import { OperationalIssueService } from "../operational-issue/operational-issue.service.js";
import { OperationalTaskService } from "../operational-task/operational-task.service.js";
const MATERIAL_CHANGE_THRESHOLD = 0.1;
const CUSTOMS_LOCAL_TYPES = new Set([
    "CUSTOMS_BROKERAGE",
    "PORT_LOCAL",
    "TERMINAL",
    "DOCUMENTATION",
    "STORAGE",
]);
const DUTY_TAX_TYPES = new Set([
    "CUSTOMS_DUTY",
    "VAT",
    "ADDITIONAL_CUSTOMS_DUTY",
    "SCT_OTV",
    "ANTI_DUMPING",
    "OTHER_TAX",
]);
function n(v) {
    return Number(v ?? 0);
}
function iso(d) {
    return d ? d.toISOString() : null;
}
function hashInputs(payload) {
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 40);
}
export function createLandedCostService(db) {
    const issues = new OperationalIssueService(db);
    const tasks = new OperationalTaskService(db);
    async function assertBuyerAccess(actor, shipmentWorkspaceId) {
        const role = String(actor.role);
        if (["SUPPLIER", "ORIGIN_AGENT", "TRUCKER"].includes(role)) {
            throw new AppError(403, "LANDED_COST_FORBIDDEN");
        }
        if (role === "CUSTOMS_BROKER") {
            throw new AppError(403, "LANDED_COST_FORBIDDEN");
        }
        const ok = await canAccessShipment(db, actor, shipmentWorkspaceId);
        if (!ok && !["ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR", "FINANCE_OPERATOR"].includes(role)) {
            throw new AppError(403, "LANDED_COST_FORBIDDEN");
        }
    }
    async function orgForShipment(shipmentWorkspaceId) {
        const sw = await db.shipmentWorkspace.findUnique({
            where: { workspaceId: shipmentWorkspaceId },
            select: {
                workspaceId: true,
                orderWorkspaceId: true,
                buyerUserId: true,
                currency: true,
                freightOfferId: true,
            },
        });
        if (!sw)
            throw new AppError(404, "SHIPMENT_NOT_FOUND");
        const buyer = await db.user.findUnique({
            where: { id: sw.buyerUserId },
            select: { organisationId: true },
        });
        if (!buyer?.organisationId)
            throw new AppError(400, "SHIPMENT_BUYER_ORG_MISSING");
        return {
            organisationId: buyer.organisationId,
            orderWorkspaceId: sw.orderWorkspaceId,
            buyerUserId: sw.buyerUserId,
            currency: sw.currency,
            freightOfferId: sw.freightOfferId,
        };
    }
    function convert(amount, from, to, fxRates, diagnostics) {
        const a = from.toUpperCase();
        const b = to.toUpperCase();
        if (a === b)
            return { amount: roundMoney(amount), rate: 1 };
        const rate = fxRates[a];
        if (rate == null || !(rate > 0)) {
            diagnostics.push(`FX_RATE_MISSING:${a}->${b}`);
            return { amount: null, rate: null };
        }
        return { amount: roundMoney(amount * rate), rate };
    }
    async function resolveComponents(shipmentWorkspaceId, calcCurrency, fxRates) {
        const diagnostics = [];
        const components = [];
        const usedKeys = new Set();
        const push = (c) => {
            const key = `${c.componentType}:${c.sourceType}:${c.sourceId ?? "none"}`;
            if (c.inclusion === "INCLUDED" && usedKeys.has(key)) {
                diagnostics.push(`DEDUPED:${key}`);
                return;
            }
            if (c.inclusion === "INCLUDED")
                usedKeys.add(key);
            // Also dedupe by component category for freight/goods/inland primary sources
            if (c.inclusion === "INCLUDED"
                && ["GOODS", "FREIGHT", "INLAND_TRANSPORT", "INSURANCE"].includes(c.componentType)) {
                const catKey = `CAT:${c.componentType}`;
                if (usedKeys.has(catKey)) {
                    diagnostics.push(`DEDUPED_CATEGORY:${c.componentType}`);
                    return;
                }
                usedKeys.add(catKey);
            }
            components.push(c);
        };
        const meta = await orgForShipment(shipmentWorkspaceId);
        // Manual transaction costs first (actual preferred by sort)
        const manuals = await db.transactionCost.findMany({
            where: { shipmentWorkspaceId, deletedAt: null },
            orderBy: [{ costNature: "desc" }, { createdAt: "desc" }],
        });
        const manualByType = new Map();
        for (const m of manuals) {
            if (!manualByType.has(m.componentType))
                manualByType.set(m.componentType, m);
        }
        // GOODS — allocation × unitPrice
        const allocations = await db.shipmentLineAllocation.findMany({
            where: { shipmentWorkspaceId },
            include: {
                purchaseOrderLine: {
                    select: {
                        id: true,
                        quantity: true,
                        unitPrice: true,
                        purchaseOrder: { select: { id: true, currency: true, poNumber: true } },
                    },
                },
            },
        });
        let goodsOriginal = 0;
        let goodsCurrency = null;
        let goodsMixed = false;
        const goodsLines = [];
        for (const a of allocations) {
            const unit = n(a.purchaseOrderLine.unitPrice);
            const qty = n(a.quantity);
            const cur = (a.purchaseOrderLine.purchaseOrder.currency || "USD").toUpperCase();
            const line = roundMoney(unit * qty);
            goodsLines.push({
                allocationId: a.id,
                poLineId: a.purchaseOrderLineId,
                quantity: qty,
                unitPrice: unit,
                currency: cur,
                amount: line,
            });
            if (!goodsCurrency)
                goodsCurrency = cur;
            else if (goodsCurrency !== cur)
                goodsMixed = true;
            if (!goodsMixed)
                goodsOriginal = roundMoney(goodsOriginal + line);
        }
        if (allocations.length === 0) {
            push({
                componentType: "GOODS",
                sourceType: "PURCHASE_ORDER",
                sourceId: null,
                amountOriginal: null,
                currencyOriginal: null,
                fxRate: null,
                amountCalculationCurrency: null,
                costNature: "ACTUAL",
                inclusion: "MISSING",
                description: "No shipment line allocations",
                allocationMethod: "QUANTITY",
                provenance: {},
            });
            diagnostics.push("GOODS_COST_MISSING");
        }
        else if (goodsMixed) {
            // Convert each line
            let sum = 0;
            for (const g of goodsLines) {
                const conv = convert(n(g.amount), String(g.currency), calcCurrency, fxRates, diagnostics);
                if (conv.amount == null) {
                    sum = null;
                    break;
                }
                sum = roundMoney((sum ?? 0) + conv.amount);
            }
            push({
                componentType: "GOODS",
                sourceType: "PURCHASE_ORDER",
                sourceId: shipmentWorkspaceId,
                amountOriginal: null,
                currencyOriginal: "MULTI",
                fxRate: null,
                amountCalculationCurrency: sum,
                costNature: "ACTUAL",
                inclusion: sum == null ? "MISSING" : "INCLUDED",
                description: "Multi-currency goods via allocations",
                allocationMethod: "QUANTITY",
                provenance: { lines: goodsLines },
            });
            if (sum == null)
                diagnostics.push("GOODS_COST_MISSING");
        }
        else {
            const conv = convert(goodsOriginal, goodsCurrency, calcCurrency, fxRates, diagnostics);
            push({
                componentType: "GOODS",
                sourceType: "PURCHASE_ORDER",
                sourceId: shipmentWorkspaceId,
                amountOriginal: goodsOriginal,
                currencyOriginal: goodsCurrency,
                fxRate: conv.rate,
                amountCalculationCurrency: conv.amount,
                costNature: "ACTUAL",
                inclusion: conv.amount == null ? "MISSING" : "INCLUDED",
                description: "Shipment allocated PO goods cost",
                allocationMethod: "QUANTITY",
                provenance: { lines: goodsLines },
            });
            if (conv.amount == null)
                diagnostics.push("GOODS_COST_MISSING");
        }
        // FREIGHT — priority: manual ACTUAL > manual EST > FreightIQ display
        const manualFreight = manualByType.get("FREIGHT");
        if (manualFreight) {
            const conv = convert(n(manualFreight.amount), manualFreight.currency, calcCurrency, fxRates, diagnostics);
            push({
                componentType: "FREIGHT",
                sourceType: manualFreight.sourceType,
                sourceId: manualFreight.id,
                amountOriginal: n(manualFreight.amount),
                currencyOriginal: manualFreight.currency,
                fxRate: conv.rate,
                amountCalculationCurrency: conv.amount,
                costNature: manualFreight.costNature,
                inclusion: conv.amount == null ? "MISSING" : "INCLUDED",
                description: manualFreight.description,
                allocationMethod: null,
                provenance: { transactionCostId: manualFreight.id },
            });
        }
        else if (meta.freightOfferId) {
            const offer = await db.freightOffer.findUnique({
                where: { id: meta.freightOfferId },
                select: {
                    id: true,
                    displayPriceUsd: true,
                    price: true,
                    currency: true,
                    // intentionally NOT selecting internalCostUsd / freightiqMarginUsd for buyer calc
                },
            });
            const display = offer?.displayPriceUsd != null ? n(offer.displayPriceUsd) : offer ? n(offer.price) : null;
            if (display != null && offer) {
                const cur = offer.displayPriceUsd != null ? "USD" : offer.currency;
                const conv = convert(display, cur, calcCurrency, fxRates, diagnostics);
                push({
                    componentType: "FREIGHT",
                    sourceType: "FREIGHTIQ",
                    sourceId: offer.id,
                    amountOriginal: display,
                    currencyOriginal: cur,
                    fxRate: conv.rate,
                    amountCalculationCurrency: conv.amount,
                    costNature: "ESTIMATED",
                    inclusion: conv.amount == null ? "MISSING" : "INCLUDED",
                    description: "Selected FreightIQ customer-facing freight",
                    allocationMethod: null,
                    provenance: { freightOfferId: offer.id, field: offer.displayPriceUsd != null ? "displayPriceUsd" : "price" },
                });
            }
            else {
                push({
                    componentType: "FREIGHT",
                    sourceType: "FREIGHTIQ",
                    sourceId: meta.freightOfferId,
                    amountOriginal: null,
                    currencyOriginal: null,
                    fxRate: null,
                    amountCalculationCurrency: null,
                    costNature: "ESTIMATED",
                    inclusion: "MISSING",
                    description: "Freight offer missing customer price",
                    allocationMethod: null,
                    provenance: {},
                });
                diagnostics.push("FREIGHT_COST_MISSING");
            }
        }
        else {
            push({
                componentType: "FREIGHT",
                sourceType: "FREIGHTIQ",
                sourceId: null,
                amountOriginal: null,
                currencyOriginal: null,
                fxRate: null,
                amountCalculationCurrency: null,
                costNature: "ESTIMATED",
                inclusion: "MISSING",
                description: "No freight offer linked",
                allocationMethod: null,
                provenance: {},
            });
            diagnostics.push("FREIGHT_COST_MISSING");
        }
        // INSURANCE — manual or DutyTax insuranceAmount; else optional absent
        const manualIns = manualByType.get("INSURANCE");
        const customsCase = await db.customsCase.findUnique({
            where: { shipmentWorkspaceId },
            select: { id: true, status: true },
        });
        const turkeyPath = !!customsCase;
        let dutyCalc = null;
        if (customsCase) {
            dutyCalc = await db.dutyTaxCalculation.findFirst({
                where: {
                    customsCaseId: customsCase.id,
                    status: { not: "SUPERSEDED" },
                },
                orderBy: { version: "desc" },
                select: {
                    id: true,
                    version: true,
                    status: true,
                    calculationCurrency: true,
                    insuranceAmount: true,
                    exchangeRate: true,
                    lines: {
                        select: {
                            id: true,
                            componentType: true,
                            amount: true,
                            componentStatus: true,
                        },
                    },
                },
            });
        }
        if (manualIns) {
            const conv = convert(n(manualIns.amount), manualIns.currency, calcCurrency, fxRates, diagnostics);
            push({
                componentType: "INSURANCE",
                sourceType: manualIns.sourceType,
                sourceId: manualIns.id,
                amountOriginal: n(manualIns.amount),
                currencyOriginal: manualIns.currency,
                fxRate: conv.rate,
                amountCalculationCurrency: conv.amount,
                costNature: manualIns.costNature,
                inclusion: conv.amount == null ? "MISSING" : "INCLUDED",
                description: manualIns.description,
                allocationMethod: null,
                provenance: { transactionCostId: manualIns.id },
            });
        }
        else if (dutyCalc?.insuranceAmount != null && n(dutyCalc.insuranceAmount) > 0) {
            const conv = convert(n(dutyCalc.insuranceAmount), dutyCalc.calculationCurrency, calcCurrency, fxRates, diagnostics);
            push({
                componentType: "INSURANCE",
                sourceType: "CUSTOMS_DUTY_TAX_ENGINE",
                sourceId: dutyCalc.id,
                amountOriginal: n(dutyCalc.insuranceAmount),
                currencyOriginal: dutyCalc.calculationCurrency,
                fxRate: conv.rate,
                amountCalculationCurrency: conv.amount,
                costNature: "ESTIMATED",
                inclusion: conv.amount == null ? "MISSING" : "INCLUDED",
                description: "Insurance from Duty & Tax calculation input",
                allocationMethod: null,
                provenance: { dutyTaxCalculationId: dutyCalc.id, version: dutyCalc.version },
            });
        }
        else {
            push({
                componentType: "INSURANCE",
                sourceType: "OTHER",
                sourceId: null,
                amountOriginal: null,
                currencyOriginal: null,
                fxRate: null,
                amountCalculationCurrency: null,
                costNature: "ESTIMATED",
                inclusion: "OPTIONAL_ABSENT",
                description: "Insurance not provided",
                allocationMethod: null,
                provenance: {},
            });
        }
        // Duty & Tax components (do NOT re-include goods/freight from duty tax)
        if (dutyCalc) {
            const byType = new Map();
            for (const line of dutyCalc.lines) {
                if (!["EVALUATED", "OVERRIDDEN"].includes(line.componentStatus))
                    continue;
                if (line.amount == null)
                    continue;
                const t = line.componentType;
                if (!DUTY_TAX_TYPES.has(t) && t !== "OTHER")
                    continue;
                byType.set(t, roundMoney((byType.get(t) ?? 0) + n(line.amount)));
            }
            if (byType.size === 0) {
                diagnostics.push("DUTY_TAX_NOT_AVAILABLE");
                push({
                    componentType: "CUSTOMS_DUTY",
                    sourceType: "CUSTOMS_DUTY_TAX_ENGINE",
                    sourceId: dutyCalc.id,
                    amountOriginal: null,
                    currencyOriginal: dutyCalc.calculationCurrency,
                    fxRate: null,
                    amountCalculationCurrency: null,
                    costNature: "ESTIMATED",
                    inclusion: "MISSING",
                    description: `DutyTax ${dutyCalc.status} has no evaluated tax lines`,
                    allocationMethod: null,
                    provenance: { dutyTaxCalculationId: dutyCalc.id, version: dutyCalc.version },
                });
            }
            else {
                for (const [t, amount] of byType) {
                    const conv = convert(amount, dutyCalc.calculationCurrency, calcCurrency, fxRates, diagnostics);
                    const mapped = (DUTY_TAX_TYPES.has(t) ? t : "OTHER_TAX");
                    push({
                        componentType: mapped,
                        sourceType: "CUSTOMS_DUTY_TAX_ENGINE",
                        sourceId: `${dutyCalc.id}:${t}`,
                        amountOriginal: amount,
                        currencyOriginal: dutyCalc.calculationCurrency,
                        fxRate: conv.rate,
                        amountCalculationCurrency: conv.amount,
                        costNature: "ESTIMATED",
                        inclusion: conv.amount == null ? "MISSING" : "INCLUDED",
                        description: `Duty & Tax ${t} (v${dutyCalc.version}, ${dutyCalc.status})`,
                        allocationMethod: null,
                        provenance: {
                            dutyTaxCalculationId: dutyCalc.id,
                            version: dutyCalc.version,
                            status: dutyCalc.status,
                        },
                    });
                }
            }
        }
        else if (turkeyPath) {
            diagnostics.push("DUTY_TAX_NOT_AVAILABLE");
            push({
                componentType: "CUSTOMS_DUTY",
                sourceType: "CUSTOMS_DUTY_TAX_ENGINE",
                sourceId: null,
                amountOriginal: null,
                currencyOriginal: null,
                fxRate: null,
                amountCalculationCurrency: null,
                costNature: "ESTIMATED",
                inclusion: "MISSING",
                description: "No DutyTaxCalculation for customs case",
                allocationMethod: null,
                provenance: { customsCaseId: customsCase.id },
            });
        }
        // Customs / local manuals
        for (const t of CUSTOMS_LOCAL_TYPES) {
            const m = manualByType.get(t);
            if (!m)
                continue;
            const conv = convert(n(m.amount), m.currency, calcCurrency, fxRates, diagnostics);
            push({
                componentType: t,
                sourceType: m.sourceType,
                sourceId: m.id,
                amountOriginal: n(m.amount),
                currencyOriginal: m.currency,
                fxRate: conv.rate,
                amountCalculationCurrency: conv.amount,
                costNature: m.costNature,
                inclusion: conv.amount == null ? "MISSING" : "INCLUDED",
                description: m.description,
                allocationMethod: null,
                provenance: { transactionCostId: m.id },
            });
        }
        // Inland
        const inland = await db.inlandDelivery.findUnique({
            where: { shipmentWorkspaceId },
        });
        const manualInland = manualByType.get("INLAND_TRANSPORT");
        if (manualInland && (manualInland.costNature === "ACTUAL" || !inland?.inlandCostAmount)) {
            const conv = convert(n(manualInland.amount), manualInland.currency, calcCurrency, fxRates, diagnostics);
            push({
                componentType: "INLAND_TRANSPORT",
                sourceType: manualInland.sourceType,
                sourceId: manualInland.id,
                amountOriginal: n(manualInland.amount),
                currencyOriginal: manualInland.currency,
                fxRate: conv.rate,
                amountCalculationCurrency: conv.amount,
                costNature: manualInland.costNature,
                inclusion: conv.amount == null ? "MISSING" : "INCLUDED",
                description: manualInland.description,
                allocationMethod: null,
                provenance: { transactionCostId: manualInland.id },
            });
        }
        else if (inland?.inlandCostAmount != null) {
            const cur = inland.inlandCostCurrency ?? calcCurrency;
            const conv = convert(n(inland.inlandCostAmount), cur, calcCurrency, fxRates, diagnostics);
            push({
                componentType: "INLAND_TRANSPORT",
                sourceType: "INLAND_EXECUTION",
                sourceId: inland.id,
                amountOriginal: n(inland.inlandCostAmount),
                currencyOriginal: cur,
                fxRate: conv.rate,
                amountCalculationCurrency: conv.amount,
                costNature: (inland.inlandCostKind === "ACTUAL" ? "ACTUAL" : "ESTIMATED"),
                inclusion: conv.amount == null ? "MISSING" : "INCLUDED",
                description: "Inland delivery customer cost",
                allocationMethod: null,
                provenance: {
                    inlandDeliveryId: inland.id,
                    inlandCostSource: inland.inlandCostSource,
                    // never include partner buy
                },
            });
        }
        else if (manualInland) {
            const conv = convert(n(manualInland.amount), manualInland.currency, calcCurrency, fxRates, diagnostics);
            push({
                componentType: "INLAND_TRANSPORT",
                sourceType: manualInland.sourceType,
                sourceId: manualInland.id,
                amountOriginal: n(manualInland.amount),
                currencyOriginal: manualInland.currency,
                fxRate: conv.rate,
                amountCalculationCurrency: conv.amount,
                costNature: manualInland.costNature,
                inclusion: conv.amount == null ? "MISSING" : "INCLUDED",
                description: manualInland.description,
                allocationMethod: null,
                provenance: { transactionCostId: manualInland.id },
            });
        }
        else if (turkeyPath) {
            push({
                componentType: "INLAND_TRANSPORT",
                sourceType: "INLAND_EXECUTION",
                sourceId: inland?.id ?? null,
                amountOriginal: null,
                currencyOriginal: null,
                fxRate: null,
                amountCalculationCurrency: null,
                costNature: "ESTIMATED",
                inclusion: "MISSING",
                description: "Inland cost not recorded",
                allocationMethod: null,
                provenance: {},
            });
            diagnostics.push("INLAND_COST_MISSING");
        }
        else {
            push({
                componentType: "INLAND_TRANSPORT",
                sourceType: "INLAND_EXECUTION",
                sourceId: null,
                amountOriginal: null,
                currencyOriginal: null,
                fxRate: null,
                amountCalculationCurrency: null,
                costNature: "ESTIMATED",
                inclusion: "OPTIONAL_ABSENT",
                description: "Inland not applicable / not provided",
                allocationMethod: null,
                provenance: {},
            });
        }
        // OTHER manuals (DEMURRAGE, DETENTION, OTHER, …)
        for (const m of manuals) {
            if (["GOODS", "FREIGHT", "INSURANCE", "INLAND_TRANSPORT", ...CUSTOMS_LOCAL_TYPES, ...DUTY_TAX_TYPES].includes(m.componentType)) {
                continue;
            }
            if (manualByType.get(m.componentType)?.id !== m.id)
                continue;
            const conv = convert(n(m.amount), m.currency, calcCurrency, fxRates, diagnostics);
            push({
                componentType: m.componentType,
                sourceType: m.sourceType,
                sourceId: m.id,
                amountOriginal: n(m.amount),
                currencyOriginal: m.currency,
                fxRate: conv.rate,
                amountCalculationCurrency: conv.amount,
                costNature: m.costNature,
                inclusion: conv.amount == null ? "MISSING" : "INCLUDED",
                description: m.description,
                allocationMethod: null,
                provenance: { transactionCostId: m.id },
            });
        }
        const required = turkeyPath
            ? [...LANDED_COST_REQUIRED_TURKEY]
            : [...LANDED_COST_REQUIRED_DEFAULT];
        return { components, diagnostics: [...new Set(diagnostics)], required, turkeyPath };
    }
    function deriveStatus(components, required) {
        const missingRequired = required.filter((r) => {
            if (r === "CUSTOMS_DUTY") {
                return !components.some((c) => DUTY_TAX_TYPES.has(c.componentType) && c.inclusion === "INCLUDED");
            }
            return !components.some((c) => c.componentType === r && c.inclusion === "INCLUDED");
        });
        const included = components.filter((c) => c.inclusion === "INCLUDED");
        if (missingRequired.length > 0) {
            return {
                status: "INCOMPLETE",
                completeness: included.length ? "PARTIAL" : "INCOMPLETE",
                missingCount: missingRequired.length,
            };
        }
        const natures = new Set(included.map((c) => c.costNature));
        if (natures.size === 1 && natures.has("ACTUAL")) {
            return { status: "ACTUAL", completeness: "COMPLETE", missingCount: 0 };
        }
        if (natures.size === 1 && natures.has("ESTIMATED")) {
            return { status: "ESTIMATED", completeness: "COMPLETE", missingCount: 0 };
        }
        return { status: "MIXED", completeness: "COMPLETE", missingCount: 0 };
    }
    function toDto(row) {
        const status = row.status;
        const comps = (row.components ?? []).map((c) => ({
            id: c.id,
            componentType: c.componentType,
            sourceType: c.sourceType,
            sourceId: c.sourceId,
            amountOriginal: c.amountOriginal == null ? null : n(c.amountOriginal),
            currencyOriginal: c.currencyOriginal,
            fxRate: c.fxRate == null ? null : n(c.fxRate),
            amountCalculationCurrency: c.amountCalculationCurrency == null ? null : n(c.amountCalculationCurrency),
            costNature: c.costNature,
            inclusion: c.inclusion,
            description: c.description,
            allocationMethod: c.allocationMethod,
            provenance: (c.provenance ?? {}),
        }));
        return {
            id: row.id,
            organisationId: row.organisationId,
            scopeType: row.scopeType,
            scopeId: row.scopeId,
            shipmentWorkspaceId: row.shipmentWorkspaceId,
            orderWorkspaceId: row.orderWorkspaceId,
            version: row.version,
            status,
            displayLabel: landedCostDisplayLabel(status),
            calculationCurrency: row.calculationCurrency,
            exchangeRate: row.exchangeRate == null ? null : n(row.exchangeRate),
            exchangeRateSource: row.exchangeRateSource,
            exchangeRateDate: iso(row.exchangeRateDate),
            goodsCost: row.goodsCost == null ? null : n(row.goodsCost),
            freightCost: row.freightCost == null ? null : n(row.freightCost),
            insuranceCost: row.insuranceCost == null ? null : n(row.insuranceCost),
            dutyTaxCost: row.dutyTaxCost == null ? null : n(row.dutyTaxCost),
            customsLocalCost: row.customsLocalCost == null ? null : n(row.customsLocalCost),
            inlandCost: row.inlandCost == null ? null : n(row.inlandCost),
            otherCost: row.otherCost == null ? null : n(row.otherCost),
            knownSubtotal: n(row.knownSubtotal),
            totalLandedCost: row.totalLandedCost == null ? null : n(row.totalLandedCost),
            estimatedAmount: n(row.estimatedAmount),
            actualAmount: n(row.actualAmount),
            missingComponentCount: row.missingComponentCount,
            completeness: row.completeness,
            diagnostics: Array.isArray(row.diagnostics) ? row.diagnostics : [],
            inputHash: row.inputHash,
            components: comps,
            calculatedAt: row.calculatedAt.toISOString(),
            createdAt: row.createdAt.toISOString(),
            supersededAt: iso(row.supersededAt),
        };
    }
    async function syncExceptions(orderWorkspaceId, shipmentWorkspaceId, calc, prevTotal) {
        const keyMissing = `landed_cost_input_missing:${shipmentWorkspaceId}`;
        if (calc.status === "INCOMPLETE" && calc.missingComponentCount > 0) {
            const task = await tasks.ensureAutomatedTask({
                orderId: orderWorkspaceId,
                automationKey: `task:${keyMissing}`,
                title: "Provide missing landed cost inputs",
                description: "Required cost components are missing for True Landed Cost",
                priority: "MEDIUM",
                relatedEntityType: "SHIPMENT",
                relatedEntityId: shipmentWorkspaceId,
                dueInDays: 3,
            });
            await issues.ensureAutomatedIssue({
                orderId: orderWorkspaceId,
                automationKey: keyMissing,
                title: "Landed cost input missing",
                description: `${calc.missingComponentCount} required component(s) missing`,
                category: "OTHER",
                severity: "MEDIUM",
                relatedEntityType: "SHIPMENT",
                relatedEntityId: shipmentWorkspaceId,
                assignedTaskId: task.id,
                impactType: "LANDED_COST_RISK",
                ownerRole: "OPERATIONS",
                recommendedAction: "Add missing cost or run Duty/Tax / Inland cost recording",
                sourceEventType: "LANDED_COST_INPUT_MISSING",
                sourceRuleId: "RULE_LANDED_COST_INPUT_MISSING",
            });
        }
        else {
            const open = await db.operationalIssue.findFirst({
                where: {
                    orderId: orderWorkspaceId,
                    automationKey: keyMissing,
                    status: { in: ["OPEN", "IN_PROGRESS"] },
                    deletedAt: null,
                },
            });
            if (open) {
                await db.operationalIssue.update({
                    where: { id: open.id },
                    data: { status: "RESOLVED", resolvedAt: new Date(), resolutionNote: "Inputs provided" },
                });
            }
        }
        if (prevTotal != null
            && calc.totalLandedCost != null
            && prevTotal > 0
            && Math.abs(calc.totalLandedCost - prevTotal) / prevTotal >= MATERIAL_CHANGE_THRESHOLD) {
            const key = `landed_cost_material_change:${shipmentWorkspaceId}`;
            await issues.ensureAutomatedIssue({
                orderId: orderWorkspaceId,
                automationKey: key,
                title: "Landed cost material change",
                description: `Total changed from ${prevTotal} to ${calc.totalLandedCost} (v${calc.version})`,
                category: "OTHER",
                severity: "MEDIUM",
                relatedEntityType: "SHIPMENT",
                relatedEntityId: shipmentWorkspaceId,
                impactType: "LANDED_COST_RISK",
                ownerRole: "OPERATIONS",
                recommendedAction: "Review cost component changes",
                sourceEventType: "LANDED_COST_MATERIAL_CHANGE",
                sourceRuleId: "RULE_LANDED_COST_MATERIAL_CHANGE",
            });
        }
    }
    return {
        async addTransactionCost(actor, input) {
            await assertBuyerAccess(actor, input.shipmentWorkspaceId);
            const role = String(actor.role);
            if (role === "CUSTOMS_BROKER" && !CUSTOMS_LOCAL_TYPES.has(input.componentType) && !DUTY_TAX_TYPES.has(input.componentType)) {
                throw new AppError(403, "LANDED_COST_FORBIDDEN");
            }
            const meta = await orgForShipment(input.shipmentWorkspaceId);
            const row = await db.transactionCost.create({
                data: {
                    organisationId: meta.organisationId,
                    shipmentWorkspaceId: input.shipmentWorkspaceId,
                    orderWorkspaceId: meta.orderWorkspaceId,
                    customsCaseId: input.customsCaseId ?? null,
                    inlandDeliveryId: input.inlandDeliveryId ?? null,
                    componentType: input.componentType,
                    amount: input.amount,
                    currency: input.currency.toUpperCase(),
                    costNature: input.costNature,
                    sourceType: input.sourceType,
                    description: input.description,
                    documentId: input.documentId ?? null,
                    incurredAt: input.incurredAt ? new Date(input.incurredAt) : null,
                    createdById: actor.id,
                },
            });
            return row;
        },
        async calculate(actor, input) {
            await assertBuyerAccess(actor, input.shipmentWorkspaceId);
            const meta = await orgForShipment(input.shipmentWorkspaceId);
            const calcCurrency = (input.calculationCurrency || meta.currency || "USD").toUpperCase();
            const fxRates = { ...(input.fxRates ?? {}) };
            // Identity
            fxRates[calcCurrency] = 1;
            // If single exchangeRate provided, treat as USD→calc or source→calc helper for USD
            if (input.exchangeRate && input.exchangeRate > 0 && !fxRates.USD && calcCurrency !== "USD") {
                fxRates.USD = input.exchangeRate;
            }
            // Pull FX from latest duty tax if available
            const cc = await db.customsCase.findUnique({
                where: { shipmentWorkspaceId: input.shipmentWorkspaceId },
                select: { id: true },
            });
            if (cc) {
                const dt = await db.dutyTaxCalculation.findFirst({
                    where: { customsCaseId: cc.id, status: { not: "SUPERSEDED" } },
                    orderBy: { version: "desc" },
                    select: {
                        calculationCurrency: true,
                        sourceCurrency: true,
                        exchangeRate: true,
                        exchangeRateSource: true,
                    },
                });
                if (dt?.exchangeRate && dt.sourceCurrency && dt.calculationCurrency === calcCurrency) {
                    const src = dt.sourceCurrency.toUpperCase();
                    if (!fxRates[src])
                        fxRates[src] = n(dt.exchangeRate);
                }
            }
            const resolved = await resolveComponents(input.shipmentWorkspaceId, calcCurrency, fxRates);
            const { status, completeness, missingCount } = deriveStatus(resolved.components, resolved.required);
            const included = resolved.components.filter((c) => c.inclusion === "INCLUDED");
            const sumType = (pred) => {
                const vals = included.filter((c) => pred(c.componentType)).map((c) => c.amountCalculationCurrency);
                if (!vals.length)
                    return null;
                // Unknown ≠ 0: a single unresolved amount makes the whole subtotal unknown.
                let total = 0;
                for (const v of vals) {
                    if (v == null)
                        return null;
                    total += v;
                }
                return roundMoney(total);
            };
            const goodsCost = sumType((t) => t === "GOODS");
            const freightCost = sumType((t) => t === "FREIGHT");
            const insuranceCost = sumType((t) => t === "INSURANCE");
            const dutyTaxCost = sumType((t) => DUTY_TAX_TYPES.has(t));
            const customsLocalCost = sumType((t) => CUSTOMS_LOCAL_TYPES.has(t));
            const inlandCost = sumType((t) => t === "INLAND_TRANSPORT");
            const otherCost = sumType((t) => !["GOODS", "FREIGHT", "INSURANCE", "INLAND_TRANSPORT"].includes(t)
                && !DUTY_TAX_TYPES.has(t)
                && !CUSTOMS_LOCAL_TYPES.has(t));
            const knownSubtotal = roundMoney(included.reduce((a, c) => a + (c.amountCalculationCurrency ?? 0), 0));
            const estimatedAmount = roundMoney(included.filter((c) => c.costNature === "ESTIMATED").reduce((a, c) => a + (c.amountCalculationCurrency ?? 0), 0));
            const actualAmount = roundMoney(included.filter((c) => c.costNature === "ACTUAL").reduce((a, c) => a + (c.amountCalculationCurrency ?? 0), 0));
            const totalLandedCost = status === "INCOMPLETE" ? null : knownSubtotal;
            const inputHash = hashInputs({
                shipmentWorkspaceId: input.shipmentWorkspaceId,
                calcCurrency,
                fxRates,
                components: resolved.components.map((c) => ({
                    t: c.componentType,
                    s: c.sourceType,
                    id: c.sourceId,
                    a: c.amountCalculationCurrency,
                    n: c.costNature,
                    i: c.inclusion,
                })),
            });
            const current = await db.landedCostCalculation.findFirst({
                where: {
                    scopeType: "SHIPMENT",
                    scopeId: input.shipmentWorkspaceId,
                    status: { not: "SUPERSEDED" },
                },
                orderBy: { version: "desc" },
                include: { components: true },
            });
            if (current && current.inputHash === inputHash) {
                return toDto(current);
            }
            const prevTotal = current?.totalLandedCost != null ? n(current.totalLandedCost) : null;
            const nextVersion = current ? current.version + 1 : 1;
            if (current) {
                await db.landedCostCalculation.update({
                    where: { id: current.id },
                    data: { status: "SUPERSEDED", supersededAt: new Date() },
                });
            }
            const created = await db.landedCostCalculation.create({
                data: {
                    organisationId: meta.organisationId,
                    scopeType: "SHIPMENT",
                    scopeId: input.shipmentWorkspaceId,
                    shipmentWorkspaceId: input.shipmentWorkspaceId,
                    orderWorkspaceId: meta.orderWorkspaceId,
                    version: nextVersion,
                    status,
                    calculationCurrency: calcCurrency,
                    exchangeRate: input.exchangeRate ?? null,
                    exchangeRateSource: input.exchangeRateSource ?? (Object.keys(fxRates).length ? "MANUAL" : "IDENTITY"),
                    exchangeRateDate: input.exchangeRateDate ? new Date(input.exchangeRateDate) : null,
                    fxSnapshot: fxRates,
                    goodsCost,
                    freightCost,
                    insuranceCost,
                    dutyTaxCost,
                    customsLocalCost,
                    inlandCost,
                    otherCost,
                    knownSubtotal,
                    totalLandedCost,
                    estimatedAmount,
                    actualAmount,
                    missingComponentCount: missingCount,
                    completeness,
                    diagnostics: resolved.diagnostics,
                    inputHash,
                    calculatedAt: new Date(),
                    createdById: actor.id,
                    components: {
                        create: resolved.components.map((c) => ({
                            componentType: c.componentType,
                            sourceType: c.sourceType,
                            sourceId: c.sourceId,
                            amountOriginal: c.amountOriginal,
                            currencyOriginal: c.currencyOriginal,
                            fxRate: c.fxRate,
                            amountCalculationCurrency: c.amountCalculationCurrency,
                            costNature: c.costNature,
                            inclusion: c.inclusion,
                            description: c.description,
                            allocationMethod: c.allocationMethod,
                            provenance: c.provenance,
                        })),
                    },
                },
                include: { components: true },
            });
            await syncExceptions(meta.orderWorkspaceId, input.shipmentWorkspaceId, {
                id: created.id,
                status,
                missingComponentCount: missingCount,
                version: nextVersion,
                totalLandedCost,
            }, prevTotal);
            return toDto(created);
        },
        async get(actor, id) {
            const row = await db.landedCostCalculation.findUnique({
                where: { id },
                include: { components: true },
            });
            if (!row)
                throw new AppError(404, "LANDED_COST_NOT_FOUND");
            if (row.shipmentWorkspaceId)
                await assertBuyerAccess(actor, row.shipmentWorkspaceId);
            else
                throw new AppError(403, "LANDED_COST_FORBIDDEN");
            return toDto(row);
        },
        async currentByShipment(actor, shipmentWorkspaceId) {
            await assertBuyerAccess(actor, shipmentWorkspaceId);
            const row = await db.landedCostCalculation.findFirst({
                where: {
                    scopeType: "SHIPMENT",
                    scopeId: shipmentWorkspaceId,
                    status: { not: "SUPERSEDED" },
                },
                orderBy: { version: "desc" },
                include: { components: true },
            });
            return row ? toDto(row) : null;
        },
        async versions(actor, shipmentWorkspaceId) {
            await assertBuyerAccess(actor, shipmentWorkspaceId);
            const rows = await db.landedCostCalculation.findMany({
                where: { scopeType: "SHIPMENT", scopeId: shipmentWorkspaceId },
                orderBy: { version: "desc" },
                take: 50,
                include: { components: true },
            });
            return { items: rows.map(toDto) };
        },
        async list(actor) {
            const role = String(actor.role);
            if (["SUPPLIER", "ORIGIN_AGENT", "TRUCKER", "CUSTOMS_BROKER"].includes(role)) {
                throw new AppError(403, "LANDED_COST_FORBIDDEN");
            }
            const where = { status: { not: "SUPERSEDED" }, scopeType: "SHIPMENT" };
            if (role === "BUYER") {
                const u = await db.user.findUnique({
                    where: { id: actor.id },
                    select: { organisationId: true },
                });
                if (!u?.organisationId)
                    return { items: [] };
                where.organisationId = u.organisationId;
            }
            const rows = await db.landedCostCalculation.findMany({
                where,
                orderBy: { updatedAt: "desc" },
                take: 80,
                include: { components: true },
            });
            return { items: rows.map(toDto) };
        },
    };
}
//# sourceMappingURL=landed-cost.service.js.map
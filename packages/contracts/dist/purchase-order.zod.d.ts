import { z } from "zod";
/** Sprint 29-01 — typed revision snapshot (lenient; historical JSON varies). */
export declare const RevisionSnapshotLineSchema: z.ZodObject<{
    sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description?: string | null | undefined;
    unit?: string | null | undefined;
    unitPrice?: number | null | undefined;
    productName?: string | null | undefined;
    lineTotal?: number | null | undefined;
    quantity?: number | null | undefined;
    sku?: string | null | undefined;
    productCode?: string | null | undefined;
    specification?: string | null | undefined;
    packaging?: string | null | undefined;
}, {
    description?: string | null | undefined;
    unit?: string | null | undefined;
    unitPrice?: number | null | undefined;
    productName?: string | null | undefined;
    lineTotal?: number | null | undefined;
    quantity?: number | null | undefined;
    sku?: string | null | undefined;
    productCode?: string | null | undefined;
    specification?: string | null | undefined;
    packaging?: string | null | undefined;
}>;
export type RevisionSnapshotLineSchema = z.infer<typeof RevisionSnapshotLineSchema>;
export declare const PurchaseOrderRevisionSnapshotSchema: z.ZodObject<{
    header: z.ZodDefault<z.ZodObject<{
        poNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        incoterm: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        paymentTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deliveryTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expectedDeliveryDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        buyerReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountryCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountry: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationPort: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPurchaseOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        directLines: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }>, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        poNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        incoterm: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        paymentTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deliveryTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expectedDeliveryDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        buyerReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountryCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountry: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationPort: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPurchaseOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        directLines: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }>, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        poNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        incoterm: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        paymentTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deliveryTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expectedDeliveryDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        buyerReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountryCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountry: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationPort: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPurchaseOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        directLines: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }>, "many">>;
    }, z.ZodTypeAny, "passthrough">>>;
    lines: z.ZodDefault<z.ZodArray<z.ZodObject<{
        sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        description?: string | null | undefined;
        unit?: string | null | undefined;
        unitPrice?: number | null | undefined;
        productName?: string | null | undefined;
        lineTotal?: number | null | undefined;
        quantity?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
    }, {
        description?: string | null | undefined;
        unit?: string | null | undefined;
        unitPrice?: number | null | undefined;
        productName?: string | null | undefined;
        lineTotal?: number | null | undefined;
        quantity?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
    }>, "many">>;
    directLines: z.ZodOptional<z.ZodArray<z.ZodObject<{
        sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        description?: string | null | undefined;
        unit?: string | null | undefined;
        unitPrice?: number | null | undefined;
        productName?: string | null | undefined;
        lineTotal?: number | null | undefined;
        quantity?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
    }, {
        description?: string | null | undefined;
        unit?: string | null | undefined;
        unitPrice?: number | null | undefined;
        productName?: string | null | undefined;
        lineTotal?: number | null | undefined;
        quantity?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
    }>, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    header: z.ZodDefault<z.ZodObject<{
        poNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        incoterm: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        paymentTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deliveryTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expectedDeliveryDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        buyerReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountryCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountry: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationPort: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPurchaseOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        directLines: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }>, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        poNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        incoterm: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        paymentTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deliveryTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expectedDeliveryDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        buyerReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountryCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountry: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationPort: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPurchaseOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        directLines: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }>, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        poNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        incoterm: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        paymentTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deliveryTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expectedDeliveryDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        buyerReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountryCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountry: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationPort: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPurchaseOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        directLines: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }>, "many">>;
    }, z.ZodTypeAny, "passthrough">>>;
    lines: z.ZodDefault<z.ZodArray<z.ZodObject<{
        sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        description?: string | null | undefined;
        unit?: string | null | undefined;
        unitPrice?: number | null | undefined;
        productName?: string | null | undefined;
        lineTotal?: number | null | undefined;
        quantity?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
    }, {
        description?: string | null | undefined;
        unit?: string | null | undefined;
        unitPrice?: number | null | undefined;
        productName?: string | null | undefined;
        lineTotal?: number | null | undefined;
        quantity?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
    }>, "many">>;
    directLines: z.ZodOptional<z.ZodArray<z.ZodObject<{
        sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        description?: string | null | undefined;
        unit?: string | null | undefined;
        unitPrice?: number | null | undefined;
        productName?: string | null | undefined;
        lineTotal?: number | null | undefined;
        quantity?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
    }, {
        description?: string | null | undefined;
        unit?: string | null | undefined;
        unitPrice?: number | null | undefined;
        productName?: string | null | undefined;
        lineTotal?: number | null | undefined;
        quantity?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
    }>, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    header: z.ZodDefault<z.ZodObject<{
        poNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        incoterm: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        paymentTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deliveryTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expectedDeliveryDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        buyerReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountryCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountry: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationPort: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPurchaseOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        directLines: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }>, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        poNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        incoterm: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        paymentTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deliveryTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expectedDeliveryDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        buyerReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountryCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountry: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationPort: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPurchaseOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        directLines: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }>, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        poNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        incoterm: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        paymentTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deliveryTerms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expectedDeliveryDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        buyerReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountryCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationCountry: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        destinationPort: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        parentPurchaseOrderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        directLines: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }, {
            description?: string | null | undefined;
            unit?: string | null | undefined;
            unitPrice?: number | null | undefined;
            productName?: string | null | undefined;
            lineTotal?: number | null | undefined;
            quantity?: number | null | undefined;
            sku?: string | null | undefined;
            productCode?: string | null | undefined;
            specification?: string | null | undefined;
            packaging?: string | null | undefined;
        }>, "many">>;
    }, z.ZodTypeAny, "passthrough">>>;
    lines: z.ZodDefault<z.ZodArray<z.ZodObject<{
        sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        description?: string | null | undefined;
        unit?: string | null | undefined;
        unitPrice?: number | null | undefined;
        productName?: string | null | undefined;
        lineTotal?: number | null | undefined;
        quantity?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
    }, {
        description?: string | null | undefined;
        unit?: string | null | undefined;
        unitPrice?: number | null | undefined;
        productName?: string | null | undefined;
        lineTotal?: number | null | undefined;
        quantity?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
    }>, "many">>;
    directLines: z.ZodOptional<z.ZodArray<z.ZodObject<{
        sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        lineTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        productName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        productCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        specification: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        packaging: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        description?: string | null | undefined;
        unit?: string | null | undefined;
        unitPrice?: number | null | undefined;
        productName?: string | null | undefined;
        lineTotal?: number | null | undefined;
        quantity?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
    }, {
        description?: string | null | undefined;
        unit?: string | null | undefined;
        unitPrice?: number | null | undefined;
        productName?: string | null | undefined;
        lineTotal?: number | null | undefined;
        quantity?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
    }>, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export type PurchaseOrderRevisionSnapshotSchema = z.infer<typeof PurchaseOrderRevisionSnapshotSchema>;
export declare const PurchaseOrderRevisionActorSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
}, {
    id: string;
    name: string;
}>;
export declare const PurchaseOrderRevisionDtoSchema: z.ZodObject<{
    id: z.ZodString;
    purchaseOrderId: z.ZodString;
    revisionNumber: z.ZodNumber;
    createdById: z.ZodString;
    reason: z.ZodString;
    snapshotJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodString;
    createdBy: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>>>;
    isCurrent: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    purchaseOrderId: string;
    reason: string;
    createdById: string;
    revisionNumber: number;
    snapshotJson: Record<string, unknown>;
    createdBy?: {
        id: string;
        name: string;
    } | null | undefined;
    isCurrent?: boolean | undefined;
}, {
    id: string;
    createdAt: string;
    purchaseOrderId: string;
    reason: string;
    createdById: string;
    revisionNumber: number;
    snapshotJson: Record<string, unknown>;
    createdBy?: {
        id: string;
        name: string;
    } | null | undefined;
    isCurrent?: boolean | undefined;
}>;
export type PurchaseOrderRevisionDto = z.infer<typeof PurchaseOrderRevisionDtoSchema>;
export declare const PurchaseOrderSourceSchema: z.ZodEnum<["RFQ", "DIRECT", "REORDER", "API", "LEGACY", "COMMODITY_BID"]>;
export type PurchaseOrderSourceSchema = z.infer<typeof PurchaseOrderSourceSchema>;
export declare const PoLineInput: z.ZodObject<{
    sku: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    description: string;
    unitPrice: number;
    quantity: number;
    sku?: string | undefined;
}, {
    description: string;
    unitPrice: number;
    quantity: number;
    sku?: string | undefined;
}>;
export declare const IssuePoRecordPayload: z.ZodObject<{
    poNumber: z.ZodString;
    currency: z.ZodEnum<["USD", "EUR", "GBP"]>;
    incoterm: z.ZodOptional<z.ZodString>;
    paymentTerms: z.ZodOptional<z.ZodString>;
    deliveryTerms: z.ZodOptional<z.ZodString>;
    lines: z.ZodArray<z.ZodObject<{
        sku: z.ZodOptional<z.ZodString>;
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        description: string;
        unitPrice: number;
        quantity: number;
        sku?: string | undefined;
    }, {
        description: string;
        unitPrice: number;
        quantity: number;
        sku?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    currency: "USD" | "EUR" | "GBP";
    lines: {
        description: string;
        unitPrice: number;
        quantity: number;
        sku?: string | undefined;
    }[];
    poNumber: string;
    paymentTerms?: string | undefined;
    deliveryTerms?: string | undefined;
    incoterm?: string | undefined;
}, {
    currency: "USD" | "EUR" | "GBP";
    lines: {
        description: string;
        unitPrice: number;
        quantity: number;
        sku?: string | undefined;
    }[];
    poNumber: string;
    paymentTerms?: string | undefined;
    deliveryTerms?: string | undefined;
    incoterm?: string | undefined;
}>;
export type IssuePoRecordPayload = z.infer<typeof IssuePoRecordPayload>;
export declare const AcknowledgePoPayload: z.ZodObject<{
    status: z.ZodEnum<["PENDING", "ACCEPTED", "REJECTED"]>;
    notes: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "REJECTED" | "ACCEPTED";
    notes?: string | undefined;
    version?: number | undefined;
}, {
    status: "PENDING" | "REJECTED" | "ACCEPTED";
    notes?: string | undefined;
    version?: number | undefined;
}>;
export type AcknowledgePoPayload = z.infer<typeof AcknowledgePoPayload>;
export declare const RequestAmendmentPayload: z.ZodObject<{
    reason: z.ZodString;
    proposedLines: z.ZodOptional<z.ZodArray<z.ZodObject<{
        sku: z.ZodOptional<z.ZodString>;
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
    } & {
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        unitPrice: number;
        quantity: number;
        reason?: string | undefined;
        sku?: string | undefined;
    }, {
        description: string;
        unitPrice: number;
        quantity: number;
        reason?: string | undefined;
        sku?: string | undefined;
    }>, "many">>;
    version: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    version?: number | undefined;
    proposedLines?: {
        description: string;
        unitPrice: number;
        quantity: number;
        reason?: string | undefined;
        sku?: string | undefined;
    }[] | undefined;
}, {
    reason: string;
    version?: number | undefined;
    proposedLines?: {
        description: string;
        unitPrice: number;
        quantity: number;
        reason?: string | undefined;
        sku?: string | undefined;
    }[] | undefined;
}>;
export type RequestAmendmentPayload = z.infer<typeof RequestAmendmentPayload>;
export declare const ApproveAmendmentPayload: z.ZodObject<{
    amendmentId: z.ZodString;
    reason: z.ZodString;
    lines: z.ZodOptional<z.ZodArray<z.ZodObject<{
        sku: z.ZodOptional<z.ZodString>;
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        description: string;
        unitPrice: number;
        quantity: number;
        sku?: string | undefined;
    }, {
        description: string;
        unitPrice: number;
        quantity: number;
        sku?: string | undefined;
    }>, "many">>;
    version: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    version: number;
    reason: string;
    amendmentId: string;
    lines?: {
        description: string;
        unitPrice: number;
        quantity: number;
        sku?: string | undefined;
    }[] | undefined;
}, {
    version: number;
    reason: string;
    amendmentId: string;
    lines?: {
        description: string;
        unitPrice: number;
        quantity: number;
        sku?: string | undefined;
    }[] | undefined;
}>;
export type ApproveAmendmentPayload = z.infer<typeof ApproveAmendmentPayload>;
export declare const RejectAmendmentPayload: z.ZodObject<{
    amendmentId: z.ZodString;
    reason: z.ZodString;
    version: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    amendmentId: string;
    version?: number | undefined;
}, {
    reason: string;
    amendmentId: string;
    version?: number | undefined;
}>;
export type RejectAmendmentPayload = z.infer<typeof RejectAmendmentPayload>;
export declare const ClosePoPayload: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
    version: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    version: number;
    reason?: string | undefined;
}, {
    version: number;
    reason?: string | undefined;
}>;
export type ClosePoPayload = z.infer<typeof ClosePoPayload>;
export declare const CancelPoPayload: z.ZodObject<{
    reason: z.ZodString;
    version: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    version: number;
    reason: string;
}, {
    version: number;
    reason: string;
}>;
export type CancelPoPayload = z.infer<typeof CancelPoPayload>;
export declare const SubmitPoPayload: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
    version: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    version: number;
    reason?: string | undefined;
}, {
    version: number;
    reason?: string | undefined;
}>;
export type SubmitPoPayload = z.infer<typeof SubmitPoPayload>;
export declare const ApprovePoPayload: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
    version: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    version: number;
    reason?: string | undefined;
}, {
    version: number;
    reason?: string | undefined;
}>;
export type ApprovePoPayload = z.infer<typeof ApprovePoPayload>;
export declare const StartExecutionPayload: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
    version: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    version: number;
    reason?: string | undefined;
}, {
    version: number;
    reason?: string | undefined;
}>;
export type StartExecutionPayload = z.infer<typeof StartExecutionPayload>;
export declare const CompletePoPayload: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
    version: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    version: number;
    reason?: string | undefined;
}, {
    version: number;
    reason?: string | undefined;
}>;
export type CompletePoPayload = z.infer<typeof CompletePoPayload>;
/**
 * Sprint 27 — internal / future public direct-entry line schema.
 * Persists onto existing PurchaseOrderLine columns:
 *   productName (+ optional description/spec/packaging) → description
 *   unit → sku (when sku omitted)
 *   quantity / unitPrice → quantity / unitPrice (unitPrice defaults to 0)
 */
export declare const DirectPurchaseOrderLineSchema: z.ZodObject<{
    productName: z.ZodString;
    productCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    specification: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    packaging: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    quantity: z.ZodNumber;
    unit: z.ZodString;
    unitPrice: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    /** @deprecated Prefer productCode — persisted as sku when productCode is absent. */
    sku: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    /** Sprint 36B — optional Product Master reference (same-tenant validated server-side). */
    productId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    /**
     * Sprint 36B — optional lightweight Product Master create during Direct PO.
     * When present, server creates/reuses Product and sets productId.
     */
    quickCreateProduct: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        sku: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        unitOfMeasure: z.ZodOptional<z.ZodString>;
        countryOfOrigin: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        supplierSku: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        sku: string;
        name?: string | undefined;
        description?: string | null | undefined;
        countryOfOrigin?: string | null | undefined;
        unitOfMeasure?: string | undefined;
        supplierSku?: string | null | undefined;
    }, {
        sku: string;
        name?: string | undefined;
        description?: string | null | undefined;
        countryOfOrigin?: string | null | undefined;
        unitOfMeasure?: string | undefined;
        supplierSku?: string | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    unit: string;
    productName: string;
    quantity: number;
    description?: string | null | undefined;
    productId?: string | null | undefined;
    unitPrice?: number | null | undefined;
    sku?: string | null | undefined;
    productCode?: string | null | undefined;
    specification?: string | null | undefined;
    packaging?: string | null | undefined;
    quickCreateProduct?: {
        sku: string;
        name?: string | undefined;
        description?: string | null | undefined;
        countryOfOrigin?: string | null | undefined;
        unitOfMeasure?: string | undefined;
        supplierSku?: string | null | undefined;
    } | null | undefined;
}, {
    unit: string;
    productName: string;
    quantity: number;
    description?: string | null | undefined;
    productId?: string | null | undefined;
    unitPrice?: number | null | undefined;
    sku?: string | null | undefined;
    productCode?: string | null | undefined;
    specification?: string | null | undefined;
    packaging?: string | null | undefined;
    quickCreateProduct?: {
        sku: string;
        name?: string | undefined;
        description?: string | null | undefined;
        countryOfOrigin?: string | null | undefined;
        unitOfMeasure?: string | undefined;
        supplierSku?: string | null | undefined;
    } | null | undefined;
}>;
export type DirectPurchaseOrderLineInput = z.infer<typeof DirectPurchaseOrderLineSchema>;
export declare const UpdateDraftPurchaseOrderSchema: z.ZodObject<{
    version: z.ZodNumber;
    currency: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    incoterm: z.ZodNullable<z.ZodOptional<z.ZodEnum<["EXW", "FOB"]>>>;
    paymentTerms: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    deliveryTerms: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    expectedDeliveryDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    destinationCountryCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    destinationPort: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    buyerReference: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    lines: z.ZodOptional<z.ZodArray<z.ZodObject<{
        productName: z.ZodString;
        productCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        specification: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        packaging: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        quantity: z.ZodNumber;
        unit: z.ZodString;
        unitPrice: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        /** @deprecated Prefer productCode — persisted as sku when productCode is absent. */
        sku: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        /** Sprint 36B — optional Product Master reference (same-tenant validated server-side). */
        productId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        /**
         * Sprint 36B — optional lightweight Product Master create during Direct PO.
         * When present, server creates/reuses Product and sets productId.
         */
        quickCreateProduct: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            sku: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            unitOfMeasure: z.ZodOptional<z.ZodString>;
            countryOfOrigin: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            supplierSku: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        }, {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }, {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    version: number;
    currency?: string | undefined;
    lines?: {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }[] | undefined;
    notes?: string | null | undefined;
    paymentTerms?: string | null | undefined;
    deliveryTerms?: string | null | undefined;
    destinationCountryCode?: string | null | undefined;
    destinationPort?: string | null | undefined;
    incoterm?: "EXW" | "FOB" | null | undefined;
    expectedDeliveryDate?: string | null | undefined;
    buyerReference?: string | null | undefined;
}, {
    version: number;
    currency?: string | undefined;
    lines?: {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }[] | undefined;
    notes?: string | null | undefined;
    paymentTerms?: string | null | undefined;
    deliveryTerms?: string | null | undefined;
    destinationCountryCode?: string | null | undefined;
    destinationPort?: string | null | undefined;
    incoterm?: "EXW" | "FOB" | null | undefined;
    expectedDeliveryDate?: string | null | undefined;
    buyerReference?: string | null | undefined;
}>;
export type UpdateDraftPurchaseOrderInput = z.infer<typeof UpdateDraftPurchaseOrderSchema>;
export declare const PoNumberModeSchema: z.ZodEnum<["AUTO", "CUSTOM"]>;
export type PoNumberMode = z.infer<typeof PoNumberModeSchema>;
/** Sprint 28 — buyer-facing request body (no trusted context fields). */
export declare const CreateDirectPurchaseOrderPublicSchema: z.ZodEffects<z.ZodObject<{
    supplierId: z.ZodString;
    poNumberMode: z.ZodDefault<z.ZodEnum<["AUTO", "CUSTOM"]>>;
    poNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    currency: z.ZodEffects<z.ZodString, string, string>;
    incoterm: z.ZodNullable<z.ZodOptional<z.ZodEnum<["EXW", "FOB"]>>>;
    paymentTerms: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    deliveryTerms: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    expectedDeliveryDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    destinationCountryCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    destinationPort: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    originPort: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    buyerReference: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    documentUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    documentFileName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    lines: z.ZodArray<z.ZodObject<{
        productName: z.ZodString;
        productCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        specification: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        packaging: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        quantity: z.ZodNumber;
        unit: z.ZodString;
        unitPrice: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        /** @deprecated Prefer productCode — persisted as sku when productCode is absent. */
        sku: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        /** Sprint 36B — optional Product Master reference (same-tenant validated server-side). */
        productId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        /**
         * Sprint 36B — optional lightweight Product Master create during Direct PO.
         * When present, server creates/reuses Product and sets productId.
         */
        quickCreateProduct: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            sku: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            unitOfMeasure: z.ZodOptional<z.ZodString>;
            countryOfOrigin: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            supplierSku: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        }, {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }, {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    currency: string;
    lines: {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }[];
    supplierId: string;
    poNumberMode: "AUTO" | "CUSTOM";
    notes?: string | null | undefined;
    documentUrl?: string | null | undefined;
    paymentTerms?: string | null | undefined;
    deliveryTerms?: string | null | undefined;
    poNumber?: string | null | undefined;
    destinationCountryCode?: string | null | undefined;
    originPort?: string | null | undefined;
    destinationPort?: string | null | undefined;
    incoterm?: "EXW" | "FOB" | null | undefined;
    expectedDeliveryDate?: string | null | undefined;
    buyerReference?: string | null | undefined;
    documentFileName?: string | null | undefined;
}, {
    currency: string;
    lines: {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }[];
    supplierId: string;
    notes?: string | null | undefined;
    documentUrl?: string | null | undefined;
    paymentTerms?: string | null | undefined;
    deliveryTerms?: string | null | undefined;
    poNumber?: string | null | undefined;
    destinationCountryCode?: string | null | undefined;
    originPort?: string | null | undefined;
    destinationPort?: string | null | undefined;
    incoterm?: "EXW" | "FOB" | null | undefined;
    expectedDeliveryDate?: string | null | undefined;
    buyerReference?: string | null | undefined;
    poNumberMode?: "AUTO" | "CUSTOM" | undefined;
    documentFileName?: string | null | undefined;
}>, {
    currency: string;
    lines: {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }[];
    supplierId: string;
    poNumberMode: "AUTO" | "CUSTOM";
    notes?: string | null | undefined;
    documentUrl?: string | null | undefined;
    paymentTerms?: string | null | undefined;
    deliveryTerms?: string | null | undefined;
    poNumber?: string | null | undefined;
    destinationCountryCode?: string | null | undefined;
    originPort?: string | null | undefined;
    destinationPort?: string | null | undefined;
    incoterm?: "EXW" | "FOB" | null | undefined;
    expectedDeliveryDate?: string | null | undefined;
    buyerReference?: string | null | undefined;
    documentFileName?: string | null | undefined;
}, {
    currency: string;
    lines: {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }[];
    supplierId: string;
    notes?: string | null | undefined;
    documentUrl?: string | null | undefined;
    paymentTerms?: string | null | undefined;
    deliveryTerms?: string | null | undefined;
    poNumber?: string | null | undefined;
    destinationCountryCode?: string | null | undefined;
    originPort?: string | null | undefined;
    destinationPort?: string | null | undefined;
    incoterm?: "EXW" | "FOB" | null | undefined;
    expectedDeliveryDate?: string | null | undefined;
    buyerReference?: string | null | undefined;
    poNumberMode?: "AUTO" | "CUSTOM" | undefined;
    documentFileName?: string | null | undefined;
}>;
export type CreateDirectPurchaseOrderPublicInput = z.infer<typeof CreateDirectPurchaseOrderPublicSchema>;
/** Sprint 27/28 — internal orchestration input (trusted context + validated body). */
export declare const CreateDirectPurchaseOrderSchema: z.ZodEffects<z.ZodObject<{
    supplierId: z.ZodString;
    poNumberMode: z.ZodDefault<z.ZodEnum<["AUTO", "CUSTOM"]>>;
    poNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    currency: z.ZodEffects<z.ZodString, string, string>;
    incoterm: z.ZodNullable<z.ZodOptional<z.ZodEnum<["EXW", "FOB"]>>>;
    paymentTerms: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    deliveryTerms: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    expectedDeliveryDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    destinationCountryCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    destinationPort: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    originPort: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    buyerReference: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    documentUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    documentFileName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    lines: z.ZodArray<z.ZodObject<{
        productName: z.ZodString;
        productCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        specification: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        packaging: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        quantity: z.ZodNumber;
        unit: z.ZodString;
        unitPrice: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        /** @deprecated Prefer productCode — persisted as sku when productCode is absent. */
        sku: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        /** Sprint 36B — optional Product Master reference (same-tenant validated server-side). */
        productId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        /**
         * Sprint 36B — optional lightweight Product Master create during Direct PO.
         * When present, server creates/reuses Product and sets productId.
         */
        quickCreateProduct: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            sku: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            unitOfMeasure: z.ZodOptional<z.ZodString>;
            countryOfOrigin: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            supplierSku: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        }, {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }, {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }>, "many">;
} & {
    organizationWorkspaceId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    buyerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currency: string;
    lines: {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }[];
    buyerId: string;
    supplierId: string;
    poNumberMode: "AUTO" | "CUSTOM";
    notes?: string | null | undefined;
    documentUrl?: string | null | undefined;
    paymentTerms?: string | null | undefined;
    deliveryTerms?: string | null | undefined;
    poNumber?: string | null | undefined;
    destinationCountryCode?: string | null | undefined;
    originPort?: string | null | undefined;
    destinationPort?: string | null | undefined;
    incoterm?: "EXW" | "FOB" | null | undefined;
    expectedDeliveryDate?: string | null | undefined;
    buyerReference?: string | null | undefined;
    documentFileName?: string | null | undefined;
    organizationWorkspaceId?: string | null | undefined;
}, {
    currency: string;
    lines: {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }[];
    buyerId: string;
    supplierId: string;
    notes?: string | null | undefined;
    documentUrl?: string | null | undefined;
    paymentTerms?: string | null | undefined;
    deliveryTerms?: string | null | undefined;
    poNumber?: string | null | undefined;
    destinationCountryCode?: string | null | undefined;
    originPort?: string | null | undefined;
    destinationPort?: string | null | undefined;
    incoterm?: "EXW" | "FOB" | null | undefined;
    expectedDeliveryDate?: string | null | undefined;
    buyerReference?: string | null | undefined;
    poNumberMode?: "AUTO" | "CUSTOM" | undefined;
    documentFileName?: string | null | undefined;
    organizationWorkspaceId?: string | null | undefined;
}>, {
    currency: string;
    lines: {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }[];
    buyerId: string;
    supplierId: string;
    poNumberMode: "AUTO" | "CUSTOM";
    notes?: string | null | undefined;
    documentUrl?: string | null | undefined;
    paymentTerms?: string | null | undefined;
    deliveryTerms?: string | null | undefined;
    poNumber?: string | null | undefined;
    destinationCountryCode?: string | null | undefined;
    originPort?: string | null | undefined;
    destinationPort?: string | null | undefined;
    incoterm?: "EXW" | "FOB" | null | undefined;
    expectedDeliveryDate?: string | null | undefined;
    buyerReference?: string | null | undefined;
    documentFileName?: string | null | undefined;
    organizationWorkspaceId?: string | null | undefined;
}, {
    currency: string;
    lines: {
        unit: string;
        productName: string;
        quantity: number;
        description?: string | null | undefined;
        productId?: string | null | undefined;
        unitPrice?: number | null | undefined;
        sku?: string | null | undefined;
        productCode?: string | null | undefined;
        specification?: string | null | undefined;
        packaging?: string | null | undefined;
        quickCreateProduct?: {
            sku: string;
            name?: string | undefined;
            description?: string | null | undefined;
            countryOfOrigin?: string | null | undefined;
            unitOfMeasure?: string | undefined;
            supplierSku?: string | null | undefined;
        } | null | undefined;
    }[];
    buyerId: string;
    supplierId: string;
    notes?: string | null | undefined;
    documentUrl?: string | null | undefined;
    paymentTerms?: string | null | undefined;
    deliveryTerms?: string | null | undefined;
    poNumber?: string | null | undefined;
    destinationCountryCode?: string | null | undefined;
    originPort?: string | null | undefined;
    destinationPort?: string | null | undefined;
    incoterm?: "EXW" | "FOB" | null | undefined;
    expectedDeliveryDate?: string | null | undefined;
    buyerReference?: string | null | undefined;
    poNumberMode?: "AUTO" | "CUSTOM" | undefined;
    documentFileName?: string | null | undefined;
    organizationWorkspaceId?: string | null | undefined;
}>;
export type CreateDirectPurchaseOrderInput = z.infer<typeof CreateDirectPurchaseOrderSchema>;
export declare const CreateDirectPurchaseOrderResponseSchema: z.ZodObject<{
    orderId: z.ZodString;
    purchaseOrderId: z.ZodString;
    poNumber: z.ZodString;
    source: z.ZodLiteral<"DIRECT">;
    orderOrigin: z.ZodLiteral<"DIRECT_PO">;
    purchaseOrderStatus: z.ZodString;
    orderStatus: z.ZodString;
    documentUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    createdAt: z.ZodString;
    issuedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    source: "DIRECT";
    orderId: string;
    purchaseOrderId: string;
    poNumber: string;
    issuedAt: string;
    orderOrigin: "DIRECT_PO";
    purchaseOrderStatus: string;
    orderStatus: string;
    documentUrl?: string | null | undefined;
}, {
    createdAt: string;
    source: "DIRECT";
    orderId: string;
    purchaseOrderId: string;
    poNumber: string;
    issuedAt: string;
    orderOrigin: "DIRECT_PO";
    purchaseOrderStatus: string;
    orderStatus: string;
    documentUrl?: string | null | undefined;
}>;
export type CreateDirectPurchaseOrderResponse = z.infer<typeof CreateDirectPurchaseOrderResponseSchema>;
export declare const SupplierSearchQuerySchema: z.ZodEffects<z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    q: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    q?: string | undefined;
    search?: string | undefined;
    cursor?: string | undefined;
}, {
    q?: string | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    cursor?: string | undefined;
}>, {
    search: string | undefined;
    limit: number;
    cursor: string | undefined;
}, {
    q?: string | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    cursor?: string | undefined;
}>;
export type SupplierSearchQuery = z.infer<typeof SupplierSearchQuerySchema>;
export declare const SupplierSearchItemSchema: z.ZodObject<{
    id: z.ZodString;
    companyName: z.ZodString;
    countryCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    countryName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    primaryContactName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    primaryContactEmail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    supplierCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    companyName: string;
    supplierCode?: string | null | undefined;
    countryCode?: string | null | undefined;
    countryName?: string | null | undefined;
    primaryContactName?: string | null | undefined;
    primaryContactEmail?: string | null | undefined;
}, {
    id: string;
    companyName: string;
    supplierCode?: string | null | undefined;
    countryCode?: string | null | undefined;
    countryName?: string | null | undefined;
    primaryContactName?: string | null | undefined;
    primaryContactEmail?: string | null | undefined;
}>;
export type SupplierSearchItem = z.infer<typeof SupplierSearchItemSchema>;
export declare const CreateMinimalSupplierSchema: z.ZodObject<{
    companyName: z.ZodString;
    countryCode: z.ZodString;
    contactName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    registrationNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    website: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    supplierReferenceCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    companyName: string;
    countryCode: string;
    email?: string | null | undefined;
    phone?: string | null | undefined;
    contactName?: string | null | undefined;
    registrationNumber?: string | null | undefined;
    address?: string | null | undefined;
    website?: string | null | undefined;
    supplierReferenceCode?: string | null | undefined;
}, {
    companyName: string;
    countryCode: string;
    email?: string | null | undefined;
    phone?: string | null | undefined;
    contactName?: string | null | undefined;
    registrationNumber?: string | null | undefined;
    address?: string | null | undefined;
    website?: string | null | undefined;
    supplierReferenceCode?: string | null | undefined;
}>;
export type CreateMinimalSupplierInput = z.infer<typeof CreateMinimalSupplierSchema>;
export declare const PurchaseOrderSortFieldSchema: z.ZodEnum<["issuedAt", "createdAt", "poNumber", "expectedDeliveryDate", "supplier", "status", "total"]>;
export declare const PurchaseOrderListQuerySchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    search: z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string | undefined, string | undefined>;
    source: z.ZodEffects<z.ZodOptional<z.ZodEnum<["RFQ", "DIRECT", "REORDER", "API", "LEGACY"]>>, "LEGACY" | "RFQ" | "DIRECT" | "REORDER" | "API" | undefined, unknown>;
    status: z.ZodEffects<z.ZodOptional<z.ZodEnum<["DRAFT", "SUBMITTED", "APPROVED", "IN_EXECUTION", "COMPLETED", "CLOSED", "CANCELLED", "ISSUED", "ACKNOWLEDGED", "AMENDMENT_REQUESTED", "AMENDED"]>>, "DRAFT" | "AMENDED" | "CANCELLED" | "CLOSED" | "APPROVED" | "COMPLETED" | "SUBMITTED" | "IN_EXECUTION" | "ISSUED" | "ACKNOWLEDGED" | "AMENDMENT_REQUESTED" | undefined, unknown>;
    supplierId: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    dateFrom: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    dateTo: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    sort: z.ZodDefault<z.ZodEnum<["issuedAt", "createdAt", "poNumber", "expectedDeliveryDate", "supplier", "status", "total"]>>;
    direction: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sort: "status" | "createdAt" | "poNumber" | "supplier" | "issuedAt" | "total" | "expectedDeliveryDate";
    page: number;
    direction: "asc" | "desc";
    pageSize: number;
    status?: "DRAFT" | "AMENDED" | "CANCELLED" | "CLOSED" | "APPROVED" | "COMPLETED" | "SUBMITTED" | "IN_EXECUTION" | "ISSUED" | "ACKNOWLEDGED" | "AMENDMENT_REQUESTED" | undefined;
    source?: "LEGACY" | "RFQ" | "DIRECT" | "REORDER" | "API" | undefined;
    search?: string | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    supplierId?: string | undefined;
}, {
    sort?: "status" | "createdAt" | "poNumber" | "supplier" | "issuedAt" | "total" | "expectedDeliveryDate" | undefined;
    status?: unknown;
    page?: number | undefined;
    source?: unknown;
    search?: string | undefined;
    direction?: "asc" | "desc" | undefined;
    pageSize?: number | undefined;
    dateFrom?: unknown;
    dateTo?: unknown;
    supplierId?: unknown;
}>, {
    sort: "status" | "createdAt" | "poNumber" | "supplier" | "issuedAt" | "total" | "expectedDeliveryDate";
    page: number;
    direction: "asc" | "desc";
    pageSize: number;
    status?: "DRAFT" | "AMENDED" | "CANCELLED" | "CLOSED" | "APPROVED" | "COMPLETED" | "SUBMITTED" | "IN_EXECUTION" | "ISSUED" | "ACKNOWLEDGED" | "AMENDMENT_REQUESTED" | undefined;
    source?: "LEGACY" | "RFQ" | "DIRECT" | "REORDER" | "API" | undefined;
    search?: string | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    supplierId?: string | undefined;
}, {
    sort?: "status" | "createdAt" | "poNumber" | "supplier" | "issuedAt" | "total" | "expectedDeliveryDate" | undefined;
    status?: unknown;
    page?: number | undefined;
    source?: unknown;
    search?: string | undefined;
    direction?: "asc" | "desc" | undefined;
    pageSize?: number | undefined;
    dateFrom?: unknown;
    dateTo?: unknown;
    supplierId?: unknown;
}>, {
    search: string | undefined;
    sort: "status" | "createdAt" | "poNumber" | "supplier" | "issuedAt" | "total" | "expectedDeliveryDate";
    page: number;
    direction: "asc" | "desc";
    pageSize: number;
    status?: "DRAFT" | "AMENDED" | "CANCELLED" | "CLOSED" | "APPROVED" | "COMPLETED" | "SUBMITTED" | "IN_EXECUTION" | "ISSUED" | "ACKNOWLEDGED" | "AMENDMENT_REQUESTED" | undefined;
    source?: "LEGACY" | "RFQ" | "DIRECT" | "REORDER" | "API" | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    supplierId?: string | undefined;
}, {
    sort?: "status" | "createdAt" | "poNumber" | "supplier" | "issuedAt" | "total" | "expectedDeliveryDate" | undefined;
    status?: unknown;
    page?: number | undefined;
    source?: unknown;
    search?: string | undefined;
    direction?: "asc" | "desc" | undefined;
    pageSize?: number | undefined;
    dateFrom?: unknown;
    dateTo?: unknown;
    supplierId?: unknown;
}>;
export type PurchaseOrderListQuery = z.infer<typeof PurchaseOrderListQuerySchema>;
/** Build a persistable PurchaseOrderLine.description from direct-entry fields. */
export declare function composeDirectPoLineDescription(line: DirectPurchaseOrderLineInput): string;

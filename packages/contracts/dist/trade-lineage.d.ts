/**
 * Sprint 31 — Trade Entity Lineage DTOs (GLOBAL CORE).
 * Booking is represented from existing ShipmentWorkspace booking fields — not a new domain entity.
 */
import { z } from "zod";
export declare const LineageBookingRefSchema: z.ZodObject<{
    shipmentWorkspaceId: z.ZodString;
    bookingReference: z.ZodNullable<z.ZodString>;
    carrier: z.ZodNullable<z.ZodString>;
    hasBooking: z.ZodBoolean;
    status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    etd: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    eta: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    vessel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    voyage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pol: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pod: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    shipmentWorkspaceId: string;
    bookingReference: string | null;
    carrier: string | null;
    hasBooking: boolean;
    status?: string | null | undefined;
    eta?: string | null | undefined;
    pol?: string | null | undefined;
    pod?: string | null | undefined;
    etd?: string | null | undefined;
    vessel?: string | null | undefined;
    voyage?: string | null | undefined;
}, {
    shipmentWorkspaceId: string;
    bookingReference: string | null;
    carrier: string | null;
    hasBooking: boolean;
    status?: string | null | undefined;
    eta?: string | null | undefined;
    pol?: string | null | undefined;
    pod?: string | null | undefined;
    etd?: string | null | undefined;
    vessel?: string | null | undefined;
    voyage?: string | null | undefined;
}>;
export type LineageBookingRef = z.infer<typeof LineageBookingRefSchema>;
export declare const LineageShipmentRefSchema: z.ZodObject<{
    id: z.ZodString;
    externalRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    state: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    orderWorkspaceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    bookingReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    containerCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    containerCount: number;
    externalRef?: string | null | undefined;
    state?: string | null | undefined;
    orderWorkspaceId?: string | null | undefined;
    bookingReference?: string | null | undefined;
}, {
    id: string;
    containerCount: number;
    externalRef?: string | null | undefined;
    state?: string | null | undefined;
    orderWorkspaceId?: string | null | undefined;
    bookingReference?: string | null | undefined;
}>;
export type LineageShipmentRef = z.infer<typeof LineageShipmentRefSchema>;
export declare const LineageContainerRefSchema: z.ZodObject<{
    id: z.ZodString;
    shipmentWorkspaceId: z.ZodString;
    containerNumber: z.ZodString;
    containerType: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    shipmentWorkspaceId: string;
    containerNumber: string;
    status?: string | undefined;
    containerType?: string | null | undefined;
}, {
    id: string;
    shipmentWorkspaceId: string;
    containerNumber: string;
    status?: string | undefined;
    containerType?: string | null | undefined;
}>;
export type LineageContainerRef = z.infer<typeof LineageContainerRefSchema>;
export declare const LineagePurchaseOrderRefSchema: z.ZodObject<{
    id: z.ZodString;
    poNumber: z.ZodString;
    status: z.ZodString;
    orderId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: string;
    id: string;
    orderId: string;
    poNumber: string;
}, {
    status: string;
    id: string;
    orderId: string;
    poNumber: string;
}>;
export type LineagePurchaseOrderRef = z.infer<typeof LineagePurchaseOrderRefSchema>;
export declare const LineagePoLineRefSchema: z.ZodObject<{
    id: z.ZodString;
    purchaseOrderId: z.ZodString;
    sku: z.ZodNullable<z.ZodString>;
    description: z.ZodString;
    orderedQuantity: z.ZodNumber;
    allocatedQuantity: z.ZodNumber;
    remainingQuantity: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    purchaseOrderId: string;
    sku: string | null;
    allocatedQuantity: number;
    remainingQuantity: number;
    orderedQuantity: number;
}, {
    id: string;
    description: string;
    purchaseOrderId: string;
    sku: string | null;
    allocatedQuantity: number;
    remainingQuantity: number;
    orderedQuantity: number;
}>;
export type LineagePoLineRef = z.infer<typeof LineagePoLineRefSchema>;
export declare const LineageAllocationRefSchema: z.ZodObject<{
    id: z.ZodString;
    purchaseOrderLineId: z.ZodString;
    purchaseOrderId: z.ZodString;
    shipmentWorkspaceId: z.ZodString;
    shipmentContainerId: z.ZodNullable<z.ZodString>;
    quantity: z.ZodNumber;
    unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    quantity: number;
    purchaseOrderId: string;
    purchaseOrderLineId: string;
    shipmentWorkspaceId: string;
    shipmentContainerId: string | null;
    description?: string | undefined;
    unit?: string | null | undefined;
    sku?: string | null | undefined;
}, {
    id: string;
    quantity: number;
    purchaseOrderId: string;
    purchaseOrderLineId: string;
    shipmentWorkspaceId: string;
    shipmentContainerId: string | null;
    description?: string | undefined;
    unit?: string | null | undefined;
    sku?: string | null | undefined;
}>;
export type LineageAllocationRef = z.infer<typeof LineageAllocationRefSchema>;
/** Sprint 36A — permission-safe source/execution context (no competing bid/offer prices). */
export declare const LineageSourceContextSchema: z.ZodObject<{
    sourceType: z.ZodOptional<z.ZodNullable<z.ZodEnum<["RFQ", "COMMODITY_BID", "DIRECT_PO", "REORDER", "API", "UNKNOWN"]>>>;
    orderWorkspaceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    rfqWorkspaceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    rfqExternalRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    commodityBidWorkspaceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    commodityBidExternalRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    inspections: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        inspectionNumber: z.ZodString;
        status: z.ZodString;
        decision: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status: string;
        id: string;
        inspectionNumber: string;
        decision?: string | null | undefined;
    }, {
        status: string;
        id: string;
        inspectionNumber: string;
        decision?: string | null | undefined;
    }>, "many">>;
    freightRequests: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        status: z.ZodString;
        hasSelection: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        status: string;
        id: string;
        hasSelection?: boolean | undefined;
    }, {
        status: string;
        id: string;
        hasSelection?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    inspections: {
        status: string;
        id: string;
        inspectionNumber: string;
        decision?: string | null | undefined;
    }[];
    freightRequests: {
        status: string;
        id: string;
        hasSelection?: boolean | undefined;
    }[];
    orderWorkspaceId?: string | null | undefined;
    sourceType?: "RFQ" | "UNKNOWN" | "REORDER" | "API" | "COMMODITY_BID" | "DIRECT_PO" | null | undefined;
    rfqWorkspaceId?: string | null | undefined;
    rfqExternalRef?: string | null | undefined;
    commodityBidWorkspaceId?: string | null | undefined;
    commodityBidExternalRef?: string | null | undefined;
}, {
    orderWorkspaceId?: string | null | undefined;
    sourceType?: "RFQ" | "UNKNOWN" | "REORDER" | "API" | "COMMODITY_BID" | "DIRECT_PO" | null | undefined;
    rfqWorkspaceId?: string | null | undefined;
    rfqExternalRef?: string | null | undefined;
    commodityBidWorkspaceId?: string | null | undefined;
    commodityBidExternalRef?: string | null | undefined;
    inspections?: {
        status: string;
        id: string;
        inspectionNumber: string;
        decision?: string | null | undefined;
    }[] | undefined;
    freightRequests?: {
        status: string;
        id: string;
        hasSelection?: boolean | undefined;
    }[] | undefined;
}>;
export type LineageSourceContext = z.infer<typeof LineageSourceContextSchema>;
export declare const RelatedEntitiesDtoSchema: z.ZodObject<{
    purchaseOrders: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        poNumber: z.ZodString;
        status: z.ZodString;
        orderId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: string;
        id: string;
        orderId: string;
        poNumber: string;
    }, {
        status: string;
        id: string;
        orderId: string;
        poNumber: string;
    }>, "many">>;
    poLines: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        purchaseOrderId: z.ZodString;
        sku: z.ZodNullable<z.ZodString>;
        description: z.ZodString;
        orderedQuantity: z.ZodNumber;
        allocatedQuantity: z.ZodNumber;
        remainingQuantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        purchaseOrderId: string;
        sku: string | null;
        allocatedQuantity: number;
        remainingQuantity: number;
        orderedQuantity: number;
    }, {
        id: string;
        description: string;
        purchaseOrderId: string;
        sku: string | null;
        allocatedQuantity: number;
        remainingQuantity: number;
        orderedQuantity: number;
    }>, "many">>;
    bookings: z.ZodDefault<z.ZodArray<z.ZodObject<{
        shipmentWorkspaceId: z.ZodString;
        bookingReference: z.ZodNullable<z.ZodString>;
        carrier: z.ZodNullable<z.ZodString>;
        hasBooking: z.ZodBoolean;
        status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        etd: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        eta: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        vessel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        voyage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        pol: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        pod: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        shipmentWorkspaceId: string;
        bookingReference: string | null;
        carrier: string | null;
        hasBooking: boolean;
        status?: string | null | undefined;
        eta?: string | null | undefined;
        pol?: string | null | undefined;
        pod?: string | null | undefined;
        etd?: string | null | undefined;
        vessel?: string | null | undefined;
        voyage?: string | null | undefined;
    }, {
        shipmentWorkspaceId: string;
        bookingReference: string | null;
        carrier: string | null;
        hasBooking: boolean;
        status?: string | null | undefined;
        eta?: string | null | undefined;
        pol?: string | null | undefined;
        pod?: string | null | undefined;
        etd?: string | null | undefined;
        vessel?: string | null | undefined;
        voyage?: string | null | undefined;
    }>, "many">>;
    shipments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        externalRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        state: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        orderWorkspaceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        bookingReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        containerCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        containerCount: number;
        externalRef?: string | null | undefined;
        state?: string | null | undefined;
        orderWorkspaceId?: string | null | undefined;
        bookingReference?: string | null | undefined;
    }, {
        id: string;
        containerCount: number;
        externalRef?: string | null | undefined;
        state?: string | null | undefined;
        orderWorkspaceId?: string | null | undefined;
        bookingReference?: string | null | undefined;
    }>, "many">>;
    containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        shipmentWorkspaceId: z.ZodString;
        containerNumber: z.ZodString;
        containerType: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        shipmentWorkspaceId: string;
        containerNumber: string;
        status?: string | undefined;
        containerType?: string | null | undefined;
    }, {
        id: string;
        shipmentWorkspaceId: string;
        containerNumber: string;
        status?: string | undefined;
        containerType?: string | null | undefined;
    }>, "many">>;
    allocations: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        purchaseOrderLineId: z.ZodString;
        purchaseOrderId: z.ZodString;
        shipmentWorkspaceId: z.ZodString;
        shipmentContainerId: z.ZodNullable<z.ZodString>;
        quantity: z.ZodNumber;
        unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        quantity: number;
        purchaseOrderId: string;
        purchaseOrderLineId: string;
        shipmentWorkspaceId: string;
        shipmentContainerId: string | null;
        description?: string | undefined;
        unit?: string | null | undefined;
        sku?: string | null | undefined;
    }, {
        id: string;
        quantity: number;
        purchaseOrderId: string;
        purchaseOrderLineId: string;
        shipmentWorkspaceId: string;
        shipmentContainerId: string | null;
        description?: string | undefined;
        unit?: string | null | undefined;
        sku?: string | null | undefined;
    }>, "many">>;
    /** Sprint 36A — optional; omitted/empty when no source context is resolvable. */
    sourceContext: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodNullable<z.ZodEnum<["RFQ", "COMMODITY_BID", "DIRECT_PO", "REORDER", "API", "UNKNOWN"]>>>;
        orderWorkspaceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        rfqWorkspaceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        rfqExternalRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        commodityBidWorkspaceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        commodityBidExternalRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        inspections: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            inspectionNumber: z.ZodString;
            status: z.ZodString;
            decision: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            status: string;
            id: string;
            inspectionNumber: string;
            decision?: string | null | undefined;
        }, {
            status: string;
            id: string;
            inspectionNumber: string;
            decision?: string | null | undefined;
        }>, "many">>;
        freightRequests: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            status: z.ZodString;
            hasSelection: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            status: string;
            id: string;
            hasSelection?: boolean | undefined;
        }, {
            status: string;
            id: string;
            hasSelection?: boolean | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        inspections: {
            status: string;
            id: string;
            inspectionNumber: string;
            decision?: string | null | undefined;
        }[];
        freightRequests: {
            status: string;
            id: string;
            hasSelection?: boolean | undefined;
        }[];
        orderWorkspaceId?: string | null | undefined;
        sourceType?: "RFQ" | "UNKNOWN" | "REORDER" | "API" | "COMMODITY_BID" | "DIRECT_PO" | null | undefined;
        rfqWorkspaceId?: string | null | undefined;
        rfqExternalRef?: string | null | undefined;
        commodityBidWorkspaceId?: string | null | undefined;
        commodityBidExternalRef?: string | null | undefined;
    }, {
        orderWorkspaceId?: string | null | undefined;
        sourceType?: "RFQ" | "UNKNOWN" | "REORDER" | "API" | "COMMODITY_BID" | "DIRECT_PO" | null | undefined;
        rfqWorkspaceId?: string | null | undefined;
        rfqExternalRef?: string | null | undefined;
        commodityBidWorkspaceId?: string | null | undefined;
        commodityBidExternalRef?: string | null | undefined;
        inspections?: {
            status: string;
            id: string;
            inspectionNumber: string;
            decision?: string | null | undefined;
        }[] | undefined;
        freightRequests?: {
            status: string;
            id: string;
            hasSelection?: boolean | undefined;
        }[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    allocations: {
        id: string;
        quantity: number;
        purchaseOrderId: string;
        purchaseOrderLineId: string;
        shipmentWorkspaceId: string;
        shipmentContainerId: string | null;
        description?: string | undefined;
        unit?: string | null | undefined;
        sku?: string | null | undefined;
    }[];
    shipments: {
        id: string;
        containerCount: number;
        externalRef?: string | null | undefined;
        state?: string | null | undefined;
        orderWorkspaceId?: string | null | undefined;
        bookingReference?: string | null | undefined;
    }[];
    purchaseOrders: {
        status: string;
        id: string;
        orderId: string;
        poNumber: string;
    }[];
    poLines: {
        id: string;
        description: string;
        purchaseOrderId: string;
        sku: string | null;
        allocatedQuantity: number;
        remainingQuantity: number;
        orderedQuantity: number;
    }[];
    bookings: {
        shipmentWorkspaceId: string;
        bookingReference: string | null;
        carrier: string | null;
        hasBooking: boolean;
        status?: string | null | undefined;
        eta?: string | null | undefined;
        pol?: string | null | undefined;
        pod?: string | null | undefined;
        etd?: string | null | undefined;
        vessel?: string | null | undefined;
        voyage?: string | null | undefined;
    }[];
    containers: {
        id: string;
        shipmentWorkspaceId: string;
        containerNumber: string;
        status?: string | undefined;
        containerType?: string | null | undefined;
    }[];
    sourceContext?: {
        inspections: {
            status: string;
            id: string;
            inspectionNumber: string;
            decision?: string | null | undefined;
        }[];
        freightRequests: {
            status: string;
            id: string;
            hasSelection?: boolean | undefined;
        }[];
        orderWorkspaceId?: string | null | undefined;
        sourceType?: "RFQ" | "UNKNOWN" | "REORDER" | "API" | "COMMODITY_BID" | "DIRECT_PO" | null | undefined;
        rfqWorkspaceId?: string | null | undefined;
        rfqExternalRef?: string | null | undefined;
        commodityBidWorkspaceId?: string | null | undefined;
        commodityBidExternalRef?: string | null | undefined;
    } | undefined;
}, {
    allocations?: {
        id: string;
        quantity: number;
        purchaseOrderId: string;
        purchaseOrderLineId: string;
        shipmentWorkspaceId: string;
        shipmentContainerId: string | null;
        description?: string | undefined;
        unit?: string | null | undefined;
        sku?: string | null | undefined;
    }[] | undefined;
    shipments?: {
        id: string;
        containerCount: number;
        externalRef?: string | null | undefined;
        state?: string | null | undefined;
        orderWorkspaceId?: string | null | undefined;
        bookingReference?: string | null | undefined;
    }[] | undefined;
    purchaseOrders?: {
        status: string;
        id: string;
        orderId: string;
        poNumber: string;
    }[] | undefined;
    poLines?: {
        id: string;
        description: string;
        purchaseOrderId: string;
        sku: string | null;
        allocatedQuantity: number;
        remainingQuantity: number;
        orderedQuantity: number;
    }[] | undefined;
    bookings?: {
        shipmentWorkspaceId: string;
        bookingReference: string | null;
        carrier: string | null;
        hasBooking: boolean;
        status?: string | null | undefined;
        eta?: string | null | undefined;
        pol?: string | null | undefined;
        pod?: string | null | undefined;
        etd?: string | null | undefined;
        vessel?: string | null | undefined;
        voyage?: string | null | undefined;
    }[] | undefined;
    containers?: {
        id: string;
        shipmentWorkspaceId: string;
        containerNumber: string;
        status?: string | undefined;
        containerType?: string | null | undefined;
    }[] | undefined;
    sourceContext?: {
        orderWorkspaceId?: string | null | undefined;
        sourceType?: "RFQ" | "UNKNOWN" | "REORDER" | "API" | "COMMODITY_BID" | "DIRECT_PO" | null | undefined;
        rfqWorkspaceId?: string | null | undefined;
        rfqExternalRef?: string | null | undefined;
        commodityBidWorkspaceId?: string | null | undefined;
        commodityBidExternalRef?: string | null | undefined;
        inspections?: {
            status: string;
            id: string;
            inspectionNumber: string;
            decision?: string | null | undefined;
        }[] | undefined;
        freightRequests?: {
            status: string;
            id: string;
            hasSelection?: boolean | undefined;
        }[] | undefined;
    } | undefined;
}>;
export type RelatedEntitiesDto = z.infer<typeof RelatedEntitiesDtoSchema>;
export declare const UpsertShipmentLineAllocationSchema: z.ZodObject<{
    purchaseOrderLineId: z.ZodString;
    shipmentWorkspaceId: z.ZodString;
    shipmentContainerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    quantity: z.ZodNumber;
    unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    purchaseOrderLineId: string;
    shipmentWorkspaceId: string;
    unit?: string | null | undefined;
    shipmentContainerId?: string | null | undefined;
}, {
    quantity: number;
    purchaseOrderLineId: string;
    shipmentWorkspaceId: string;
    unit?: string | null | undefined;
    shipmentContainerId?: string | null | undefined;
}>;
export type UpsertShipmentLineAllocationInput = z.infer<typeof UpsertShipmentLineAllocationSchema>;
export declare const LinkTradeShipmentSchema: z.ZodObject<{
    purchaseOrderId: z.ZodString;
    shipmentWorkspaceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    purchaseOrderId: string;
    shipmentWorkspaceId: string;
}, {
    purchaseOrderId: string;
    shipmentWorkspaceId: string;
}>;
export type LinkTradeShipmentInput = z.infer<typeof LinkTradeShipmentSchema>;

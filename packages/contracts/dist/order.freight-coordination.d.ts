/** True when no open freight request blocks shipment booking, or a forwarder offer was selected. */
export declare function isFreightOfferSelected(freightRequests?: Array<{
    status: string;
    selection?: unknown | null;
}> | null): boolean;

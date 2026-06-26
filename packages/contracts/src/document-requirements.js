/** Default requirements for export shipment documentation. */
export const EXPORT_SHIPMENT_REQUIREMENTS = [
    { documentType: "COMMERCIAL_INVOICE", required: true },
    { documentType: "PACKING_LIST", required: true },
    { documentType: "BILL_OF_LADING", required: true },
    { documentType: "CERTIFICATE_OF_ORIGIN", required: false },
    { documentType: "HEALTH_CERTIFICATE", required: false },
    { documentType: "INSURANCE_CERTIFICATE", required: false },
    { documentType: "INSPECTION_REPORT", required: false },
    { documentType: "EXPORT_DECLARATION", required: false },
];
export function getDefaultRequirements(_workspaceType) {
    return EXPORT_SHIPMENT_REQUIREMENTS;
}
//# sourceMappingURL=document-requirements.js.map
export function computeComplianceFromRows(requirements, documents) {
    const required = requirements.filter((r) => r.required);
    const docByType = new Map(documents.map((d) => [d.documentType, d]));
    const checklist = requirements.map((r) => {
        const d = docByType.get(r.documentType);
        return {
            documentType: r.documentType,
            required: r.required,
            status: (d?.status ?? "MISSING"),
            documentId: d?.id ?? null,
        };
    });
    const approvedRequired = required.filter((r) => docByType.get(r.documentType)?.status === "APPROVED");
    const missingTypes = required
        .filter((r) => docByType.get(r.documentType)?.status !== "APPROVED")
        .map((r) => r.documentType);
    let status = "NOT_READY";
    if (approvedRequired.length === required.length && required.length > 0) {
        status = "READY_FOR_SHIPMENT";
    }
    else if (approvedRequired.length > 0) {
        status = "PARTIALLY_READY";
    }
    return {
        status,
        requiredCount: required.length,
        approvedCount: approvedRequired.length,
        missingTypes,
        checklist,
    };
}
//# sourceMappingURL=compliance-engine.js.map
import type { ComplianceSummary, DocumentStatus } from "@dmx/contracts/trade-documents";

export function computeComplianceFromRows(
  requirements: Array<{ documentType: string; required: boolean }>,
  documents: Array<{ id: string; documentType: string; status: string }>,
): ComplianceSummary {
  const required = requirements.filter((r) => r.required);
  const docByType = new Map(documents.map((d) => [d.documentType, d]));
  const checklist = requirements.map((r) => {
    const d = docByType.get(r.documentType);
    return {
      documentType: r.documentType as ComplianceSummary["checklist"][number]["documentType"],
      required: r.required,
      status: (d?.status ?? "MISSING") as DocumentStatus,
      documentId: d?.id ?? null,
    };
  });
  const approvedRequired = required.filter((r) => docByType.get(r.documentType)?.status === "APPROVED");
  const missingTypes = required
    .filter((r) => docByType.get(r.documentType)?.status !== "APPROVED")
    .map((r) => r.documentType as ComplianceSummary["missingTypes"][number]);

  let status: ComplianceSummary["status"] = "NOT_READY";
  if (approvedRequired.length === required.length && required.length > 0) {
    status = "READY_FOR_SHIPMENT";
  } else if (approvedRequired.length > 0) {
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

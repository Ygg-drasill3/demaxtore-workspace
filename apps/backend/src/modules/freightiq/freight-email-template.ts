import type { FreightRequestEmailTemplate } from "@dmx/contracts/freight-communications";

export function buildFreightRequestEmailTemplate(input: {
  pol: string;
  pod: string;
  commodity: string;
  containerType: string | null;
  readyDate: string | null;
  incoterm: string | null;
  requestedReplyDate: string;
}): FreightRequestEmailTemplate {
  const subject = `Freight Request – ${input.pol} → ${input.pod}`;
  const ready = input.readyDate ? new Date(input.readyDate).toLocaleDateString("en-GB") : "TBC";
  const reply = new Date(input.requestedReplyDate).toLocaleDateString("en-GB");
  const body = [
    "Dear Partner,",
    "",
    "Please provide your freight offer for:",
    "",
    `POL: ${input.pol}`,
    `POD: ${input.pod}`,
    `Commodity: ${input.commodity}`,
    `Container: ${input.containerType ?? "TBC"}`,
    `Ready Date: ${ready}`,
    input.incoterm ? `Incoterm: ${input.incoterm}` : null,
    `Requested Reply Date: ${reply}`,
    "",
    "Please provide:",
    "Carrier",
    "Vessel Name",
    "ETD",
    "ETA",
    "Transit Time",
    "Cut-off",
    "Ocean Freight",
    "Validity",
    "Remarks",
    "",
    "Thank you.",
    "DeMaxtore Operations",
  ]
    .filter((line): line is string => line != null)
    .join("\n");

  return {
    subject,
    body,
    pol: input.pol,
    pod: input.pod,
    commodity: input.commodity,
    containerType: input.containerType,
    readyDate: input.readyDate,
    incoterm: input.incoterm,
    requestedReplyDate: input.requestedReplyDate,
  };
}

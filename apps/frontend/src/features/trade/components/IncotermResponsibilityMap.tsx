import { INCOTERM_PROFILES, type IncotermCode } from "@dmx/contracts/incoterms";

export function IncotermResponsibilityMap({ incoterm }: { incoterm: string | null }) {
  const code = (incoterm?.toUpperCase() ?? "FOB") as IncotermCode;
  const profile = INCOTERM_PROFILES[code] ?? INCOTERM_PROFILES.FOB;

  return (
    <div data-testid="incoterm-responsibility-map" className="text-sm space-y-2">
      <div className="font-medium">{profile.code} — Risk transfer at {profile.riskTransferShipmentState.replace(/_/g, " ")}</div>
      <ul className="grid grid-cols-2 gap-1 text-xs text-zinc-600">
        <li>Freight: {profile.freightResponsibility}</li>
        <li>Insurance: {profile.insuranceResponsibility}</li>
        <li>Export customs: {profile.customsExportResponsibility}</li>
        <li>Import customs: {profile.customsImportResponsibility}</li>
      </ul>
    </div>
  );
}

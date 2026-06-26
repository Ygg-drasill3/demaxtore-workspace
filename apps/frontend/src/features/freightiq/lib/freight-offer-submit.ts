export interface AdminOfferFormValues {
  providerName: string;
  carrierName: string;
  vesselName: string;
  price: string;
  currency: "USD" | "EUR" | "GBP";
  transitDays: string;
  etd: string;
  eta: string;
  cutOff: string;
  validUntil: string;
  remarks: string;
}

export function dateToIso(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toISOString();
}

export function buildSubmitOfferPayload(form: AdminOfferFormValues): Record<string, unknown> {
  return {
    providerName: form.providerName.trim(),
    carrierName: form.carrierName.trim(),
    vesselName: form.vesselName.trim(),
    price: Number(form.price),
    currency: form.currency,
    transitDays: Number(form.transitDays),
    validUntil: dateToIso(form.validUntil),
    etd: dateToIso(form.etd),
    eta: dateToIso(form.eta),
    cutOff: dateToIso(form.cutOff),
    remarks: form.remarks.trim() || undefined,
  };
}

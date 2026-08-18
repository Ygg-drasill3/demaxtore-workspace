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

export function emptyAdminOfferForm(overrides: Partial<AdminOfferFormValues> = {}): AdminOfferFormValues {
  const validUntil = new Date();
  validUntil.setUTCDate(validUntil.getUTCDate() + 14);
  const etd = new Date();
  etd.setUTCDate(etd.getUTCDate() + 14);
  const eta = new Date(etd);
  eta.setUTCDate(eta.getUTCDate() + 28);
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);

  return {
    providerName: "",
    carrierName: "",
    vesselName: "",
    price: "",
    currency: "USD",
    transitDays: "28",
    etd: isoDate(etd),
    eta: isoDate(eta),
    cutOff: "",
    validUntil: isoDate(validUntil),
    remarks: "",
    ...overrides,
  };
}

export function dateToIso(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toISOString();
}

export function validateAdminOfferForm(form: AdminOfferFormValues): string | null {
  if (!form.providerName.trim()) return "Forwarder / provider name is required";
  if (!form.carrierName.trim()) return "Carrier name is required";
  const price = Number(form.price);
  if (!Number.isFinite(price) || price <= 0) return "Freight amount must be a positive number";
  const transitDays = Number(form.transitDays);
  if (!Number.isInteger(transitDays) || transitDays <= 0 || transitDays > 365) {
    return "Transit time must be an integer between 1 and 365 days";
  }
  if (!form.validUntil) return "Valid until date is required";
  if (Number.isNaN(Date.parse(`${form.validUntil}T12:00:00.000Z`))) {
    return "Valid until must be a valid date";
  }
  if (form.etd && form.eta) {
    const etd = Date.parse(`${form.etd}T12:00:00.000Z`);
    const eta = Date.parse(`${form.eta}T12:00:00.000Z`);
    if (!Number.isNaN(etd) && !Number.isNaN(eta) && eta <= etd) {
      return "ETA must be after ETD";
    }
  }
  return null;
}

export function buildSubmitOfferPayload(form: AdminOfferFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    providerName: form.providerName.trim(),
    carrierName: form.carrierName.trim(),
    price: Number(form.price),
    currency: form.currency,
    transitDays: Number(form.transitDays),
    validUntil: dateToIso(form.validUntil),
  };

  const vessel = form.vesselName.trim();
  if (vessel) payload.vesselName = vessel;
  if (form.etd) payload.etd = dateToIso(form.etd);
  if (form.eta) payload.eta = dateToIso(form.eta);
  if (form.cutOff) payload.cutOff = dateToIso(form.cutOff);
  const remarks = form.remarks.trim();
  if (remarks) payload.remarks = remarks;

  return payload;
}

const FREIGHT_ERROR_MESSAGES: Record<string, string> = {
  FREIGHT_REQUEST_ALREADY_OPEN: "This order already has an open freight request.",
  ORDER_NOT_READY_FOR_FREIGHT: "This order is not ready for a freight quote yet. Start a new import with a purchase order, or open an active order workspace.",
  ORDER_PARTICIPANTS_INCOMPLETE: "Buyer and supplier must both be linked before creating freight.",
};

export function freightiqErrorMessage(err: unknown, orderState?: string): string {
  const code = (err as { response?: { data?: { error?: { code?: string } } } })
    ?.response?.data?.error?.code;
  if (code === "ORDER_NOT_READY_FOR_FREIGHT" && orderState) {
    return `Freight not available yet (order state: ${orderState}). Complete production and inspection first.`;
  }
  return FREIGHT_ERROR_MESSAGES[code ?? ""] ?? "Freight action failed. Please try again.";
}

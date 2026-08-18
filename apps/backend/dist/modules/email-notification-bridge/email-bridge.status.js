const VALID = {
    QUEUED: ["SENT", "FAILED"],
    SENT: ["DELIVERED", "FAILED", "OPENED"],
    DELIVERED: ["OPENED"],
    OPENED: ["OPENED"],
    FAILED: ["FAILED", "SENT"],
};
/** Returns the next status if transition is allowed, otherwise null. */
export function nextDeliveryStatus(current, target) {
    const allowed = VALID[current];
    if (!allowed?.includes(target))
        return null;
    return target;
}
export function canTransitionDeliveryStatus(current, target) {
    return nextDeliveryStatus(current, target) !== null;
}
//# sourceMappingURL=email-bridge.status.js.map
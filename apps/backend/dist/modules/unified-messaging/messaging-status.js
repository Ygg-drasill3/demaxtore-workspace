const STATUS_RANK = {
    PENDING: 0,
    QUEUED: 1,
    SENT: 2,
    DELIVERED: 3,
    READ: 4,
    FAILED: 5,
};
export function mapWhatsAppStatusToCanonical(raw) {
    const s = raw.toLowerCase();
    if (s === "failed" || s === "error")
        return "FAILED";
    if (s === "read")
        return "READ";
    if (s === "delivered")
        return "DELIVERED";
    if (s === "sent")
        return "SENT";
    if (s === "queued" || s === "accepted")
        return "QUEUED";
    return "PENDING";
}
export function mergeCanonicalStatus(current, incoming) {
    if (!current)
        return incoming;
    if (current === "FAILED" || incoming === "FAILED")
        return "FAILED";
    return STATUS_RANK[incoming] >= STATUS_RANK[current] ? incoming : current;
}
export function canonicalStatusDistribution(statuses) {
    const counts = {};
    for (const s of statuses) {
        counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
}
export function resolveWhatsAppMessageCanonical(message) {
    if (message.failedAt)
        return "FAILED";
    const fromStatus = mapWhatsAppStatusToCanonical(message.status);
    if (fromStatus === "FAILED")
        return "FAILED";
    if (message.readAt || fromStatus === "READ")
        return "READ";
    if (message.deliveredAt || fromStatus === "DELIVERED")
        return "DELIVERED";
    if (message.sentAt || fromStatus === "SENT" || fromStatus === "QUEUED") {
        return message.sentAt || fromStatus === "SENT" ? "SENT" : "QUEUED";
    }
    return fromStatus;
}
/** One bucket per message — highest canonical status only. */
export function canonicalStatusDistributionFromMessages(messages) {
    return canonicalStatusDistribution(messages.map(resolveWhatsAppMessageCanonical));
}
//# sourceMappingURL=messaging-status.js.map
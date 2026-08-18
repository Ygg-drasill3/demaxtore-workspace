/** Display label for SLA average hours (Control Tower UI). */
export function formatSlaAverageHours(averageHours, sampleSize) {
    if (sampleSize === 0 || averageHours == null)
        return "—";
    if (averageHours > 0 && averageHours < 1)
        return "<1h";
    if (averageHours < 24)
        return `${averageHours}h`;
    const days = Math.round((averageHours / 24) * 10) / 10;
    return `${days}d`;
}
//# sourceMappingURL=sla-display.js.map
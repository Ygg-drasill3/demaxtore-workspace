/** Sentinel when no activity timestamp exists (not a real day count). */
export const UNKNOWN_DAYS_SINCE_ACTIVITY = 999;
export function isUnknownActivityDays(days) {
    return days >= UNKNOWN_DAYS_SINCE_ACTIVITY;
}
/** Human-readable inactivity for alerts and dashboards. */
export function formatDaysSinceActivity(days) {
    if (isUnknownActivityDays(days))
        return "no recorded activity";
    if (days === 0)
        return "today";
    if (days === 1)
        return "1 day";
    return `${days} days`;
}
/** True when an inactivity threshold (e.g. 30d) should apply. */
export function exceedsInactivityThreshold(days, thresholdDays) {
    if (isUnknownActivityDays(days))
        return false;
    return days >= thresholdDays;
}
//# sourceMappingURL=activity-days.js.map
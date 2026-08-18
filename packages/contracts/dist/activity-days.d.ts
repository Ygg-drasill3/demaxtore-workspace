/** Sentinel when no activity timestamp exists (not a real day count). */
export declare const UNKNOWN_DAYS_SINCE_ACTIVITY = 999;
export declare function isUnknownActivityDays(days: number): boolean;
/** Human-readable inactivity for alerts and dashboards. */
export declare function formatDaysSinceActivity(days: number): string;
/** True when an inactivity threshold (e.g. 30d) should apply. */
export declare function exceedsInactivityThreshold(days: number, thresholdDays: number): boolean;

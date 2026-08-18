const H_MS = 3_600_000;
export function diffSnapshots(prev, next) {
    const etaShiftHours = prev?.eta && next.eta
        ? Math.abs(next.eta.getTime() - prev.eta.getTime()) / H_MS
        : null;
    return {
        etaShiftHours,
        statusChanged: prev?.trackingStatus !== next.trackingStatus,
        delayDetected: next.delayFlag !== "NONE" && next.delayFlag !== (prev?.delayFlag ?? "NONE"),
        arrived: next.trackingStatus === "ARRIVED_PORT" && prev?.trackingStatus !== "ARRIVED_PORT",
        departed: next.trackingStatus === "DEPARTED" && prev?.trackingStatus !== "DEPARTED",
    };
}
export function etaAlertSeverity(shiftHours) {
    if (shiftHours == null)
        return null;
    if (shiftHours >= 72)
        return "CRITICAL";
    if (shiftHours >= 24)
        return "WARNING";
    return null;
}
export function isDelayed(flag) {
    return flag === "MINOR" || flag === "MAJOR";
}
//# sourceMappingURL=tracking.diff.js.map
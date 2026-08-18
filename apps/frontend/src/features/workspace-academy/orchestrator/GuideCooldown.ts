// Cooldown between automatic guides — never stack overlays back-to-back.
// Spec: at least 30s OR until the user changes route (whichever comes first
// for allowing the next launch). Session storage is a cache only.

const COOLDOWN_KEY = "dmx.academy.autoGuideCooldown";
export const AUTO_GUIDE_COOLDOWN_MS = 30_000;

/** Journey pause — "Exit onboarding" stops auto-guides for this browser session. */
export const JOURNEY_PAUSED_KEY = "dmx.academy.journeyPaused";

/** Per-session skips ("Skip this guide") — not persisted permanently. */
const SESSION_SKIPPED_KEY = "dmx.academy.sessionSkippedGuides";

interface CooldownPayload {
  endedAt: number;
  route: string;
  guideId: string;
}

function readCooldown(): CooldownPayload | null {
  try {
    const raw = sessionStorage.getItem(COOLDOWN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CooldownPayload;
  } catch {
    return null;
  }
}

export function markAutoGuideEnded(guideId: string, route: string): void {
  try {
    const payload: CooldownPayload = { endedAt: Date.now(), route, guideId };
    sessionStorage.setItem(COOLDOWN_KEY, JSON.stringify(payload));
  } catch { /* private mode */ }
}

/**
 * Returns true when another automatic guide may start.
 * Allowed when: no prior cooldown, OR route changed, OR 30s elapsed.
 */
export function isAutoGuideCooldownClear(pathname: string): boolean {
  const cd = readCooldown();
  if (!cd) return true;
  if (cd.route !== pathname) return true;
  return Date.now() - cd.endedAt >= AUTO_GUIDE_COOLDOWN_MS;
}

export function isJourneyPaused(): boolean {
  try {
    return sessionStorage.getItem(JOURNEY_PAUSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function pauseJourney(): void {
  try { sessionStorage.setItem(JOURNEY_PAUSED_KEY, "1"); } catch { /* */ }
}

export function resumeJourney(): void {
  try {
    sessionStorage.removeItem(JOURNEY_PAUSED_KEY);
    sessionStorage.removeItem(COOLDOWN_KEY);
    sessionStorage.removeItem(SESSION_SKIPPED_KEY);
  } catch { /* */ }
}

export function skipGuideForSession(guideId: string): void {
  try {
    const set = new Set(readSessionSkipped());
    set.add(guideId);
    sessionStorage.setItem(SESSION_SKIPPED_KEY, JSON.stringify([...set]));
  } catch { /* */ }
}

export function isGuideSkippedThisSession(guideId: string): boolean {
  return readSessionSkipped().includes(guideId);
}

function readSessionSkipped(): string[] {
  try {
    const raw = sessionStorage.getItem(SESSION_SKIPPED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function clearAutoGuideSessionCache(): void {
  resumeJourney();
}

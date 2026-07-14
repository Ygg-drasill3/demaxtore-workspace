import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  OperationalNotificationType,
  type NotificationPreferences,
  type NotificationTypePreference,
  NotificationChannelPreference,
} from "@dmx/contracts/notification-center";

const DATA_DIR = path.join(process.cwd(), ".data", "notification-preferences");

/**
 * TECH DEBT (production readiness):
 * File-backed preferences are suitable for single-instance dev/staging only.
 * Horizontally scaled production must migrate channel preferences to the database
 * so Notification Center, Email Bridge and WhatsApp Bridge read one shared source.
 * Do not introduce a second preference system — extend this store or replace it in-place.
 */

function defaultTypePreferences(): NotificationTypePreference[] {
  return OperationalNotificationType.options.map((type) => ({
    type,
    channels: NotificationChannelPreference.parse({}),
  }));
}

export function defaultPreferences(): NotificationPreferences {
  return { types: defaultTypePreferences() };
}

async function ensureDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

function prefsPath(userId: string): string {
  return path.join(DATA_DIR, `${userId}.json`);
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const raw = await readFile(prefsPath(userId), "utf8");
    const parsed = JSON.parse(raw) as NotificationPreferences;
    if (!parsed?.types?.length) return defaultPreferences();
    return parsed;
  } catch {
    return defaultPreferences();
  }
}

export async function saveNotificationPreferences(
  userId: string,
  prefs: NotificationPreferences,
): Promise<NotificationPreferences> {
  await ensureDir();
  const merged = {
    types: defaultTypePreferences().map((def) => {
      const found = prefs.types.find((t) => t.type === def.type);
      return found ?? def;
    }),
  };
  await writeFile(prefsPath(userId), JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

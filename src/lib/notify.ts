// Local reminders. Everything is scheduled on the device; nothing needs a server.
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';
import { APP_NAME } from '../theme';

export interface ReminderPrefs {
  weighIn: boolean;
  checkIn: boolean;
  food: boolean;
  training: boolean;
  rest: boolean;
}
export const DEFAULT_REMINDERS: ReminderPrefs = { weighIn: false, checkIn: false, food: false, training: false, rest: false };

const supported = Platform.OS !== 'web';
type N = typeof NotificationsModule;
let cached: N | null | undefined;

/**
 * The notifications module is loaded on first use, never at app start, so a
 * runtime that lacks it (or restricts it) can't stop the app from opening.
 */
function load(): N | null {
  if (!supported) return null;
  if (cached !== undefined) return cached;
  try {
    const mod = require('expo-notifications') as N;
    mod.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    cached = mod;
  } catch {
    cached = null;
  }
  return cached;
}

export async function ensurePermission(): Promise<boolean> {
  const Notifications = load();
  if (!Notifications) return false;
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

const IDS = { weighIn: 'weigh-in', checkIn: 'check-in', food: 'food-log', training: 'training' } as const;

async function replace(Notifications: N, id: string, on: boolean, title: string, body: string, trigger: NotificationsModule.NotificationTriggerInput) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  if (on) await Notifications.scheduleNotificationAsync({ identifier: id, content: { title, body, sound: true }, trigger });
}

/**
 * Re-creates the repeating reminders from the current preferences.
 * `weighInDay` is 0 = Sunday; the notification API counts 1 = Sunday.
 */
export async function syncReminders(prefs: ReminderPrefs, weighInDay: number, nextSession?: string): Promise<void> {
  const Notifications = load();
  if (!Notifications) return;
  const T = Notifications.SchedulableTriggerInputTypes;
  try {
    const weekday = weighInDay + 1;
    await replace(Notifications, IDS.weighIn, prefs.weighIn, 'Weigh-in day', 'Step on the scales before breakfast and log it.', { type: T.WEEKLY, weekday, hour: 7, minute: 30 });
    await replace(Notifications, IDS.checkIn, prefs.checkIn, 'Weekly check-in', `Two minutes with ${APP_NAME} to review your week and retune the plan.`, { type: T.WEEKLY, weekday, hour: 18, minute: 30 });
    await replace(Notifications, IDS.food, prefs.food, 'Log today’s food', 'A logged day is what lets your coach adjust your plan.', { type: T.DAILY, hour: 20, minute: 0 });
    await replace(Notifications, IDS.training, prefs.training, 'Session waiting', nextSession ? `${nextSession} is up next.` : 'Your next session is ready.', { type: T.DAILY, hour: 17, minute: 0 });
  } catch {
    // Scheduling can fail if permission was revoked in Settings; the toggles stay as they are.
  }
}

const REST_ID = 'rest-timer';

/** Fires when the rest period ends, so it shows on the lock screen and a paired watch. */
export async function scheduleRestAlert(seconds: number, exercise: string): Promise<void> {
  const Notifications = load();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: REST_ID,
      content: { title: 'Rest over', body: `Next set: ${exercise}`, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)) },
    });
  } catch {
    // Non-critical.
  }
}

export async function cancelRestAlert(): Promise<void> {
  const Notifications = load();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_ID);
  } catch {
    // Nothing scheduled.
  }
}

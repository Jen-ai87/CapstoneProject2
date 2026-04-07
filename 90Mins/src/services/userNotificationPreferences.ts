import Logger from './logger';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const logger = new Logger('userNotificationPreferences');
const TABLE_NAME = 'user_notification_preferences';

export interface UserNotificationPreferences {
  notifGoals: boolean;
  notifMatchStart: boolean;
  notifHalfTime: boolean;
  notifFullTime: boolean;
}

export const defaultNotificationPreferences: UserNotificationPreferences = {
  notifGoals: true,
  notifMatchStart: true,
  notifHalfTime: false,
  notifFullTime: true,
};

const getLocalStorageKey = (userId: string) => `notification_preferences_${userId}`;

const readLocalPreferences = (userId: string): UserNotificationPreferences => {
  try {
    const raw = localStorage.getItem(getLocalStorageKey(userId));
    if (!raw) return defaultNotificationPreferences;
    const parsed = JSON.parse(raw) as Partial<UserNotificationPreferences>;

    return {
      notifGoals: parsed.notifGoals ?? defaultNotificationPreferences.notifGoals,
      notifMatchStart: parsed.notifMatchStart ?? defaultNotificationPreferences.notifMatchStart,
      notifHalfTime: parsed.notifHalfTime ?? defaultNotificationPreferences.notifHalfTime,
      notifFullTime: parsed.notifFullTime ?? defaultNotificationPreferences.notifFullTime,
    };
  } catch {
    return defaultNotificationPreferences;
  }
};

const writeLocalPreferences = (userId: string, prefs: UserNotificationPreferences): void => {
  try {
    localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(prefs));
  } catch {
    logger.warn('Failed to cache notification preferences in localStorage');
  }
};

const emitPreferencesUpdated = (userId: string): void => {
  window.dispatchEvent(
    new CustomEvent('user-notification-preferences-updated', {
      detail: { userId },
    })
  );
};

export async function fetchUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences> {
  if (!userId) return defaultNotificationPreferences;

  const localPrefs = readLocalPreferences(userId);
  if (!isSupabaseConfigured) return localPrefs;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('notif_goals, notif_match_start, notif_half_time, notif_full_time')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.warn(`Failed to load cloud notification preferences: ${error.message}`);
    return localPrefs;
  }

  if (!data) {
    return localPrefs;
  }

  const prefs: UserNotificationPreferences = {
    notifGoals: Boolean(data.notif_goals),
    notifMatchStart: Boolean(data.notif_match_start),
    notifHalfTime: Boolean(data.notif_half_time),
    notifFullTime: Boolean(data.notif_full_time),
  };

  writeLocalPreferences(userId, prefs);
  emitPreferencesUpdated(userId);
  return prefs;
}

export async function saveUserNotificationPreferences(
  userId: string,
  prefs: UserNotificationPreferences
): Promise<{ ok: boolean; error?: string }> {
  if (!userId) return { ok: false, error: 'Missing user id' };

  writeLocalPreferences(userId, prefs);
  emitPreferencesUpdated(userId);

  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Supabase not configured. Saved locally only.' };
  }

  const { error } = await supabase.from(TABLE_NAME).upsert(
    {
      user_id: userId,
      notif_goals: prefs.notifGoals,
      notif_match_start: prefs.notifMatchStart,
      notif_half_time: prefs.notifHalfTime,
      notif_full_time: prefs.notifFullTime,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    logger.warn(`Failed to save cloud notification preferences: ${error.message}`);
    return { ok: false, error: error.message };
  }

  emitPreferencesUpdated(userId);
  return { ok: true };
}
import Logger from './logger';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const logger = new Logger('userNotifications');
const TABLE_NAME = 'user_notifications';
const MAX_NOTIFICATIONS = 50;

export type NotificationIconKey = 'star' | 'football' | 'time';

export interface StoredNotification {
  id: string;
  iconKey: NotificationIconKey;
  iconColor: string;
  title: string;
  body: string;
  timestamp: number;
  unread: boolean;
  matchId?: string;
}

const getLocalStorageKey = (userId: string) => `notifications_${userId}`;

const clampNotifications = (notifications: StoredNotification[]) =>
  [...notifications]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_NOTIFICATIONS);

const readLocalNotifications = (userId: string): StoredNotification[] => {
  try {
    const raw = localStorage.getItem(getLocalStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return clampNotifications(
      parsed.filter((item): item is StoredNotification => {
        return (
          typeof item?.id === 'string' &&
          typeof item?.iconKey === 'string' &&
          typeof item?.iconColor === 'string' &&
          typeof item?.title === 'string' &&
          typeof item?.body === 'string' &&
          typeof item?.timestamp === 'number' &&
          typeof item?.unread === 'boolean'
        );
      })
    );
  } catch {
    return [];
  }
};

const writeLocalNotifications = (userId: string, notifications: StoredNotification[]): void => {
  try {
    localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(clampNotifications(notifications)));
  } catch {
    logger.warn('Failed to cache notifications in localStorage');
  }
};

async function enforceCloudNotificationLimit(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) {
    logger.warn(`Failed to enforce notification cap: ${error.message}`);
    return;
  }

  const extraIds = (data || []).slice(MAX_NOTIFICATIONS).map((row) => String(row.id));
  if (extraIds.length === 0) return;

  const { error: deleteError } = await supabase
    .from(TABLE_NAME)
    .delete()
    .in('id', extraIds);

  if (deleteError) {
    logger.warn(`Failed to prune old notifications: ${deleteError.message}`);
  }
}

export async function fetchUserNotifications(userId: string): Promise<StoredNotification[]> {
  if (!userId) return [];

  const localItems = readLocalNotifications(userId);
  if (!isSupabaseConfigured) return localItems;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id, icon_key, icon_color, title, body, timestamp, unread, match_id')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(MAX_NOTIFICATIONS);

  if (error) {
    logger.warn(`Failed to load cloud notifications: ${error.message}`);
    return localItems;
  }

  const notifications: StoredNotification[] = (data || [])
    .map((row) => ({
      id: String(row.id),
      iconKey: (row.icon_key || 'star') as NotificationIconKey,
      iconColor: String(row.icon_color || '#00B8DB'),
      title: String(row.title || ''),
      body: String(row.body || ''),
      timestamp: Number(row.timestamp || Date.now()),
      unread: Boolean(row.unread),
      matchId: row.match_id ? String(row.match_id) : undefined,
    }))
    .filter((n) => n.title.length > 0);

  writeLocalNotifications(userId, notifications);
  void enforceCloudNotificationLimit(userId);
  return notifications;
}

export async function saveUserNotification(userId: string, notification: StoredNotification): Promise<void> {
  if (!userId) return;

  const local = readLocalNotifications(userId).filter((n) => n.id !== notification.id);
  writeLocalNotifications(userId, [notification, ...local]);

  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from(TABLE_NAME).upsert(
    {
      id: notification.id,
      user_id: userId,
      icon_key: notification.iconKey,
      icon_color: notification.iconColor,
      title: notification.title,
      body: notification.body,
      timestamp: notification.timestamp,
      unread: notification.unread,
      match_id: notification.matchId || null,
    },
    { onConflict: 'id' }
  );

  if (error) {
    logger.warn(`Failed to save cloud notification: ${error.message}`);
    return;
  }

  void enforceCloudNotificationLimit(userId);
}

export async function markUserNotificationRead(userId: string, id: string): Promise<void> {
  if (!userId || !id) return;

  const local = readLocalNotifications(userId).map((n) =>
    n.id === id ? { ...n, unread: false } : n
  );
  writeLocalNotifications(userId, local);

  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ unread: false })
    .eq('user_id', userId)
    .eq('id', id);

  if (error) {
    logger.warn(`Failed to mark cloud notification as read: ${error.message}`);
  }
}

export async function markAllUserNotificationsRead(userId: string): Promise<void> {
  if (!userId) return;

  const local = readLocalNotifications(userId).map((n) => ({ ...n, unread: false }));
  writeLocalNotifications(userId, local);

  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ unread: false })
    .eq('user_id', userId)
    .eq('unread', true);

  if (error) {
    logger.warn(`Failed to mark all cloud notifications as read: ${error.message}`);
  }
}

export async function clearUserNotifications(userId: string): Promise<void> {
  if (!userId) return;

  writeLocalNotifications(userId, []);

  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('user_id', userId);

  if (error) {
    logger.warn(`Failed to clear cloud notifications: ${error.message}`);
  }
}

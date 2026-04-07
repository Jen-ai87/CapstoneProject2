import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getTeamById } from '../data/dataHelpers';
import { fetchUserFavouriteTeamIds } from '../services/userFavourites';
import {
  defaultNotificationPreferences,
  fetchUserNotificationPreferences,
  UserNotificationPreferences,
} from '../services/userNotificationPreferences';
import {
  clearUserNotifications,
  fetchUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
  NotificationIconKey,
  saveUserNotification,
  StoredNotification,
} from '../services/userNotifications';
import footballApi from '../services/footballApi';
import { footballOutline, timeOutline, starOutline } from 'ionicons/icons';

export interface Notification {
  id: string;
  iconKey: NotificationIconKey;
  icon: string;
  iconColor: string;
  title: string;
  body: string;
  time: string;
  timestamp: number;
  unread: boolean;
  matchId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const iconByKey: Record<NotificationIconKey, string> = {
  star: starOutline,
  football: footballOutline,
  time: timeOutline,
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<UserNotificationPreferences>(defaultNotificationPreferences);
  const trackedMatchesRef = useRef<Map<string, any>>(new Map());

  // Get user's favourite team IDs
  const getFavouriteTeamIds = async (): Promise<string[]> => {
    if (!user?.id) return [];
    return fetchUserFavouriteTeamIds(user.id);
  };

  const getRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const addNotification = (notif: Omit<Notification, 'id' | 'timestamp' | 'time' | 'unread'>) => {
    const timestamp = Date.now();
    const newNotif: Notification = {
      ...notif,
      id: `notif-${timestamp}-${Math.random()}`,
      timestamp,
      time: getRelativeTime(timestamp),
      unread: true,
    };

    setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Keep max 50 notifications

    if (user?.id) {
      const stored: StoredNotification = {
        id: newNotif.id,
        iconKey: newNotif.iconKey,
        iconColor: newNotif.iconColor,
        title: newNotif.title,
        body: newNotif.body,
        timestamp: newNotif.timestamp,
        unread: newNotif.unread,
        matchId: newNotif.matchId,
      };
      void saveUserNotification(user.id, stored);
    }
  };

  const checkLiveMatches = async () => {
    if (!isAuthenticated || USE_MOCK_DATA) return;

    try {
      const favouriteTeamIds = await getFavouriteTeamIds();
      if (favouriteTeamIds.length === 0) return;

      // Fetch today's matches
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const response = await footballApi.getFixturesByDate(dateStr) as any;
      if (!response?.matches) return;

      const matchesById = trackedMatchesRef.current;

      const matchTeamIds = (apiTeam: any): number[] => {
        const ids = [apiTeam?.internalId, apiTeam?.apiId, apiTeam?.id];
        return ids.filter((id): id is number => typeof id === 'number');
      };

      const isFavouriteTeamInMatch = (apiMatch: any): boolean => {
        const homeIds = matchTeamIds(apiMatch.homeTeam);
        const awayIds = matchTeamIds(apiMatch.awayTeam);

        return favouriteTeamIds.some((teamId) => {
          const team = getTeamById(teamId);
          if (!team) return false;

          const localIds = [team.bsdTeamId, team.bsdApiId].filter(
            (id): id is number => typeof id === 'number'
          );
          return localIds.some(
            (id) => homeIds.includes(id) || awayIds.includes(id)
          );
        });
      };

      for (const apiMatch of response.matches) {
        const involvesFavourite = isFavouriteTeamInMatch(apiMatch);

        if (!involvesFavourite || apiMatch.status !== 'IN_PLAY') continue;

        const matchId = `match-${apiMatch.id}`;
        const previousMatch = matchesById.get(matchId);

        // First time seeing this match as live
        if (!previousMatch && apiMatch.status === 'IN_PLAY' && preferences.notifMatchStart) {
          addNotification({
            iconKey: 'star',
            icon: starOutline,
            iconColor: '#00B8DB',
            title: 'Match Started!',
            body: `${apiMatch.homeTeam.name} vs ${apiMatch.awayTeam.name} is now live`,
            matchId,
          });
        }

        // Check for goals
        const currentHomeScore = apiMatch.score?.fullTime?.home ?? 0;
        const currentAwayScore = apiMatch.score?.fullTime?.away ?? 0;

        if (previousMatch) {
          const prevHomeScore = previousMatch.score?.fullTime?.home ?? 0;
          const prevAwayScore = previousMatch.score?.fullTime?.away ?? 0;

          if (currentHomeScore > prevHomeScore && preferences.notifGoals) {
            addNotification({
              iconKey: 'football',
              icon: footballOutline,
              iconColor: '#00B8DB',
              title: `GOAL! ${apiMatch.homeTeam.shortName} ${currentHomeScore} – ${currentAwayScore} ${apiMatch.awayTeam.shortName}`,
              body: `${apiMatch.homeTeam.name} scores! Minute ${apiMatch.minute || '?'}'`,
              matchId,
            });
          }

          if (currentAwayScore > prevAwayScore && preferences.notifGoals) {
            addNotification({
              iconKey: 'football',
              icon: footballOutline,
              iconColor: '#00B8DB',
              title: `GOAL! ${apiMatch.homeTeam.shortName} ${currentHomeScore} – ${currentAwayScore} ${apiMatch.awayTeam.shortName}`,
              body: `${apiMatch.awayTeam.name} scores! Minute ${apiMatch.minute || '?'}'`,
              matchId,
            });
          }
        }

        // Check for half-time
        if (apiMatch.status === 'PAUSED' && previousMatch?.status === 'IN_PLAY' && preferences.notifHalfTime) {
          addNotification({
            iconKey: 'time',
            icon: timeOutline,
            iconColor: '#8b949e',
            title: `Half Time: ${apiMatch.homeTeam.shortName} ${currentHomeScore} – ${currentAwayScore} ${apiMatch.awayTeam.shortName}`,
            body: `First half ends at ${apiMatch.venue || 'the stadium'}`,
            matchId,
          });
        }

        // Check for full-time
        if (apiMatch.status === 'FINISHED' && previousMatch?.status === 'IN_PLAY' && preferences.notifFullTime) {
          addNotification({
            iconKey: 'football',
            icon: footballOutline,
            iconColor: '#22c55e',
            title: `Full Time: ${apiMatch.homeTeam.shortName} ${currentHomeScore} – ${currentAwayScore} ${apiMatch.awayTeam.shortName}`,
            body: `Match ended at ${apiMatch.venue || 'the stadium'}`,
            matchId,
          });
        }

        // Update tracked match
        matchesById.set(matchId, apiMatch);
      }
    } catch (err) {
    }
  };

  // Poll for live match updates every 60 seconds
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setPreferences(defaultNotificationPreferences);
      trackedMatchesRef.current = new Map();
      return;
    }

    checkLiveMatches();
    const interval = setInterval(checkLiveMatches, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, preferences]);

  useEffect(() => {
    let cancelled = false;

    const loadNotificationHistory = async () => {
      if (!isAuthenticated || !user?.id) return;
      const stored = await fetchUserNotifications(user.id);
      if (cancelled) return;

      const mapped: Notification[] = stored.map((item) => ({
        id: item.id,
        iconKey: item.iconKey,
        icon: iconByKey[item.iconKey] || starOutline,
        iconColor: item.iconColor,
        title: item.title,
        body: item.body,
        time: getRelativeTime(item.timestamp),
        timestamp: item.timestamp,
        unread: item.unread,
        matchId: item.matchId,
      }));

      setNotifications(mapped);
    };

    loadNotificationHistory();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      if (!isAuthenticated || !user?.id) return;

      const prefs = await fetchUserNotificationPreferences(user.id);
      if (!cancelled) {
        setPreferences(prefs);
      }
    };

    loadPreferences();

    const onPreferencesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId?: string }>;
      const changedUserId = customEvent.detail?.userId;
      if (changedUserId && changedUserId === user?.id) {
        loadPreferences();
      }
    };

    window.addEventListener('user-notification-preferences-updated', onPreferencesUpdated as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener('user-notification-preferences-updated', onPreferencesUpdated as EventListener);
    };
  }, [isAuthenticated, user?.id]);

  // Update relative times every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev =>
        prev.map(notif => ({
          ...notif,
          time: getRelativeTime(notif.timestamp),
        }))
      );
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif => (notif.id === id ? { ...notif, unread: false } : notif))
    );
    if (user?.id) {
      void markUserNotificationRead(user.id, id);
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, unread: false })));
    if (user?.id) {
      void markAllUserNotificationsRead(user.id);
    }
  };

  const clearAll = () => {
    setNotifications([]);
    if (user?.id) {
      void clearUserNotifications(user.id);
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

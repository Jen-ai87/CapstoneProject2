import { useEffect, useState, useRef } from 'react';
import matchReminderService from '../services/matchReminder';
import Logger from '../services/logger';

interface UseMatchRemindersOptions {
  enabled?: boolean;
  onReminder?: (match: any) => void;
  onStarted?: () => void;
  onStopped?: () => void;
}

interface UseMatchRemindersResult {
  isActive: boolean;
  reminderCount: number;
}

/**
 * React hook for match reminders
 * Automatically starts/stops reminder service on mount/unmount
 */
export const useMatchReminders = (options: UseMatchRemindersOptions = {}): UseMatchRemindersResult => {
  const {
    enabled = true,
    onReminder,
    onStarted,
    onStopped,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [reminderCount, setReminderCount] = useState(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const loggerRef = useRef(new Logger('useMatchReminders'));

  useEffect(() => {
    if (!enabled) {
      // Stop if disabled
      if (isActive) {
        matchReminderService.stopReminders();
        setIsActive(false);
        onStopped?.();
      }
      return;
    }

    // Subscribe to reminders
    unsubscribeRef.current = matchReminderService.onReminder((match) => {
      loggerRef.current.debug('[useMatchReminders] Reminder received:', match._reminderType);
      setReminderCount(prev => prev + 1);
      onReminder?.(match);
    });

    // Start the service
    matchReminderService.startReminders();
    setIsActive(true);
    onStarted?.();

    loggerRef.current.info('[useMatchReminders] Hook mounted and reminders started');

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      matchReminderService.stopReminders();
      setIsActive(false);
      onStopped?.();
      loggerRef.current.info('[useMatchReminders] Hook unmounted and reminders stopped');
    };
  }, [enabled, onReminder, onStarted, onStopped]);

  return {
    isActive,
    reminderCount,
  };
};

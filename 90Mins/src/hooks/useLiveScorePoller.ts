/**
 * React Hook for Live Score Polling
 * Provides easy integration of live score updates in React components
 */

import { useEffect, useRef, useState } from 'react';
import {
  startPolling,
  stopPolling,
  onLiveScoresUpdate,
  isPollingActive,
  getCurrentPollInterval,
  getLastUpdateTime,
  triggerManualPoll,
  resetPollingInterval,
} from '../services/liveScorePoller';
import Logger from '../services/logger';

const logger = new Logger('useLiveScorePoller');

export interface UseLiveScorePollOptions {
  enabled?: boolean; // Default: true
  initialInterval?: number; // Custom poll interval
  onUpdate?: (matches: any[]) => void; // Callback when scores update
  onStarted?: () => void; // Callback when polling starts
  onStopped?: () => void; // Callback when polling stops
}

/**
 * React hook for integrating live score polling into components
 *
 * @example
 * const { isActive, lastUpdate, manualRefresh } = useLiveScorePoller({
 *   enabled: true,
 *   onUpdate: (matches) => setLiveMatches(matches),
 * });
 */
export const useLiveScorePoller = (options: UseLiveScorePollOptions = {}) => {
  const {
    enabled = true,
    initialInterval,
    onUpdate,
    onStarted,
    onStopped,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pollInterval, setPollInterval] = useState(initialInterval || 10000);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Set up polling on mount
  useEffect(() => {
    if (!enabled) {
      logger.debug('Live score polling disabled via hook option');
      return;
    }

    logger.debug('Setting up live score polling');

    // Start polling
    startPolling(initialInterval);
    setIsActive(true);
    onStarted?.();

    // Subscribe to updates
    unsubscribeRef.current = onLiveScoresUpdate((matches) => {
      logger.debug('Live score update received', { matchCount: matches?.length });
      setLastUpdate(new Date());
      setPollInterval(getCurrentPollInterval());
      onUpdate?.(matches);
    });

    // Cleanup
    return () => {
      logger.debug('Cleaning up live score polling');
      stopPolling();
      setIsActive(false);
      onStopped?.();

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [enabled, initialInterval, onUpdate, onStarted, onStopped]);

  // Manual refresh function
  const manualRefresh = async () => {
    logger.debug('Manual refresh triggered');
    const matches = await triggerManualPoll();
    if (matches) {
      setLastUpdate(new Date());
      onUpdate?.(matches);
    }
    return matches;
  };

  // Reset polling interval (e.g., when returning from background)
  const resetInterval = () => {
    logger.debug('Resetting polling interval');
    resetPollingInterval();
    setPollInterval(10000);
  };

  return {
    isActive,
    lastUpdate,
    pollInterval,
    manualRefresh,
    resetInterval,
  };
};

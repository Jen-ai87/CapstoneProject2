/**
 * Live Score Polling Service
 * Polls for live match updates at configurable intervals
 * Only enabled for BSD API (unlimited free requests)
 * Includes exponential backoff, foreground detection, and smart caching
 */

import Logger from './logger';
import footballApi from './footballApi';

const logger = new Logger('liveScorePoller');

// Configuration
const INITIAL_POLL_INTERVAL = 10000; // 10 seconds
const MAX_POLL_INTERVAL = 60000; // 60 seconds (don't poll more than every minute)
const BACKOFF_MULTIPLIER = 1.5;
const NO_CHANGE_THRESHOLD = 3; // After 3 polls with no changes, increase interval

// Polling state
let isPolling = false;
let pollInterval = INITIAL_POLL_INTERVAL;
let noChangeCount = 0;
let pollTimeoutId: NodeJS.Timeout | null = null;
let lastUpdateTime: number = 0;

// Callbacks for when data updates
const updateListeners: ((data: any) => void)[] = [];

// Track if page is in background
let isPageVisible = true;

/**
 * Register a callback to be called when live scores update
 */
export const onLiveScoresUpdate = (callback: (data: any) => void) => {
  updateListeners.push(callback);
  return () => {
    const index = updateListeners.indexOf(callback);
    if (index > -1) {
      updateListeners.splice(index, 1);
    }
  };
};

/**
 * Notify all listeners of score updates
 */
function notifyListeners(data: any) {
  updateListeners.forEach((callback) => {
    try {
      callback(data);
    } catch (err) {
      logger.error('Error in listener callback:', err);
    }
  });
}

/**
 * Check if BSD API is the active provider
 */
function isBsdProvider(): boolean {
  const provider = import.meta.env.VITE_API_PROVIDER || 'bsd';
  return provider.toLowerCase() === 'bsd';
}

/**
 * Detect actual data changes by comparing objects
 */
function hasDataChanged(oldData: any, newData: any): boolean {
  if (!oldData || !newData) return true;

  // Compare key fields for matches
  if (Array.isArray(oldData) && Array.isArray(newData)) {
    if (oldData.length !== newData.length) return true;

    for (let i = 0; i < oldData.length; i++) {
      const oldMatch = oldData[i];
      const newMatch = newData[i];

      if (!oldMatch || !newMatch) return true;

      // Check critical fields
      if (
        oldMatch.id !== newMatch.id ||
        oldMatch.status !== newMatch.status ||
        oldMatch.homeTeam?.score !== newMatch.homeTeam?.score ||
        oldMatch.awayTeam?.score !== newMatch.awayTeam?.score ||
        oldMatch.minute !== newMatch.minute
      ) {
        return true;
      }
    }
    return false;
  }

  // For single objects
  return JSON.stringify(oldData) !== JSON.stringify(newData);
}

/**
 * Perform a single poll for live matches
 */
async function pollLiveMatches() {
  try {
    if (!isBsdProvider()) {
      logger.debug('BSD provider not active, stopping polling');
      stopPolling();
      return;
    }

    logger.debug(`Polling live matches (interval: ${pollInterval}ms)`);

    // Prefer live endpoint to avoid timezone/date mismatches
    const liveResponse = await footballApi.getLiveMatches();
    let matches = liveResponse?.matches || [];

    if (!matches || matches.length === 0) {
      // Fallback to today's fixtures if live endpoint returns nothing
      const response = await footballApi.getFixturesByDate(new Date().toISOString().split('T')[0]);
      matches = response?.matches || [];
    }

    if (!matches || matches.length === 0) {
      logger.debug('No matches returned from API');
      return;
    }

    // Filter for live matches only, including halftime/paused states
    const liveMatches = matches.filter((m: any) => {
      const status = String(m.status || '').toUpperCase();
      return [
        'LIVE',
        'IN_PLAY',
        'HT',
        '1H',
        '2H',
        'PAUSED',
        'HALFTIME',
        'HALF_TIME',
        'BREAK',
        '1T',
        '2T',
      ].includes(status);
    });

    if (liveMatches.length === 0) {
      logger.debug('No live matches found');
      noChangeCount = Math.min(noChangeCount + 1, 5);
    } else {
      logger.debug(`Found ${liveMatches.length} live matches`);
      noChangeCount = 0; // Reset when we find live matches
      lastUpdateTime = Date.now();
      notifyListeners(liveMatches);
    }

    // Adjust polling interval based on activity
    adjustPollingInterval();
  } catch (err) {
    logger.error('Error polling live matches:', err);
    noChangeCount++;
  }

  // Schedule next poll
  if (isPolling && isPageVisible) {
    pollTimeoutId = setTimeout(pollLiveMatches, pollInterval);
  }
}

/**
 * Adjust polling interval based on activity
 * Use exponential backoff if no changes detected
 */
function adjustPollingInterval() {
  if (noChangeCount >= NO_CHANGE_THRESHOLD) {
    const newInterval = Math.min(pollInterval * BACKOFF_MULTIPLIER, MAX_POLL_INTERVAL);
    if (newInterval !== pollInterval) {
      logger.debug(`No changes detected, increasing poll interval to ${newInterval}ms`);
      pollInterval = Math.floor(newInterval);
    }
  } else {
    // Reset to initial interval when changes are detected
    if (pollInterval > INITIAL_POLL_INTERVAL) {
      logger.debug('Changes detected, resetting to initial poll interval');
      pollInterval = INITIAL_POLL_INTERVAL;
    }
  }
}

/**
 * Handle page visibility change
 */
function handleVisibilityChange() {
  isPageVisible = !document.hidden;
  logger.debug(`Page visibility changed: ${isPageVisible ? 'visible' : 'hidden'}`);

  if (isPageVisible && isPolling) {
    // Resume polling when page becomes visible
    logger.debug('Page visible, resuming polling');
    if (pollTimeoutId) clearTimeout(pollTimeoutId);
    pollLiveMatches();
  } else if (!isPageVisible && isPolling) {
    // Pause polling when page is hidden
    logger.debug('Page hidden, pausing polling');
    if (pollTimeoutId) {
      clearTimeout(pollTimeoutId);
      pollTimeoutId = null;
    }
  }
}

/**
 * Start polling for live score updates
 * Only works with BSD API (unlimited requests)
 */
export const startPolling = (initialInterval?: number) => {
  if (!isBsdProvider()) {
    logger.warn('Polling not supported for non-BSD providers (rate-limited). Skipping.');
    return;
  }

  if (isPolling) {
    logger.debug('Polling already active');
    return;
  }

  isPolling = true;
  pollInterval = initialInterval || INITIAL_POLL_INTERVAL;
  noChangeCount = 0;
  lastUpdateTime = 0;

  logger.info(`Starting live score polling (${pollInterval}ms interval for BSD API)`);

  // Set up visibility change listener
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Start first poll immediately
  if (isPageVisible) {
    pollLiveMatches();
  }
};

/**
 * Stop polling for live score updates
 */
export const stopPolling = () => {
  if (!isPolling) return;

  logger.info('Stopping live score polling');
  isPolling = false;

  if (pollTimeoutId) {
    clearTimeout(pollTimeoutId);
    pollTimeoutId = null;
  }

  document.removeEventListener('visibilitychange', handleVisibilityChange);
};

/**
 * Check if polling is currently active
 */
export const isPollingActive = (): boolean => {
  return isPolling;
};

/**
 * Get current polling interval in milliseconds
 */
export const getCurrentPollInterval = (): number => {
  return pollInterval;
};

/**
 * Get time of last successful update
 */
export const getLastUpdateTime = (): number => {
  return lastUpdateTime;
};

/**
 * Manually trigger a poll (useful for manual refresh)
 */
export const triggerManualPoll = async () => {
  if (!isBsdProvider()) {
    logger.warn('Manual poll not supported for non-BSD providers');
    return null;
  }

  logger.debug('Manual poll triggered');
  try {
    const matches = await footballApi.getFixturesByDate(new Date().toISOString().split('T')[0]);
    const liveMatches = (matches as any[])?.filter((m: any) => {
      const status = String(m.status || '').toUpperCase();
      return [
        'LIVE',
        'IN_PLAY',
        'HT',
        '1H',
        '2H',
        'PAUSED',
        'HALFTIME',
        'HALF_TIME',
        'BREAK',
        '1T',
        '2T',
      ].includes(status);
    }) || [];
    
    if (liveMatches.length > 0) {
      lastUpdateTime = Date.now();
      notifyListeners(liveMatches);
    }
    
    return liveMatches;
  } catch (err) {
    logger.error('Error in manual poll:', err);
    return null;
  }
};

/**
 * Reset polling interval to initial (useful when returning from background)
 */
export const resetPollingInterval = () => {
  pollInterval = INITIAL_POLL_INTERVAL;
  noChangeCount = 0;
  logger.debug('Polling interval reset to initial value');
};

/**
 * Standings Cache Service
 * Caches standings data with TTL to avoid repeated API calls
 * Used by both StandingsPage and ClubPage
 */

import { LeagueStanding } from '../data/types';

interface CachedStanding {
  data: LeagueStanding;
  timestamp: number;
}

type StandingsCacheMap = Record<string, CachedStanding>;

// In-memory cache
const standingsCache: StandingsCacheMap = {};

// TTL in milliseconds (5 minutes to match API's 300s TTL)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get standings from cache if available and fresh
 */
export function getCachedStandings(leagueId: string): LeagueStanding | null {
  const cached = standingsCache[leagueId];
  
  if (!cached) {
    return null;
  }

  // Check if cache has expired
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    // Cache expired, remove it
    delete standingsCache[leagueId];
    return null;
  }

  return cached.data;
}

/**
 * Store standings in cache
 */
export function setCachedStandings(leagueId: string, standing: LeagueStanding): void {
  standingsCache[leagueId] = {
    data: standing,
    timestamp: Date.now(),
  };
}

/**
 * Clear cache for a specific league
 */
export function clearStandingsCache(leagueId: string): void {
  delete standingsCache[leagueId];
}

/**
 * Clear all cached standings
 */
export function clearAllStandingsCache(): void {
  Object.keys(standingsCache).forEach(key => {
    delete standingsCache[key];
  });
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getStandingsCacheStats(): {
  cachedLeagues: string[];
  cacheSize: number;
} {
  return {
    cachedLeagues: Object.keys(standingsCache),
    cacheSize: Object.keys(standingsCache).length,
  };
}

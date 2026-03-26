/**
 * Hybrid API Service
 * Allows fetching specific features from alternative providers
 * Use when the active provider doesn't support certain endpoints
 */

import * as sportsApiPro from './providers/sportsApiPro';
import Logger from './logger';

const API_PROVIDER = import.meta.env.VITE_API_PROVIDER || 'bsd';
const logger = new Logger('footballApiHybrid');

/**
 * Fetch historical match events from SportsAPIPro
 * Use this when BSD (active provider) doesn't have historical event data
 * @param fixtureId - Match/fixture ID
 */
export async function getHistoricalEventsFromSportsAPIPro(fixtureId: string) {
  try {
    const events = await sportsApiPro.getFixtureEvents(fixtureId);
    return events;
  } catch (err) {
    return null;
  }
}

/**
 * Fetch match statistics from SportsAPIPro
 * Use as fallback when BSD doesn't have statistics
 * @param fixtureId - Match/fixture ID
 */
export async function getStatisticsFromSportsAPIPro(fixtureId: string) {
  try {
    const stats = await sportsApiPro.getFixtureStatistics(fixtureId);
    return stats;
  } catch (err) {
    return null;
  }
}

/**
 * Fetch lineups from SportsAPIPro
 * Use when BSD doesn't provide lineup data
 * @param fixtureId - Match/fixture ID
 */
export async function getLineupsFromSportsAPIPro(fixtureId: string) {
  try {
    const lineups = await sportsApiPro.getFixtureLineups(fixtureId);
    return lineups;
  } catch (err) {
    return null;
  }
}

/**
 * Check if we should use hybrid mode for historical data
 * Returns true if active provider is BSD (which lacks historical events)
 */
export function shouldUseHybridForHistoricalData(): boolean {
  return API_PROVIDER === 'bsd';
}

/**
 * Fetch standings from SportsAPIPro
 * Use this when BSD (active provider) doesn't have standings data
 * Uses dedicated proxy route to bypass main API provider configuration
 * @param leagueId - League code (e.g., "PL", "LA", "SA", "BL1", "FL1")
 * @param season - Season year (e.g., "2025")
 */
export async function getStandingsFromSportsAPIPro(leagueId: string, season: string) {
  try {
    const isDev = import.meta.env.DEV;
    const API_KEY = import.meta.env.VITE_SPORTSAPIPRO_API_KEY || 'dc2a8076-6e55-4835-bb15-45273ed19411';
    
    // Map league codes to SportsAPIPro competition IDs
    const competitionIdMap: Record<string, number> = {
      'PL': 7,    // English Premier League
      'LA': 11,   // La Liga
      'BL1': 25,  // Bundesliga
      'SA': 17,   // Serie A
      'FL1': 35,  // Ligue 1
      'CL': 572,  // UEFA Champions League
    };
    
    const competitionId = competitionIdMap[leagueId] || 7;
    
    // Use dedicated proxy in dev, direct API in production
    const baseUrl = isDev ? '/sportsapipro-api' : 'https://v1.football.sportsapipro.com';
    const url = new URL(`${baseUrl}/standings`, isDev ? window.location.origin : undefined);
    // Use 'competitions' parameter (not 'competitionId') as per API docs
    url.searchParams.append('competitions', competitionId.toString());
    if (season) url.searchParams.append('season', season);
    
    const headers: Record<string, string> = {
      'x-api-key': API_KEY,
    };
    
    const response = await fetch(isDev ? url.toString() : url.href, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`SportsAPIPro Standing Error ${response.status}:`, errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const standings = await response.json();
    
    // Check if response has valid standings data
    if (standings && standings.standings && Array.isArray(standings.standings) && standings.standings.length > 0) {
      logger.debug('Valid standings data received from SportsAPIPro');
      return standings;
    } else if (standings && Object.keys(standings).length > 0 && !standings.standings) {
      // API returned a response but not in expected standings format - use fallback
      return null;
    }
    
    return standings;
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('Error fetching standings from SportsAPIPro:', errorMessage);
    return null;
  }
}

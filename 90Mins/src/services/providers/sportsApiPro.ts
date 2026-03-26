/**
 * Football API Service - SportsAPIPro Provider
 * Handles all communication with sportsapipro.com API
 * Provides the same interface as other providers for easy switching
 */

import Logger from '../logger';

const isDev = import.meta.env.DEV;
const BASE_URL = isDev ? '/api' : 'https://v1.football.sportsapipro.com';
const API_KEY = import.meta.env.VITE_SPORTSAPIPRO_API_KEY;
const logger = new Logger('sportsApiPro');

// Validate API key is configured
if (!API_KEY) {
  console.warn('⚠️ VITE_SPORTSAPIPRO_API_KEY environment variable is not set. SportsAPIPro features will not work.');
}

// Competition ID mapping for SportsAPIPro
// These are the numeric IDs used by SportsAPIPro instead of codes
export const SPORTSAPIPRO_COMPETITION_IDS = {
  PREMIER_LEAGUE: 7,        // England - Premier League
  LA_LIGA: 11,              // Spain - La Liga  
  BUNDESLIGA: 25,           // Germany - Bundesliga
  SERIE_A: 17,              // Italy - Serie A
  LIGUE_1: 13,              // France - Ligue 1
  CHAMPIONS_LEAGUE: 572,    // UEFA Champions League
};

/**
 * Base fetch function with API key headers for SportsAPIPro
 */
async function apiFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`, isDev ? window.location.origin : undefined);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const headers: Record<string, string> = {
    'x-api-key': API_KEY,
  };
  
  const response = await fetch(isDev ? url.toString() : url.href, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`API Error ${response.status}:`, errorText);
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data: T = await response.json();
  
  return data;
}

/**
 * Get live matches (all competitions)
 */
export async function getLiveMatches() {
  // SportsAPIPro returns live matches from GET /games/current
  const response = await apiFetch<any>('/games/current');
  
  // Extract and transform games
  const games = response?.games || [];
  const matches = games.map(transformSportsProGameToMatch);
  
  return {
    filters: { liveOnly: true },
    resultSet: {
      count: matches.length,
      first: matches[0]?.utcDate || '',
      last: matches[matches.length - 1]?.utcDate || ''
    },
    matches
  };
}

// BSD-only feature (stub for compatibility)
export async function getLiveMatchById(matchId: string) {
  return null;
}

/**
 * Transform SportsAPIPro game object to app match format
 */
function transformSportsProGameToMatch(game: any): any {
  const startTime = new Date(game.startTime);
  const isFinished = game.status === 'FINISHED' || game.status === 'CLOSED';
  const isLive = game.status === 'LIVE' || game.status === 'IN_PLAY';
  
  return {
    id: game.id,
    utcDate: game.startTime,
    status: isFinished ? 'FINISHED' : isLive ? 'LIVE' : 'SCHEDULED',
    minute: isLive ? (game.minute || null) : null,
    venue: game.venue || 'TBA',
    competition: {
      id: game.competitionId,
      name: game.competitionDisplayName,
      code: game.competitionDisplayName?.substring(0, 3).toUpperCase() || 'UNK'
    },
    homeTeam: {
      id: game.homeCompetitor?.id || 0,
      name: game.homeCompetitor?.name || 'Home',
      shortName: (game.homeCompetitor?.name || 'Home').substring(0, 3),
      tla: (game.homeCompetitor?.name || 'Home').substring(0, 3).toUpperCase(),
      crest: game.homeCompetitor?.logo
    },
    awayTeam: {
      id: game.awayCompetitor?.id || 0,
      name: game.awayCompetitor?.name || 'Away',
      shortName: (game.awayCompetitor?.name || 'Away').substring(0, 3),
      tla: (game.awayCompetitor?.name || 'Away').substring(0, 3).toUpperCase(),
      crest: game.awayCompetitor?.logo
    },
    score: {
      winner: (game.homeCompetitor?.score || 0) > (game.awayCompetitor?.score || 0) ? 'HOME' : 
              (game.awayCompetitor?.score || 0) > (game.homeCompetitor?.score || 0) ? 'AWAY' : 'DRAW',
      duration: 'REGULAR',
      fullTime: {
        home: game.homeCompetitor?.score || null,
        away: game.awayCompetitor?.score || null
      },
      halfTime: {
        home: game.homeCompetitorHalf?.score || null,
        away: game.awayCompetitorHalf?.score || null
      }
    }
  };
}

/**
 * Get fixtures by date
 * @param date - Date in format YYYY-MM-DD
 */
export async function getFixturesByDate(date: string) {
  // SportsAPIPro doesn't have direct date filtering, fetch from all major competitions
  const competitionIds = Object.values(SPORTSAPIPRO_COMPETITION_IDS)
    .slice(0, 5) // Exclude Champions League for now
    .map(id => id.toString());
  
  const promises = competitionIds.map(compId => 
    apiFetch<any>('/games/fixtures', { competitions: compId })
  );
  
  const results = await Promise.all(promises);
  
  // Extract all games from the wrapped responses and transform them
  const allGames: any[] = [];
  results.forEach((result, idx) => {
    
    // Try different possible structures
    if (result?.games && Array.isArray(result.games)) {
      allGames.push(...result.games.map(transformSportsProGameToMatch));
    } else if (result?.competitions && Array.isArray(result.competitions)) {
      // Games might be nested in competitions
      result.competitions.forEach((comp: any) => {
        if (comp.games && Array.isArray(comp.games)) {
          allGames.push(...comp.games.map(transformSportsProGameToMatch));
        }
      });
    }
  });
  
  
  // Filter games by the requested date
  const filteredGames = allGames.filter(game => {
    // Convert UTC date to local date (avoid timezone offset issues)
    const gameDate = new Date(game.utcDate);
    const year = gameDate.getFullYear();
    const month = String(gameDate.getMonth() + 1).padStart(2, '0');
    const day = String(gameDate.getDate()).padStart(2, '0');
    const gameDateStr = `${year}-${month}-${day}`;
    return gameDateStr === date;
  });
  
  return {
    filters: { date },
    resultSet: {
      count: filteredGames.length,
      first: filteredGames[0]?.utcDate || '',
      last: filteredGames[filteredGames.length - 1]?.utcDate || ''
    },
    matches: filteredGames
  };
}

/**
 * Get fixtures by league and season
 * @param leagueId - League code (e.g., "PL", "LA", "SA", "BL1", "FL1")
 * @param season - Season year (e.g., "2024")
 */
export async function getFixturesByLeague(leagueId: string, season?: string) {
  // Map the league code to SportsAPIPro competition ID
  const competitionId = mapLeagueIdToCompetitionId(leagueId);
  const response = await apiFetch<any>('/games/fixtures', { 
    competitions: competitionId.toString(),
    ...(season && { season })
  });
  
  // Extract and transform games
  const games = response?.games || [];
  const matches = games.map(transformSportsProGameToMatch);
  
  
  return {
    filters: { leagueId, season },
    resultSet: {
      count: matches.length,
      first: matches[0]?.utcDate || '',
      last: matches[matches.length - 1]?.utcDate || ''
    },
    competition: {
      id: competitionId,
      name: leagueId,
      code: leagueId
    },
    matches
  };
}

/**
 * Get fixture details by ID
 * @param fixtureId - Fixture ID
 */
export async function getFixtureById(fixtureId: string) {
  return apiFetch(`/games/${fixtureId}`);
}

/**
 * Get league standings
 * @param leagueId - League code (e.g., "PL", "LA", "SA", "BL1", "FL1")
 * @param season - Season year (e.g., "2024")
 */
export async function getStandings(leagueId: string, season?: string) {
  const competitionId = mapLeagueIdToCompetitionId(leagueId);
  return apiFetch('/standings', { 
    competitionId: competitionId.toString(),
    ...(season && { season })
  });
}

/**
 * Get all teams in a competition
 * @param leagueId - League code (e.g., "PL", "LA", "SA", "BL1", "FL1")
 * @param season - Season year (e.g., "2025")
 */
export async function getCompetitionTeams(leagueId: string, season?: string) {
  const competitionId = mapLeagueIdToCompetitionId(leagueId);
  return apiFetch('/teams', { 
    competitionId: competitionId.toString(),
    ...(season && { season })
  });
}

/**
 * Get team information
 * @param teamId - Team ID
 */
export async function getTeamById(teamId: string) {
  return apiFetch(`/teams/${teamId}`);
}

// BSD-only features (stubs for compatibility)
export async function getLeagueById(leagueId: string) {
  return null;
}

export async function getPlayerById(playerId: string) {
  return null;
}

export async function getPlayersByTeam(teamId: string) {
  return { results: [] };
}

/**
 * Get leagues/competitions information
 */
export async function getLeagues() {
  return apiFetch('/competitions');
}

/**
 * Get head to head matches between two teams
 * @param team1Id - First team ID
 * @param team2Id - Second team ID
 */
export async function getHeadToHead(team1Id: string, team2Id: string) {
  // Use a generic endpoint or fetch from a matches list
  return apiFetch(`/teams/${team1Id}/matches`);
}

/**
 * Get fixture details with statistics
 * @param fixtureId - Fixture ID
 */
export async function getFixtureStatistics(fixtureId: string) {
  return apiFetch(`/games/${fixtureId}`);
}

/**
 * Get fixture events (goals, cards, substitutions)
 * @param fixtureId - Fixture ID
 */
export async function getFixtureEvents(fixtureId: string) {
  return apiFetch(`/games/${fixtureId}/events`);
}

/**
 * Get fixture lineups
 * @param fixtureId - Fixture ID
 */
export async function getFixtureLineups(fixtureId: string) {
  return apiFetch(`/games/${fixtureId}/lineups`);
}

/**
 * Search teams by name
 * @param name - Team name to search
 */
export async function searchTeams(name: string) {
  return apiFetch('/teams/search', { name });
}

/**
 * Helper function to map league codes to SportsAPIPro competition IDs
 */
function mapLeagueIdToCompetitionId(leagueId: string): number {
  const leagueCodeMap: Record<string, number> = {
    'PL': SPORTSAPIPRO_COMPETITION_IDS.PREMIER_LEAGUE,
    'LA': SPORTSAPIPRO_COMPETITION_IDS.LA_LIGA,
    'BL1': SPORTSAPIPRO_COMPETITION_IDS.BUNDESLIGA,
    'SA': SPORTSAPIPRO_COMPETITION_IDS.SERIE_A,
    'FL1': SPORTSAPIPRO_COMPETITION_IDS.LIGUE_1,
    'CL': SPORTSAPIPRO_COMPETITION_IDS.CHAMPIONS_LEAGUE,
    'premier-league': SPORTSAPIPRO_COMPETITION_IDS.PREMIER_LEAGUE,
    'la-liga': SPORTSAPIPRO_COMPETITION_IDS.LA_LIGA,
    'bundesliga': SPORTSAPIPRO_COMPETITION_IDS.BUNDESLIGA,
    'serie-a': SPORTSAPIPRO_COMPETITION_IDS.SERIE_A,
    'ligue-1': SPORTSAPIPRO_COMPETITION_IDS.LIGUE_1,
    'champions-league': SPORTSAPIPRO_COMPETITION_IDS.CHAMPIONS_LEAGUE,
  };
  
  return leagueCodeMap[leagueId] || SPORTSAPIPRO_COMPETITION_IDS.PREMIER_LEAGUE;
}

// Keep the league code constants for consistency
export const LEAGUE_IDS = {
  PREMIER_LEAGUE: 'PL',
  LA_LIGA: 'LA',
  BUNDESLIGA: 'BL1',
  SERIE_A: 'SA',
  LIGUE_1: 'FL1',
  CHAMPIONS_LEAGUE: 'CL',
};

export const LEAGUE_ID_MAP: Record<string, string> = {
  'premier-league': LEAGUE_IDS.PREMIER_LEAGUE,
  'la-liga': LEAGUE_IDS.LA_LIGA,
  'bundesliga': LEAGUE_IDS.BUNDESLIGA,
  'serie-a': LEAGUE_IDS.SERIE_A,
  'ligue-1': LEAGUE_IDS.LIGUE_1,
  'champions-league': LEAGUE_IDS.CHAMPIONS_LEAGUE,
};

export const ALLOWED_LEAGUE_IDS = Object.values(LEAGUE_IDS);

export default {
  getLiveMatches,
  getLiveMatchById,
  getFixturesByDate,
  getFixturesByLeague,
  getFixtureById,
  getStandings,
  getCompetitionTeams,
  getTeamById,
  getLeagueById,
  getPlayerById,
  getPlayersByTeam,
  getLeagues,
  getHeadToHead,
  getFixtureStatistics,
  getFixtureEvents,
  getFixtureLineups,
  searchTeams,
  LEAGUE_IDS,
  LEAGUE_ID_MAP,
};

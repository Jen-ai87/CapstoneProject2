/**
 * Data Helpers
 * Provides utility functions to access teams and leagues from both static data and API cache
 */

import { Team, League } from './types';
import { teams as staticTeams } from './teams';
import { leagues as staticLeagues } from './leagues';

// Constants
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
const TEAMS_CACHE_KEY = 'api_teams_cache';
const TEAMS_CACHE_TS_KEY = 'api_teams_cache_timestamp';

// Global cache for API-fetched data (persisted to localStorage)
let apiTeamsCache: Team[] = [];
let apiLeaguesCache: League[] = [];

/**
 * Initialize cache from localStorage on app start
 */
function initializeCacheFromStorage() {
  try {
    const stored = localStorage.getItem(TEAMS_CACHE_KEY);
    const timestamp = localStorage.getItem(TEAMS_CACHE_TS_KEY);
    
    if (stored && timestamp) {
      const now = Date.now();
      const cacheAge = now - parseInt(timestamp, 10);
      
      // Only use cache if it's not expired
      if (cacheAge < CACHE_TTL) {
        apiTeamsCache = JSON.parse(stored);
      } else {
        // Cache expired, clear it
        localStorage.removeItem(TEAMS_CACHE_KEY);
        localStorage.removeItem(TEAMS_CACHE_TS_KEY);
      }
    }
  } catch (err) {
    // Silent fail on parse errors
    localStorage.removeItem(TEAMS_CACHE_KEY);
    localStorage.removeItem(TEAMS_CACHE_TS_KEY);
  }
}

/**
 * Save cache to localStorage
 */
function persistCacheToStorage() {
  try {
    localStorage.setItem(TEAMS_CACHE_KEY, JSON.stringify(apiTeamsCache));
    localStorage.setItem(TEAMS_CACHE_TS_KEY, Date.now().toString());
  } catch (err) {
    // Silent fail if localStorage is full or unavailable
  }
}

// Initialize cache on module load
initializeCacheFromStorage();

/**
 * Update the API team cache
 */
export function updateTeamsCache(teams: Team[]) {
  apiTeamsCache = teams;
  persistCacheToStorage();
}

/**
 * Add teams to the API team cache
 */
export function addTeamsToCache(teams: Team[]) {
  let hasChanges = false;
  
  teams.forEach(team => {
    // Don't add duplicates
    if (!apiTeamsCache.find(t => t.id === team.id)) {
      apiTeamsCache.push(team);
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    persistCacheToStorage();
  }
}

/**
 * Create a team object from API data
 * @param apiTeamId - The api_id from BSD API (for logos)
 * @param internalTeamId - The internal id from BSD API (for API queries)
 * @param apiTeamName - Team name
 * @param leagueId - League ID
 */
export function createTeamFromAPI(apiTeamId: number, apiTeamName: string, leagueId: string, internalTeamId?: number): Team {
  // Normalize team name for matching - strip common prefixes and special characters
  const normalizeTeamName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/^(fc|cf|as|ss|ud|cd|sd|rb)\s+/i, '') // Remove team type prefixes
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };
  
  const normalizedApiName = normalizeTeamName(apiTeamName);
  
  // First try to find the team by name in the static database
  const staticTeam = staticTeams.find(t => {
    const normalizedStaticName = normalizeTeamName(t.name);
    
    // Exact match
    if (normalizedStaticName === normalizedApiName) return true;
    
    // Substring match (especially for longer team names)
    if (normalizedApiName.includes(normalizedStaticName) || normalizedStaticName.includes(normalizedApiName)) return true;
    
    // Check abbreviation match
    if (t.abbreviation && t.abbreviation.toLowerCase() === apiTeamName.substring(0, 3).toLowerCase()) return true;
    
    return false;
  });
  
  // If found in static database, use it but update the cache IDs
  // IMPORTANT: Keep the team's actual league (not the competition like Champions League)
  if (staticTeam) {
    return {
      ...staticTeam,
      // Do NOT override leagueId - use the team's actual league (e.g., 'la-liga', 'bundesliga')
      // Champions League is a competition, not a league, so teams keep their home league
      bsdTeamId: internalTeamId || apiTeamId,
      bsdApiId: apiTeamId,
    };
  }
  
  // Fallback to creating a team with BSD logo URL
  const bsdToken = import.meta.env.VITE_BSD_API_KEY;
  const logoUrl = bsdToken
    ? `https://sports.bzzoiro.com/img/team/${apiTeamId}/?token=${bsdToken}`
    : '';
  
  return {
    id: `api-team-${internalTeamId || apiTeamId}`,
    name: apiTeamName,
    abbreviation: apiTeamName.substring(0, 3).toUpperCase(),
    leagueId,
    logo: logoUrl,
    city: 'Unknown',
    bsdTeamId: internalTeamId || apiTeamId, // Store internal ID for API queries
    bsdApiId: apiTeamId, // Store api_id for logo URLs
  };
}

/**
 * Fetch and cache team from API if not already in database
 */
export function fetchAndCacheTeamIfNeeded(apiTeamId: number, apiTeamName: string, leagueId: string, internalTeamId?: number): Team {
  // Check if already in cache
  const cacheKey = `api-team-${internalTeamId || apiTeamId}`;
  const existingTeam = apiTeamsCache.find(t => t.id === cacheKey);
  if (existingTeam) return existingTeam;
  
  // Create team object from API data
  const team = createTeamFromAPI(apiTeamId, apiTeamName, leagueId, internalTeamId);
  
  // Add to cache and persist to localStorage
  apiTeamsCache.push(team);
  persistCacheToStorage();
  
  return team;
}

/**
 * Update the API league cache
 */
export function updateLeaguesCache(leagues: League[]) {
  apiLeaguesCache = leagues;
}

/**
 * Get team by ID from both static and cached data
 */
export function getTeamById(teamId: string): Team | undefined {
  // Try API cache first
  const apiTeam = apiTeamsCache.find(t => t.id === teamId);
  if (apiTeam) return apiTeam;
  
  // Fallback to static data
  return staticTeams.find(t => t.id === teamId);
}

/**
 * Get league by ID from both static and cached data
 */
export function getLeagueById(leagueId: string): League | undefined {
  // Try API cache first
  const apiLeague = apiLeaguesCache.find(l => l.id === leagueId);
  if (apiLeague) return apiLeague;
  
  // Fallback to static data
  return staticLeagues.find(l => l.id === leagueId);
}

/**
 * Get all teams
 */
export function getAllTeams(): Team[] {
  // Merge and deduplicate
  const allTeams = [...apiTeamsCache, ...staticTeams];
  const uniqueTeams = allTeams.filter((team, index, self) =>
    index === self.findIndex(t => t.id === team.id)
  );
  return uniqueTeams;
}

/**
 * Get all leagues
 */
export function getAllLeagues(): League[] {
  // Merge and deduplicate
  const allLeagues = [...apiLeaguesCache, ...staticLeagues];
  const uniqueLeagues = allLeagues.filter((league, index, self) =>
    index === self.findIndex(l => l.id === league.id)
  );
  return uniqueLeagues;
}

/**
 * Map BSD competition codes to local league IDs.
 */
export function mapCompetitionCodeToLeagueId(code: string, fallback?: string): string {
  const mapping: Record<string, string> = {
    PL: 'premier-league',
    LA: 'la-liga',
    BL1: 'bundesliga',
    SA: 'serie-a',
    FL1: 'ligue-1',
    PD: 'la-liga',
    PPL: 'liga-portugal',
    DED: 'eredivisie',
    ED: 'eredivisie',
    CL: 'champions-league',
    EL: 'europa-league',
    ECL: 'europa-conference-league',
    WC: 'world-cup',
    EC: 'european-championship',
    BR: 'brasileirao',
    CH: 'championship',
    MLS: 'mls',
    LMX: 'liga-mx',
  };

  return mapping[code] || fallback || code.toLowerCase();
}

/**
 * Football API Service
 * Handles all communication with football API providers via local proxy
 * Supports multiple providers: sportsapipro.com or bsd (Bzzoiro Sports Data)
 */

import * as sportsApiPro from './providers/sportsApiPro';
import * as bsdProvider from './providers/bsd';
import { deduplicateRequest } from './requestDedup';

// Determine which provider to use based on environment
const API_PROVIDER = import.meta.env.VITE_API_PROVIDER || 'bsd';
const activeProvider = API_PROVIDER === 'sportsapipro' ? sportsApiPro : bsdProvider;

// Deduplicated API functions (prevent duplicate simultaneous requests)
export const getFixturesByDate = (date: string) =>
  deduplicateRequest(
    `/fixtures/${date}`,
    () => activeProvider.getFixturesByDate(date),
    { date }
  );

export const getFixturesByLeague = (leagueId: string, season: string = '2024') =>
  deduplicateRequest(
    `/league/${leagueId}/${season}`,
    () => activeProvider.getFixturesByLeague(leagueId, season),
    { leagueId, season }
  );

export const getStandings = (leagueId: string, season: string = '2024') =>
  deduplicateRequest(
    `/standings/${leagueId}/${season}`,
    () => activeProvider.getStandings(leagueId, season),
    { leagueId, season }
  );

// Direct exports for non-deduplicated functions (single requests)
export const getLiveMatches = activeProvider.getLiveMatches;
export const getLiveMatchById = activeProvider.getLiveMatchById;
export const getFixtureById = activeProvider.getFixtureById;
export const getCompetitionTeams = activeProvider.getCompetitionTeams;
export const getTeamById = activeProvider.getTeamById;
export const getLeagueById = activeProvider.getLeagueById;
export const getPlayerById = activeProvider.getPlayerById;
export const getPlayersByTeam = activeProvider.getPlayersByTeam;
export const getLeagues = activeProvider.getLeagues;
export const getHeadToHead = activeProvider.getHeadToHead;
export const getFixtureStatistics = activeProvider.getFixtureStatistics;
export const getFixtureEvents = activeProvider.getFixtureEvents;
export const getFixtureLineups = activeProvider.getFixtureLineups;
export const searchTeams = activeProvider.searchTeams;
export const getPredictionByMatchId = (activeProvider as any).getPredictionByMatchId;
export const getPredictionsByDate = (activeProvider as any).getPredictionsByDate;
export const extractOddsFromEvent = (activeProvider as any).extractOddsFromEvent;
export const formatPredictionsForDisplay = (activeProvider as any).formatPredictionsForDisplay;
export const getPlayerProfile = (activeProvider as any).getPlayerProfile;

export const LEAGUE_IDS = activeProvider.LEAGUE_IDS;
export const LEAGUE_ID_MAP = activeProvider.LEAGUE_ID_MAP;
export const ALLOWED_LEAGUE_IDS = activeProvider.ALLOWED_LEAGUE_IDS;

// Export request deduplication utilities
export { deduplicateRequest, clearCachedRequest, clearAllCachedRequests, getInflightRequestCount } from './requestDedup';

// Export provider selection for testing
export const getActiveProvider = () => API_PROVIDER;

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
  getPredictionByMatchId,
  getPredictionsByDate,
  extractOddsFromEvent,
  formatPredictionsForDisplay,
  getPlayerProfile,
  LEAGUE_IDS,
  LEAGUE_ID_MAP,
  ALLOWED_LEAGUE_IDS,
  getActiveProvider,
};


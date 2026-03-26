/**
 * API Data Mappers
 * Transforms API responses to app data types
 */

import {
  Match,
  MatchEvent,
  MatchEventType,
  MatchStatistics,
  StandingRow,
  LeagueStanding,
  Team,
  League,
} from '../data/types';
import { teams as localTeams } from '../data/teams';

// Create a map of API team names to local team IDs for quick lookup
const apiTeamNameToLocalIdMap: Record<string, Record<string, string>> = {};

// Build the mapping on first import
localTeams.forEach((team) => {
  const leagueId = team.leagueId || '';
  if (!apiTeamNameToLocalIdMap[leagueId]) {
    apiTeamNameToLocalIdMap[leagueId] = {};
  }

  apiTeamNameToLocalIdMap[leagueId][team.name.toLowerCase()] = team.id;

  if (team.name === 'Manchester United') {
    apiTeamNameToLocalIdMap[leagueId]['man utd'] = team.id;
  } else if (team.name === 'Manchester City') {
    apiTeamNameToLocalIdMap[leagueId]['man city'] = team.id;
  } else if (team.name === 'Tottenham') {
    apiTeamNameToLocalIdMap[leagueId]['tottenham'] = team.id;
    apiTeamNameToLocalIdMap[leagueId]['spurs'] = team.id;
  }
});

function mapApiTeamToLocalTeamId(apiTeamName: string, apiTeamId: number, leagueId: string): string {
  const leagueMap = apiTeamNameToLocalIdMap[leagueId];
  
  // Try exact match in map first
  if (leagueMap && leagueMap[apiTeamName.toLowerCase()]) {
    return leagueMap[apiTeamName.toLowerCase()];
  }

  // Try fuzzy matching in map
  const normalizedName = apiTeamName.toLowerCase();
  for (const [key, value] of Object.entries(leagueMap || {})) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return value;
    }
  }

  // If not found in map, try direct matching against local teams
  const normalizeTeamName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/^(fc|cf|as|ss|ud|cd|sd|rb)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const normalizedApiName = normalizeTeamName(apiTeamName);
  
  // First try to match within the same league (for regular season matches)
  const matchedTeamSameLeague = localTeams.find(t => {
    if (t.leagueId !== leagueId) return false;
    
    const normalizedLocalName = normalizeTeamName(t.name);
    
    // Exact match
    if (normalizedLocalName === normalizedApiName) return true;
    
    // Substring match
    if (normalizedApiName.includes(normalizedLocalName) || normalizedLocalName.includes(normalizedApiName)) return true;
    
    // Abbreviation check
    if (t.abbreviation && t.abbreviation.toLowerCase() === apiTeamName.substring(0, 3).toLowerCase()) return true;
    
    return false;
  });

  if (matchedTeamSameLeague) {
    return matchedTeamSameLeague.id;
  }

  // If no match in same league, search across ALL leagues (for cup/European competitions)
  const matchedTeamAnyLeague = localTeams.find(t => {
    const normalizedLocalName = normalizeTeamName(t.name);
    
    // Exact match
    if (normalizedLocalName === normalizedApiName) return true;
    
    // Substring match
    if (normalizedApiName.includes(normalizedLocalName) || normalizedLocalName.includes(normalizedApiName)) return true;
    
    // Abbreviation check
    if (t.abbreviation && t.abbreviation.toLowerCase() === apiTeamName.substring(0, 3).toLowerCase()) return true;
    
    return false;
  });

  if (matchedTeamAnyLeague) {
    return matchedTeamAnyLeague.id;
  }

  // Fallback to creating a slug
  const slug = apiTeamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `${slug}-${apiTeamId}`;
}

// API Response Types (normalized)
export interface ApiStanding {
  position: number;
  positionText: string;
  team: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest?: string;
  };
  playedGames: number;
  form?: string;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface ApiStandingsResponse {
  filters: Record<string, any>;
  competition: {
    id: number;
    name: string;
    code: string;
    type: string;
    emblem?: string;
  };
  season: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday?: number;
  };
  standings: Array<{
    stage?: string;
    type: string;
    group?: string | null;
    table: ApiStanding[];
  }>;
}

export interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
  minute?: number;
  injuryTime?: number;
  attendance?: number;
  venue?: string;
  competition?: {
    id: number;
    name: string;
    code: string;
  };
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest?: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest?: string;
  };
  score: {
    winner?: string | null;
    duration: string;
    fullTime: {
      home: number | null;
      away: number | null;
    };
    halfTime: {
      home: number | null;
      away: number | null;
    };
  };
  goals?: Array<{
    minute: number;
    injuryTime?: number;
    type: string;
    team: {
      id: number;
      name: string;
    };
    scorer: {
      id: number;
      name: string;
    };
    assist?: {
      id: number;
      name: string;
    };
  }>;
  referees?: Array<{
    id: number;
    name: string;
    type: string;
  }>;
}

export interface ApiMatchesResponse {
  filters: Record<string, any>;
  resultSet?: {
    count: number;
    first: string;
    last: string;
  };
  competition?: {
    id: number;
    name: string;
    code: string;
  };
  matches: ApiMatch[];
}

// Legacy fixture/event/stats shapes used by MatchDetailPage
export interface ApiFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    periods: {
      first: number | null;
      second: number | null;
    };
    venue: {
      id: number | null;
      name: string;
      city: string;
    };
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string | null;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: {
      home: number | null;
      away: number | null;
    };
    fulltime: {
      home: number | null;
      away: number | null;
    };
    extratime: {
      home: number | null;
      away: number | null;
    };
    penalty: {
      home: number | null;
      away: number | null;
    };
  };
}

export interface ApiEvent {
  time: {
    elapsed: number;
    extra?: number | null;
  };
  team: {
    id: number;
    name: string;
  };
  player: {
    id: number;
    name: string;
  };
  type: string;
  detail: string;
}

export interface ApiStatistic {
  team: {
    id: number;
    name: string;
    logo?: string;
  };
  statistics: Array<{
    type: string;
    value: number | string | null;
  }>;
}

// Standings mappers
export function mapApiStandingToRow(standing: ApiStanding, leagueId: string): StandingRow {
  const teamId = mapApiTeamToLocalTeamId(standing.team.name, standing.team.id, leagueId);

  let zone: 'champions-league' | 'europa-league' | 'relegation' | null = null;
  if (standing.position <= 4) {
    zone = 'champions-league';
  } else if (standing.position === 5) {
    zone = 'europa-league';
  } else if (standing.position > 18) {
    zone = 'relegation';
  }

  return {
    position: standing.position,
    teamId,
    apiTeamId: standing.team.id,
    apiTeamName: standing.team.name,
    played: standing.playedGames,
    won: standing.won,
    drawn: standing.draw,
    lost: standing.lost,
    goalsFor: standing.goalsFor,
    goalsAgainst: standing.goalsAgainst,
    goalDifference: standing.goalDifference,
    points: standing.points,
    zone,
  };
}

export function mapApiStandingsToLeagueStanding(
  response: ApiStandingsResponse,
  leagueId: string
): LeagueStanding {
  const table = response.standings[0]?.table || [];
  const rows = table.map((standing) => mapApiStandingToRow(standing, leagueId));

  return {
    leagueId,
    rows,
  };
}

/**
 * Map SportsAPIPro standings response to app format
 * SportsAPIPro has a different response structure than football-data.org
 */
export function mapSportsAPIProStandingsToLeagueStanding(
  response: any,
  leagueId: string
): LeagueStanding {
  // SportsAPIPro returns standings array with rows
  const standingsData = response.standings?.[0];
  if (!standingsData || !standingsData.rows) {
    return { leagueId, rows: [] };
  }

  const rows = standingsData.rows.map((row: any) =>
    mapSportsAPIProStandingToRow(row, leagueId)
  );

  return {
    leagueId,
    rows,
  };
}

/**
 * Map individual SportsAPIPro standing row to app StandingRow format
 */
function mapSportsAPIProStandingToRow(row: any, leagueId: string): StandingRow {
  const competitor = row.competitor || {};
  const teamId = mapApiTeamToLocalTeamId(
    competitor.name || '',
    competitor.id || 0,
    leagueId
  );

  // Determine zone based on position and destinationNum
  let zone: 'champions-league' | 'europa-league' | 'relegation' | null = null;
  if (row.destinationNum === 1) {
    zone = 'champions-league'; // Usually Round of 16, Champions qualifiers, etc.
  } else if (row.destinationNum === 2) {
    zone = 'europa-league'; // Usually playoffs, Europa qualifiers, etc.
  } else if (row.position > 18) {
    zone = 'relegation';
  }

  return {
    position: row.position || 0,
    teamId,
    apiTeamId: competitor.id || 0,
    apiTeamName: competitor.name || 'Unknown',
    played: row.gamePlayed || 0,
    won: row.gamesWon || 0,
    drawn: row.gamesEven || 0,
    lost: row.gamesLost || 0,
    goalsFor: row.for || 0,
    goalsAgainst: row.against || 0,
    goalDifference: row.ratio || 0,
    points: row.points || 0,
    zone,
  };
}

function mapApiStatus(status: string): 'live' | 'finished' | 'upcoming' {
  const normalized = status.toUpperCase();
  if (['LIVE', 'IN_PLAY', 'HT'].includes(normalized)) return 'live';
  if (['FINISHED', 'STATUS_FINISHED'].includes(normalized)) return 'finished';
  if (['SCHEDULED', 'TIMED', 'POSTPONED', 'SUSPENDED', 'CANCELLED'].includes(normalized)) return 'upcoming';
  return 'upcoming';
}

function extractKickoffTime(utcDate: string): string | null {
  if (!utcDate) return null;
  const date = new Date(utcDate);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function mapApiMatchToMatch(match: ApiMatch, leagueId: string): Match {
  const status = mapApiStatus(match.status);
  const isUpcoming = status === 'upcoming';

  const homeTeamId = mapApiTeamToLocalTeamId(match.homeTeam.name, match.homeTeam.id, leagueId);
  const awayTeamId = mapApiTeamToLocalTeamId(match.awayTeam.name, match.awayTeam.id, leagueId);

  let minute: string | null = null;
  if (!isUpcoming) {
    if (match.status === 'FINISHED') {
      minute = 'FT';
    } else if (match.status === 'HT') {
      minute = 'HT';
    } else if (match.minute) {
      // Remove apostrophe for live minutes
      minute = String(match.minute).replace(/['"]/g, '');
    }
  }

  let kickoff: string | null = null;
  if (isUpcoming) {
    kickoff = extractKickoffTime(match.utcDate);
  }

  return {
    id: `match-${match.id}`,
    leagueId,
    homeTeam: {
      teamId: homeTeamId,
      apiTeamId: match.homeTeam.id,
      bsdInternalId: (match.homeTeam as any).internalId,
      bsdApiId: (match.homeTeam as any).apiId,
      name: match.homeTeam.name,
      crest: match.homeTeam.crest,
      score: match.score.fullTime.home || 0,
    },
    awayTeam: {
      teamId: awayTeamId,
      apiTeamId: match.awayTeam.id,
      bsdInternalId: (match.awayTeam as any).internalId,
      bsdApiId: (match.awayTeam as any).apiId,
      name: match.awayTeam.name,
      crest: match.awayTeam.crest,
      score: match.score.fullTime.away || 0,
    },
    status,
    minute,
    kickoff,
    venue: match.venue || 'Unknown Venue',
  };
}

// Legacy API-Football helpers (used by MatchDetailPage)
function mapFixtureStatus(status: string): 'live' | 'finished' | 'upcoming' {
  if (['FT', 'AET', 'PEN'].includes(status)) return 'finished';
  if (['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(status)) return 'live';
  return 'upcoming';
}

function formatMatchMinute(status: string, minute: number | null): string | null {
  if (!minute) return null;
  if (status === 'HT') return 'HT';
  if (status === 'FT') return 'FT';
  return `${minute}'`;
}

function formatKickoffTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

function generateLeagueId(leagueId: number, leagueName: string): string {
  const slug = leagueName.toLowerCase().replace(/\s+/g, '-');
  return `${slug}-${leagueId}`;
}

export function mapApiFixtureToMatch(apiFixture: ApiFixture): Match {
  const status = mapFixtureStatus(apiFixture.fixture.status.short);
  const isUpcoming = status === 'upcoming';
  const leagueId = generateLeagueId(apiFixture.league.id, apiFixture.league.name);

  return {
    id: `fixture-${apiFixture.fixture.id}`,
    leagueId,
    homeTeam: {
      teamId: mapApiTeamToLocalTeamId(apiFixture.teams.home.name, apiFixture.teams.home.id, leagueId),
      score: apiFixture.goals.home,
    },
    awayTeam: {
      teamId: mapApiTeamToLocalTeamId(apiFixture.teams.away.name, apiFixture.teams.away.id, leagueId),
      score: apiFixture.goals.away,
    },
    status,
    minute: isUpcoming ? null : formatMatchMinute(apiFixture.fixture.status.short, apiFixture.fixture.status.elapsed),
    kickoff: isUpcoming ? formatKickoffTime(apiFixture.fixture.timestamp) : null,
    venue: apiFixture.fixture.venue.name || 'Unknown Venue',
  };
}

export function mapApiTeamToTeam(apiTeam: { id: number; name: string; logo: string }, leagueId: string): Team {
  const words = apiTeam.name.split(' ');
  const abbreviation = words.length > 1
    ? words.map((w) => w[0]).join('').substring(0, 3).toUpperCase()
    : apiTeam.name.substring(0, 3).toUpperCase();

  return {
    id: mapApiTeamToLocalTeamId(apiTeam.name, apiTeam.id, leagueId),
    name: apiTeam.name,
    abbreviation,
    leagueId,
    logo: apiTeam.logo,
  };
}

export function mapApiLeagueToLeague(apiLeague: { id: number; name: string; logo: string; country: string; flag?: string | null }): League {
  const words = apiLeague.name.split(' ');
  const shortName = words.length > 1
    ? words.map((w) => w[0]).join('').toUpperCase()
    : apiLeague.name.substring(0, 2).toUpperCase();

  return {
    id: generateLeagueId(apiLeague.id, apiLeague.name),
    name: apiLeague.name,
    shortName,
    logo: apiLeague.logo,
    country: apiLeague.country,
    flag: apiLeague.flag || undefined,
  };
}

export function mapApiEventToMatchEvent(apiEvent: ApiEvent, homeTeamId: number): MatchEvent {
  const minute = apiEvent.time.extra
    ? `${apiEvent.time.elapsed}+${apiEvent.time.extra}'`
    : `${apiEvent.time.elapsed}'`;

  return {
    id: `event-${apiEvent.time.elapsed}-${apiEvent.player.id}`,
    minute,
    type: mapEventType(apiEvent.type, apiEvent.detail),
    playerName: apiEvent.player.name,
    side: apiEvent.team.id === homeTeamId ? 'home' : 'away',
  };
}

function mapEventType(apiType: string, apiDetail: string): MatchEventType {
  const type = apiType.toLowerCase();
  const detail = apiDetail.toLowerCase();

  if (type === 'goal' || detail.includes('goal')) return 'goal';
  if (type === 'card' && detail.includes('yellow')) return 'yellow-card';
  if (type === 'card' && detail.includes('red')) return 'red-card';
  if (type === 'subst') return 'substitution';

  return 'substitution';
}

export function mapApiStatisticsToMatchStatistics(
  homeStats: ApiStatistic,
  awayStats: ApiStatistic
): MatchStatistics {
  const getStatValue = (stats: ApiStatistic, type: string): number => {
    const stat = stats.statistics.find((s) => s.type === type);
    if (!stat) return 0;

    if (typeof stat.value === 'string' && stat.value.includes('%')) {
      return parseInt(stat.value.replace('%', ''), 10);
    }

    return (stat.value as number) || 0;
  };

  return {
    possession: [
      getStatValue(homeStats, 'Ball Possession'),
      getStatValue(awayStats, 'Ball Possession'),
    ],
    shotsOnTarget: [
      getStatValue(homeStats, 'Shots on Goal'),
      getStatValue(awayStats, 'Shots on Goal'),
    ],
    shots: [
      getStatValue(homeStats, 'Total Shots'),
      getStatValue(awayStats, 'Total Shots'),
    ],
    corners: [
      getStatValue(homeStats, 'Corner Kicks'),
      getStatValue(awayStats, 'Corner Kicks'),
    ],
    fouls: [
      getStatValue(homeStats, 'Fouls'),
      getStatValue(awayStats, 'Fouls'),
    ],
  };
}

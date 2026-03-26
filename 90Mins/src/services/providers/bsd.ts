/**
 * Football API Service - BSD Provider (Bzzoiro Sports Data)
 * Handles all communication with sports.bzzoiro.com/api
 * Free API with unlimited requests, no rate limits
 */

// Use local proxy for dev, direct API for production
const isDev = import.meta.env.DEV;
const BASE_URL = isDev ? '/api' : 'https://sports.bzzoiro.com/api';
const API_KEY = import.meta.env.VITE_BSD_API_KEY;

// Verify token is loaded correctly (should be 45 characters)
if (!API_KEY) {
  console.error('❌ BSD API Key not found in environment variables!');
}

/**
 * Base fetch function with BSD API authentication
 */
async function apiFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const headers: Record<string, string> = {};
  if (API_KEY) {
    headers['Authorization'] = `Token ${API_KEY}`;
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API Error ${response.status}:`, errorText);
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data: T = await response.json();

  return data;
}

/**
 * Transform BSD event response to app-friendly format
 * for compatibility with the rest of the app
 */
function transformBSDEventResponse(bsdData: any): any {
  const results = Array.isArray(bsdData?.results)
    ? bsdData.results
    : Array.isArray(bsdData?.data)
      ? bsdData.data
      : Array.isArray(bsdData?.events)
        ? bsdData.events
        : Array.isArray(bsdData?.matches)
          ? bsdData.matches
          : [];

  if (results.length === 0) {
    return { matches: [] };
  }

  const token = import.meta.env.VITE_BSD_API_KEY;

  // Map BSD league ID to a code for compatibility
  const leagueCodeMap: Record<string, string> = {
    '1': 'PL',   // Premier League
    '2': 'PPL',  // Liga Portugal
    '3': 'LA',   // La Liga
    '4': 'SA',   // Serie A
    '5': 'BL1',  // Bundesliga
    '6': 'FL1',  // Ligue 1
    '7': 'CL',   // Champions League
    '8': 'EL',   // Europa League
    '9': 'BR',   // Brasileirão
    '10': 'ED',  // Eredivisie
    '12': 'CH',  // Championship (England)
    '18': 'MLS', // MLS
    '19': 'LMX', // Liga MX Apertura
    '20': 'LMX', // Liga MX Clausura
  };

  const leagueNameMap: Record<string, string> = {
    'premier league': 'PL',
    'la liga': 'LA',
    'serie a': 'SA',
    'bundesliga': 'BL1',
    'ligue 1': 'FL1',
    'champions league': 'CL',
    'europa league': 'EL',
    'eredivisie': 'ED',
    'liga portugal': 'PPL',
    'primeira liga': 'PPL',
    'brasileirao': 'BR',
    'championship': 'CH',
    'mls': 'MLS',
    'liga mx': 'LMX',
  };

  const matches = results.map((event: any) => {
    const leagueIdKey = event.league?.id?.toString();
    const leagueNameKey = (event.league?.name || '').toString().toLowerCase();
    const leagueCode = leagueCodeMap[leagueIdKey || ''] || leagueNameMap[leagueNameKey] || 'INT';

    const getTeamName = (teamName: string | null | undefined) =>
      teamName || 'Unknown';
    const getTeamTla = (teamName: string | null | undefined) =>
      getTeamName(teamName).substring(0, 3).toUpperCase();

    // Generate BSD logo URLs using full token query parameter
    const getTeamLogoUrl = (apiTeamId: number | null | undefined, teamName: string) => {
      if (!apiTeamId || !token) {
        return null;
      }
      const fullToken = import.meta.env.VITE_BSD_API_KEY || token;
      return `https://sports.bzzoiro.com/img/team/${apiTeamId}/?token=${fullToken}`;
    };

    const getLeagueLogoUrl = (apiLeagueId: number | null | undefined) => {
      if (!apiLeagueId || !token) return null;
      const fullToken = import.meta.env.VITE_BSD_API_KEY || token;
      return `https://sports.bzzoiro.com/img/league/${apiLeagueId}/?token=${fullToken}`;
    };

    const venueName =
      event.venue?.name ||
      event.venue_name ||
      event.stadium?.name ||
      event.stadium_name ||
      event.stadium ||
      event.venue ||
      event.location ||
      (event.home_team ? `${event.home_team} Stadium` : '');

    const homeName = getTeamName(event.home_team);
    const awayName = getTeamName(event.away_team);

    const normalizedStatus = (event.status || '').toString().toLowerCase();
    const liveTokens = [
      'live',
      'inprogress',
      'in_play',
      '1h',
      '2h',
      '1st_half',
      '2nd_half',
      'first_half',
      'second_half',
      '1t',
      '2t',
    ];
    
    // Check if it's halftime specifically
    const rawMinute = event.current_minute ?? event.minute;
    const isHalftime = normalizedStatus === 'ht' || 
                       normalizedStatus === 'halftime' || 
                       normalizedStatus === 'half time' ||
                       (typeof rawMinute === 'string' && rawMinute.toUpperCase().trim() === 'HT');
    
    const mappedStatus = normalizedStatus.includes('finish') || normalizedStatus === 'ft'
      ? 'FINISHED'
      : isHalftime
        ? 'HT'
        : liveTokens.some((token) => normalizedStatus.includes(token))
          ? 'IN_PLAY'
          : 'SCHEDULED';

    // Handle minute value - keep as number for API compatibility
    let minuteValue: number | null = null;
    if (!isHalftime) {
      if (typeof rawMinute === 'number') {
        minuteValue = rawMinute;
      } else if (typeof rawMinute === 'string') {
        const parsed = parseInt(rawMinute, 10);
        if (!Number.isNaN(parsed)) {
          minuteValue = parsed;
        }
      }
    }

    return {
      id: event.id,
      utcDate: event.event_date,
      venue: venueName || 'Unknown Venue',
      status: mappedStatus,
      minute: minuteValue,
      injuryTime: typeof event.injury_time === 'number' ? event.injury_time : null,
      stage: 'REGULAR_SEASON',
      group: null,
      lastUpdated: new Date().toISOString(),
      homeTeam: {
        id: event.home_team_obj?.api_id || event.home_team_obj?.id || null,
        internalId: event.home_team_obj?.id, // BSD internal ID
        apiId: event.home_team_obj?.api_id,  // BSD external ID for logo
        name: homeName,
        shortName: homeName,
        tla: getTeamTla(homeName),
        crest: getTeamLogoUrl(event.home_team_obj?.api_id, homeName),
      },
      awayTeam: {
        id: event.away_team_obj?.api_id || event.away_team_obj?.id || null,
        internalId: event.away_team_obj?.id, // BSD internal ID
        apiId: event.away_team_obj?.api_id,  // BSD external ID for logo  
        name: awayName,
        shortName: awayName,
        tla: getTeamTla(awayName),
        crest: getTeamLogoUrl(event.away_team_obj?.api_id, awayName),
      },
      score: {
        winner: event.home_score !== null && event.away_score !== null 
          ? event.home_score > event.away_score ? 'HOME' : event.away_score > event.home_score ? 'AWAY' : 'DRAW'
          : null,
        duration: 'FULL_TIME',
        fullTime: {
          home: event.home_score,
          away: event.away_score,
        },
        halfTime: {
          home: null,
          away: null,
        },
        currentMatchDay: 1,
      },
      odds: null,
      competition: {
        id: event.league?.id,
        name: event.league?.name || 'Unknown',
        code: leagueCode,
        type: 'LEAGUE',
        emblem: getLeagueLogoUrl(event.league?.api_id),
      },
      season: {
        id: event.league?.season_id,
        startDate: '2025-08-01',
        endDate: '2026-05-31',
        currentMatchDay: 1,
        available: true,
      },
      referees: [],
    };
  });

  return {
    matches,
    filters: {},
    resultSet: {
      count: results.length || 0,
      competition: results?.[0]?.league?.code || null,
      season: results?.[0]?.league?.season_id || null,
    },
  };
}

/**
 * Get live matches
 */
export async function getLiveMatches() {
  const response = await apiFetch<any>('/live/');
  return transformBSDEventResponse(response);
}

/**
 * Get live match details by ID
 * @param matchId - Match ID
 */
export async function getLiveMatchById(matchId: string) {
  return apiFetch(`/live/${matchId}/`);
}

/**
 * Get fixtures by date
 * @param date - Date in format YYYY-MM-DD
 */
export async function getFixturesByDate(date: string) {
  const response = await apiFetch<any>('/events/', {
    date_from: date,
    date_to: date,
  });
  
  // Filter results to only include matches from the requested date (local date comparison)
  const filteredResponse = {
    ...response,
    results: (response.results || []).filter((event: any) => {
      const eventDate = new Date(event.event_date);
      const eventYear = eventDate.getFullYear();
      const eventMonth = String(eventDate.getMonth() + 1).padStart(2, '0');
      const eventDay = String(eventDate.getDate()).padStart(2, '0');
      const eventDateStr = `${eventYear}-${eventMonth}-${eventDay}`;
      const matches = eventDateStr === date;
      return matches;
    })
  };
  
  return transformBSDEventResponse(filteredResponse);
}

/**
 * Get fixtures by league and season
 * @param leagueId - League ID from BSD API
 * @param season - Season ID (not used by BSD but keeping for compatibility)
 */
export async function getFixturesByLeague(leagueId: string, season: string) {
  const response = await apiFetch<any>('/events/', {
    league: leagueId,
  });
  return transformBSDEventResponse(response);
}

/**
 * Transform a single BSD event to the expected fixture format
 * Used for getFixtureById which returns a single match wrapped in an array
 */
function transformBSDSingleEvent(event: any): any {
  const token = import.meta.env.VITE_BSD_API_KEY;

  const getTeamName = (teamName: string | null | undefined) =>
    teamName || 'Unknown';

  const getTeamLogoUrl = (apiTeamId: number | null | undefined) => {
    if (!apiTeamId || !token) return null;
    return `https://sports.bzzoiro.com/img/team/${apiTeamId}/?token=${token}`;
  };

  const getLeagueLogoUrl = (apiLeagueId: number | null | undefined) => {
    if (!apiLeagueId || !token) return null;
    return `https://sports.bzzoiro.com/img/league/${apiLeagueId}/?token=${token}`;
  };

  const venueName =
    event.venue?.name ||
    event.venue_name ||
    event.stadium?.name ||
    event.stadium_name ||
    event.stadium ||
    event.venue ||
    event.location ||
    (event.home_team ? `${event.home_team} Stadium` : '');

  const venueCity =
    event.venue?.city ||
    event.city ||
    event.stadium_city ||
    event.location_city ||
    '';

  // Return in ApiFixture format expected by MatchDetailPage
  const homeName = getTeamName(event.home_team);
  const awayName = getTeamName(event.away_team);

  const normalizedStatus = (event.status || '').toString().toLowerCase();
  const liveTokens = [
    'live',
    'inprogress',
    'in_play',
    '1h',
    '2h',
    'ht',
    '1st_half',
    '2nd_half',
    'first_half',
    'second_half',
    '1t',
    '2t',
  ];
  const isLive = liveTokens.some((token) => normalizedStatus.includes(token));
  const isFinished = normalizedStatus.includes('finish') || normalizedStatus === 'ft';

  return {
    fixture: {
      id: event.id,
      referee: null,
      timezone: 'UTC',
      date: event.event_date,
      timestamp: new Date(event.event_date).getTime() / 1000,
      periods: {
        first: null,
        second: null,
      },
      venue: {
        id: null,
        name: venueName,
        city: venueCity,
      },
      status: {
        long: isFinished ? 'Match Finished' : isLive ? 'In Play' : 'Not Started',
        short: isFinished ? 'FT' : isLive ? 'LIVE' : 'NS',
        elapsed: event.current_minute || null,
      },
    },
    league: {
      id: event.league?.id,
      name: event.league?.name || 'Unknown',
      country: event.league?.country || '',
      logo: getLeagueLogoUrl(event.league?.api_id),
      flag: null,
      season: event.league?.season_id,
      round: 'Regular Season',
    },
    teams: {
      home: {
        id: event.home_team_obj?.api_id || event.home_team_obj?.id || null,
        name: homeName,
        logo: getTeamLogoUrl(event.home_team_obj?.api_id),
        winner: null,
      },
      away: {
        id: event.away_team_obj?.api_id || event.away_team_obj?.id || null,
        name: awayName,
        logo: getTeamLogoUrl(event.away_team_obj?.api_id),
        winner: null,
      },
    },
    goals: {
      home: event.home_score,
      away: event.away_score,
    },
    score: {
      halftime: {
        home: null,
        away: null,
      },
      fulltime: {
        home: event.home_score,
        away: event.away_score,
      },
      extratime: {
        home: null,
        away: null,
      },
      penalty: {
        home: null,
        away: null,
      },
    },
  };
}

/**
 * Get fixture details by ID
 * @param fixtureId - Fixture ID
 */
export async function getFixtureById(fixtureId: string) {
  const response = await apiFetch<any>(`/events/${fixtureId}/`);
  // Wrap in array to match expected return format
  return [transformBSDSingleEvent(response)];
}

/**
 * Get league details by ID
 * @param leagueId - League ID
 */
export async function getLeagueById(leagueId: string) {
  return apiFetch(`/leagues/${leagueId}/`);
}

/**
 * Get player details by ID
 * @param playerId - Player ID
 */
export async function getPlayerById(playerId: string) {
  return apiFetch(`/players/${playerId}/`);
}

/**
 * Get players by team ID
 * @param teamId - Team ID
 */
export async function getPlayersByTeam(teamId: string) {
  return apiFetch('/players/', {
    team: teamId,
  });
}

/**
 * Get player profile with detailed information
 */
export async function getPlayerProfile(playerId: string) {
  try {
    const player = await getPlayerById(playerId) as Record<string, any>;
    return {
      id: player.id,
      name: player.name,
      position: player.position,
      nationality: player.nationality,
      date_of_birth: player.date_of_birth,
      age: player.age,
      height: player.height,
      weight: player.weight,
      country_code: player.country_code,
      market_value: player.market_value,
      market_value_currency: player.market_value_currency,
      current_team: player.current_team,
      current_team_logo: player.current_team?.logo,
      photo: player.photo,
    };
  } catch (err) {
    console.error(`Error getting player profile for ${playerId}:`, err);
    return null;
  }
}


/**
 * Get league standings
 * Note: BSD API doesn't have a standings endpoint, returning empty
 * Consider adding a GET /standings/ if available in future API versions
 */
export async function getStandings(leagueId: string, season: string) {
  // BSD doesn't provide standings endpoint
  // Return empty structure to prevent app crashes
  return { results: [], count: 0 };
}

/**
 * Get all teams in a competition
 * @param leagueId - League ID
 * @param season - Season (not used by BSD)
 */
export async function getCompetitionTeams(leagueId: string, season: string) {
  return apiFetch('/teams/', {
    league: leagueId,
  });
}

/**
 * Get team information
 * @param teamId - Team ID
 */
export async function getTeamById(teamId: string) {
  return apiFetch(`/teams/${teamId}/`);
}

/**
 * Get leagues information
 */
export async function getLeagues() {
  return apiFetch('/leagues/');
}

/**
 * Get head to head matches between two teams
 * @param team1Id - First team ID
 * @param team2Id - Second team ID
 */
export async function getHeadToHead(team1Id: string, team2Id: string) {
  // BSD doesn't have direct h2h endpoint
  // Get all events and filter client-side
  const response = await apiFetch<any>('/events/');
  const matches = response.results || [];
  return {
    results: matches.filter(
      (m: any) =>
        (m.home_team_obj?.id === parseInt(team1Id) || m.home_team_obj?.id === parseInt(team2Id)) &&
        (m.away_team_obj?.id === parseInt(team1Id) || m.away_team_obj?.id === parseInt(team2Id))
    ),
    count: matches.length,
  };
}

/**
 * Get fixture details with statistics
 * @param fixtureId - Fixture ID
 */
export async function getFixtureStatistics(fixtureId: string) {
  // BSD doesn't provide detailed statistics
  // Return empty array to prevent app crashes
  return [];
}

/**
 * Get fixture events (goals, cards, substitutions)
 * @param fixtureId - Fixture ID
 */
export async function getFixtureEvents(fixtureId: string) {
  // BSD doesn't provide detailed match events (goals, cards, subs)
  // Return empty array to prevent app crashes
  return [];
}

/**
 * Get fixture lineups
 * Note: BSD API doesn't have lineups endpoint
 */
export async function getFixtureLineups(fixtureId: string) {
  return { results: [], count: 0 };
}

/**
 * Search teams by name
 * @param name - Team name to search
 */
export async function searchTeams(name: string) {
  const response = await apiFetch<any>('/teams/');
  const teams = response.results || [];
  return {
    results: teams.filter((t: any) =>
      t.name.toLowerCase().includes(name.toLowerCase())
    ),
    count: teams.length,
  };
}

/**
 * Get ML predictions for a specific match
 */
export async function getPredictionByMatchId(matchId: string) {
  try {
    const response = await apiFetch<any>('/predictions/', {
      event: matchId,
    });
    const predictions = response.results || [];
    return predictions.length > 0 ? predictions[0] : null;
  } catch (err) {
    console.error(`Error getting prediction for match ${matchId}:`, err);
    return null;
  }
}

/**
 * Get predictions for matches in date range
 */
export async function getPredictionsByDate(dateFrom: string, dateTo: string) {
  try {
    const predictions = await apiFetch<any>('/predictions/', {
      date_from: dateFrom,
      date_to: dateTo,
    });
    return predictions;
  } catch (err) {
    console.error('Error getting predictions:', err);
    return { results: [] };
  }
}

/**
 * Extract odds from fixture/event response
 */
export function extractOddsFromEvent(event: any) {
  return {
    '1x2': {
      home: event.odds_home || null,
      draw: event.odds_draw || null,
      away: event.odds_away || null,
    },
    'over_under': {
      over_15: event.odds_over_15 || null,
      under_15: event.odds_under_15 || null,
      over_25: event.odds_over_25 || null,
      under_25: event.odds_under_25 || null,
      over_35: event.odds_over_35 || null,
      under_35: event.odds_under_35 || null,
    },
    'btts': {
      yes: event.odds_btts_yes || null,
      no: event.odds_btts_no || null,
    },
  };
}

/**
 * Format prediction and odds for display
 */
export function formatPredictionsForDisplay(prediction: any, event?: any) {
  if (!prediction) {
    return null;
  }

  return {
    pick: prediction.predicted_result === 'H' ? 'Home Win' : 
          prediction.predicted_result === 'D' ? 'Draw' : 
          prediction.predicted_result === 'A' ? 'Away Win' : 'Unknown',
    probabilities: {
      homeWin: prediction.prob_home_win?.toFixed(1) || 0,
      draw: prediction.prob_draw?.toFixed(1) || 0,
      awayWin: prediction.prob_away_win?.toFixed(1) || 0,
      over15: prediction.prob_over_15?.toFixed(1) || null,
      over25: prediction.prob_over_25?.toFixed(1) || 0,
      over35: prediction.prob_over_35?.toFixed(1) || null,
      bttsYes: prediction.prob_btts_yes?.toFixed(1) || 0,
    },
    expectedGoals: {
      home: prediction.expected_home_goals?.toFixed(2) || 0,
      away: prediction.expected_away_goals?.toFixed(2) || 0,
    },
    confidence: prediction.confidence?.toFixed(2) || 0,
    mostLikelyScore: prediction.most_likely_score || 'N/A',
    favorite: prediction.favorite === 'H' ? 'Home' : 
              prediction.favorite === 'A' ? 'Away' : 'Even',
    modelVersion: prediction.model_version || 'CatBoost',
    odds: event ? extractOddsFromEvent(event) : null,
  };
}

// League IDs for BSD API (from https://sports.bzzoiro.com/api/leagues/)
export const LEAGUE_IDS = {
  PREMIER_LEAGUE: '1',       // England - Premier League
  LIGA_PORTUGAL: '2',        // Portugal - Liga Portugal
  LA_LIGA: '3',              // Spain - La Liga
  BUNDESLIGA: '5',           // Germany - Bundesliga
  LIGUE_1: '6',              // France - Ligue 1
  CHAMPIONS_LEAGUE: '7',     // Europe - Champions League
  EUROPA_LEAGUE: '8',        // Europe - Europa League
};

// Map internal league IDs to BSD league IDs
export const LEAGUE_ID_MAP: Record<string, string> = {
  'premier-league': LEAGUE_IDS.PREMIER_LEAGUE,
  'la-liga': LEAGUE_IDS.LA_LIGA,
  'bundesliga': LEAGUE_IDS.BUNDESLIGA,
  'serie-a': LEAGUE_IDS.LA_LIGA, // Fallback to La Liga if not available
  'ligue-1': LEAGUE_IDS.LIGUE_1,
  'champions-league': LEAGUE_IDS.CHAMPIONS_LEAGUE,
};

// Array of allowed league codes for filtering
export const ALLOWED_LEAGUE_IDS = Object.values(LEAGUE_IDS);

export default {
  getLiveMatches,
  getLiveMatchById,
  getFixturesByDate,
  getFixturesByLeague,
  getFixtureById,
  getLeagueById,
  getPlayerById,
  getPlayersByTeam,
  getStandings,
  getCompetitionTeams,
  getTeamById,
  getLeagues,
  getHeadToHead,
  getFixtureStatistics,
  getFixtureEvents,
  getFixtureLineups,
  searchTeams,
  LEAGUE_IDS,
  LEAGUE_ID_MAP,
  ALLOWED_LEAGUE_IDS,
};

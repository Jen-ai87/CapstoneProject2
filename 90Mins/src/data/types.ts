export interface League {
  id: string;
  name: string;
  shortName: string;
  logo: string; // URL to league logo image
  country?: string;
  flag?: string;
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  leagueId: string;
  logo?: string; // URL to team logo image (optional for backward compatibility)
  city?: string; // City where the team is based
  bsdTeamId?: number; // BSD Sports API internal team ID (for /api/teams/{id}/ and /api/players/?team={id})
  bsdApiId?: number; // BSD Sports API external ID (for /img/team/{api_id}/ logos)
}

export type MatchStatus = 'live' | 'upcoming' | 'finished';

export interface MatchTeam {
  teamId: string;
  apiTeamId?: number;    // API team ID (could be internal or external depending on source)
  bsdInternalId?: number; // BSD internal team ID (for API queries)
  bsdApiId?: number;     // BSD external team ID (for logo URLs) 
  name?: string;         // optional team name from API (for when team not in database)
  crest?: string;        // optional team logo URL from API
  score: number | null;  // null for upcoming matches
}

export interface Match {
  id: string;
  leagueId: string;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  status: MatchStatus;
  minute: string | null;      // e.g. "67'" or "HT" for live, null for upcoming
  kickoff: string | null;     // e.g. "18:30" for upcoming, null for live
  venue: string;
}

export interface MatchDay {
  date: string; // "today" | "yesterday" | "tomorrow" or ISO date
  liveMatches: Match[];
  upcomingMatches: Match[];
  finishedMatches: Match[];
}

export type ZoneType = 'champions-league' | 'europa-league' | 'relegation' | null;

export interface StandingRow {
  position: number;
  teamId: string;
  apiTeamId?: number;      // API team ID for teams not in database
  apiTeamName?: string;    // Team name from API (for when team not in database)
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  zone: ZoneType;
  form?: ('W' | 'L' | 'D')[]; // Last 5 matches, oldest first
}

export interface LeagueStanding {
  leagueId: string;
  rows: StandingRow[];
}

export interface FavouriteTeam {
  teamId: string;
  nextMatch: {
    opponent: string;
    date: string;
    time: string;
  } | null;
}

/* ── User / Auth types ── */

export interface User {
  id: string;
  name: string;
  email: string;
  avatarIcon: string;
  avatarColor: string;
}

/* ── Match Detail types ── */

export type MatchEventType = 'goal' | 'yellow-card' | 'red-card' | 'substitution';

export interface MatchEvent {
  id: string;
  minute: string;         // e.g. "12'", "45+2'"
  type: MatchEventType;
  playerName: string;
  side: 'home' | 'away';  // which team the event belongs to
}

export interface MatchStatistics {
  possession: [number, number];      // [home%, away%]
  shots: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
}

export interface MatchDetail {
  matchId: string;
  events: MatchEvent[];
  statistics?: MatchStatistics;
}

export interface TeamFormMatch {
  id: string;
  opponent: string;            // opponent teamId
  opponentLogo: string;        // URL to opponent logo
  isHome: boolean;             // true if home match
  score: number;               // goals scored
  conceded: number;            // goals conceded
  result: 'W' | 'L' | 'D';     // match result
}

export interface League {
  id: string;
  name: string;
  shortName: string;
  logo: string; // emoji placeholder for now, replace with image URLs later
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  leagueId: string;
}

export type MatchStatus = 'live' | 'upcoming' | 'finished';

export interface MatchTeam {
  teamId: string;
  score: number | null; // null for upcoming matches
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
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  zone: ZoneType;
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
  password: string; // plain text for dummy data only
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
  statistics: MatchStatistics;
}

import { Match } from './types';

/**
 * Live matches — currently in progress
 * These match the Figma mockup exactly
 */
export const liveMatches: Match[] = [
  {
    id: 'live-1',
    leagueId: 'premier-league',
    homeTeam: { teamId: 'man-utd', score: 2 },
    awayTeam: { teamId: 'liverpool', score: 2 },
    status: 'live',
    minute: "67'",
    kickoff: null,
    venue: 'Old Trafford',
  },
  {
    id: 'live-2',
    leagueId: 'premier-league',
    homeTeam: { teamId: 'arsenal', score: 1 },
    awayTeam: { teamId: 'chelsea', score: 0 },
    status: 'live',
    minute: 'HT',
    kickoff: null,
    venue: 'Emirates Stadium',
  },
  {
    id: 'live-3',
    leagueId: 'serie-a',
    homeTeam: { teamId: 'ac-milan', score: 1 },
    awayTeam: { teamId: 'inter-milan', score: 1 },
    status: 'live',
    minute: "82'",
    kickoff: null,
    venue: 'San Siro',
  },
];

/**
 * Upcoming matches — scheduled but not started
 */
export const upcomingMatches: Match[] = [
  {
    id: 'upcoming-1',
    leagueId: 'bundesliga',
    homeTeam: { teamId: 'bayern', score: null },
    awayTeam: { teamId: 'dortmund', score: null },
    status: 'upcoming',
    minute: null,
    kickoff: '18:30',
    venue: 'Allianz Arena',
  },
];

/**
 * Finished matches — for "Yesterday" tab
 */
export const finishedMatches: Match[] = [
  {
    id: 'finished-1',
    leagueId: 'la-liga',
    homeTeam: { teamId: 'barcelona', score: 3 },
    awayTeam: { teamId: 'real-madrid', score: 1 },
    status: 'finished',
    minute: 'FT',
    kickoff: null,
    venue: 'Camp Nou',
  },
  {
    id: 'finished-2',
    leagueId: 'ligue-1',
    homeTeam: { teamId: 'psg', score: 2 },
    awayTeam: { teamId: 'marseille', score: 0 },
    status: 'finished',
    minute: 'FT',
    kickoff: null,
    venue: 'Parc des Princes',
  },
  {
    id: 'finished-3',
    leagueId: 'premier-league',
    homeTeam: { teamId: 'man-city', score: 4 },
    awayTeam: { teamId: 'tottenham', score: 2 },
    status: 'finished',
    minute: 'FT',
    kickoff: null,
    venue: 'Etihad Stadium',
  },
];

/**
 * Tomorrow's scheduled matches
 */
export const tomorrowMatches: Match[] = [
  {
    id: 'tomorrow-1',
    leagueId: 'serie-a',
    homeTeam: { teamId: 'juventus', score: null },
    awayTeam: { teamId: 'napoli', score: null },
    status: 'upcoming',
    minute: null,
    kickoff: '20:45',
    venue: 'Allianz Stadium',
  },
  {
    id: 'tomorrow-2',
    leagueId: 'bundesliga',
    homeTeam: { teamId: 'leverkusen', score: null },
    awayTeam: { teamId: 'dortmund', score: null },
    status: 'upcoming',
    minute: null,
    kickoff: '17:30',
    venue: 'BayArena',
  },
  {
    id: 'tomorrow-3',
    leagueId: 'ligue-1',
    homeTeam: { teamId: 'lyon', score: null },
    awayTeam: { teamId: 'psg', score: null },
    status: 'upcoming',
    minute: null,
    kickoff: '21:00',
    venue: 'Groupama Stadium',
  },
];

/**
 * All matches in a single flat array
 */
export const allMatches: Match[] = [
  ...liveMatches,
  ...upcomingMatches,
  ...finishedMatches,
  ...tomorrowMatches,
];

/**
 * Helper: get a single match by its ID
 */
export const getMatchById = (id: string): Match | undefined =>
  allMatches.find((m) => m.id === id);

/**
 * Helper: get all matches for a specific league
 */
export const getMatchesByLeague = (leagueId: string, matches: Match[]): Match[] =>
  matches.filter((match) => match.leagueId === leagueId);

/**
 * Filter by league IDs — "All Leagues" returns everything
 */
export const filterMatchesByLeagues = (
  matches: Match[],
  leagueIds: string[] | null
): Match[] => {
  if (!leagueIds || leagueIds.length === 0) return matches;
  return matches.filter((match) => leagueIds.includes(match.leagueId));
};

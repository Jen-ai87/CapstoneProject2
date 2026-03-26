import { LeagueStanding, ZoneType } from './types';
import { teams } from './teams';

const buildForm = (seed: number): ('W' | 'L' | 'D')[] => {
  const values: Array<'W' | 'L' | 'D'> = ['W', 'D', 'L'];
  return Array.from({ length: 5 }, (_, idx) => values[(seed + idx) % values.length]);
};

const resolveZone = (position: number, totalTeams: number): ZoneType => {
  if (totalTeams >= 6) {
    if (position <= 4) return 'champions-league';
    if (position <= 6) return 'europa-league';
    if (position > totalTeams - 3) return 'relegation';
  }
  if (totalTeams >= 4 && position <= 2) return 'champions-league';
  return null;
};

const buildLeagueStandings = (leagueId: string): LeagueStanding => {
  const leagueTeams = teams.filter((team) => team.leagueId === leagueId);
  const totalTeams = leagueTeams.length;
  const rows = leagueTeams
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((team, index) => {
      const position = index + 1;
      const played = 12;
      const won = Math.max(0, Math.min(played, played - index - 2));
      const drawn = index % 3;
      const lost = Math.max(0, played - won - drawn);
      const goalsFor = 16 + (totalTeams - index) * 2;
      const goalsAgainst = 8 + index * 2;
      const goalDifference = goalsFor - goalsAgainst;
      const points = won * 3 + drawn;

      return {
        position,
        teamId: team.id,
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDifference,
        points,
        zone: resolveZone(position, totalTeams),
        form: buildForm(index),
      };
    });

  return {
    leagueId,
    rows,
  };
};

export const premierLeagueStandings = buildLeagueStandings('premier-league');
export const laLigaStandings = buildLeagueStandings('la-liga');
export const serieAStandings = buildLeagueStandings('serie-a');
export const bundesligaStandings = buildLeagueStandings('bundesliga');
export const ligue1Standings = buildLeagueStandings('ligue-1');

export const allStandings: LeagueStanding[] = [
  premierLeagueStandings,
  laLigaStandings,
  serieAStandings,
  bundesligaStandings,
  ligue1Standings,
];

export const getStandingsByLeague = (leagueId: string): LeagueStanding | undefined =>
  allStandings.find((s) => s.leagueId === leagueId);

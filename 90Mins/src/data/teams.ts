import { Team } from './types';

export const teams: Team[] = [
  // Premier League
  {
    id: 'man-utd',
    name: 'Manchester United',
    abbreviation: 'MU',
    leagueId: 'premier-league',
  },
  {
    id: 'liverpool',
    name: 'Liverpool',
    abbreviation: 'LI',
    leagueId: 'premier-league',
  },
  {
    id: 'arsenal',
    name: 'Arsenal',
    abbreviation: 'AR',
    leagueId: 'premier-league',
  },
  {
    id: 'chelsea',
    name: 'Chelsea',
    abbreviation: 'CH',
    leagueId: 'premier-league',
  },
  {
    id: 'man-city',
    name: 'Manchester City',
    abbreviation: 'MC',
    leagueId: 'premier-league',
  },
  {
    id: 'tottenham',
    name: 'Tottenham',
    abbreviation: 'TO',
    leagueId: 'premier-league',
  },
  {
    id: 'newcastle',
    name: 'Newcastle',
    abbreviation: 'NE',
    leagueId: 'premier-league',
  },
  {
    id: 'brighton',
    name: 'Brighton',
    abbreviation: 'BR',
    leagueId: 'premier-league',
  },
  {
    id: 'aston-villa',
    name: 'Aston villa',
    abbreviation: 'AS',
    leagueId: 'premier-league',
  },
  {
    id: 'west-ham',
    name: 'West Ham',
    abbreviation: 'WH',
    leagueId: 'premier-league',
  },

  // La Liga
  {
    id: 'barcelona',
    name: 'FC Barcelona',
    abbreviation: 'BA',
    leagueId: 'la-liga',
  },
  {
    id: 'real-madrid',
    name: 'Real Madrid',
    abbreviation: 'RM',
    leagueId: 'la-liga',
  },
  {
    id: 'atletico',
    name: 'Atletico Madrid',
    abbreviation: 'AT',
    leagueId: 'la-liga',
  },

  // Serie A
  {
    id: 'ac-milan',
    name: 'AC Milan',
    abbreviation: 'AC',
    leagueId: 'serie-a',
  },
  {
    id: 'inter-milan',
    name: 'Inter Milan',
    abbreviation: 'IN',
    leagueId: 'serie-a',
  },
  {
    id: 'juventus',
    name: 'Juventus',
    abbreviation: 'JU',
    leagueId: 'serie-a',
  },
  {
    id: 'napoli',
    name: 'Napoli',
    abbreviation: 'NA',
    leagueId: 'serie-a',
  },

  // Bundesliga
  {
    id: 'bayern',
    name: 'Bayern Munich',
    abbreviation: 'BA',
    leagueId: 'bundesliga',
  },
  {
    id: 'dortmund',
    name: 'Borussia Dortmund',
    abbreviation: 'BO',
    leagueId: 'bundesliga',
  },
  {
    id: 'leverkusen',
    name: 'Bayer Leverkusen',
    abbreviation: 'BL',
    leagueId: 'bundesliga',
  },

  // Ligue 1
  {
    id: 'psg',
    name: 'Paris Saint-Germain',
    abbreviation: 'PS',
    leagueId: 'ligue-1',
  },
  {
    id: 'marseille',
    name: 'Olympique Marseille',
    abbreviation: 'OM',
    leagueId: 'ligue-1',
  },
  {
    id: 'lyon',
    name: 'Olympique Lyon',
    abbreviation: 'OL',
    leagueId: 'ligue-1',
  },
];

export const getTeamById = (id: string): Team | undefined =>
  teams.find((team) => team.id === id);

export const getTeamsByLeague = (leagueId: string): Team[] =>
  teams.filter((team) => team.leagueId === leagueId);

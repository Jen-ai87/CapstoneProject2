import { League } from './types';

export const leagues: League[] = [
  {
    id: 'premier-league',
    name: 'Premier League',
    shortName: 'PL',
    logo: '⚽',
  },
  {
    id: 'la-liga',
    name: 'La Liga',
    shortName: 'LL',
    logo: '⚽',
  },
  {
    id: 'serie-a',
    name: 'Serie A',
    shortName: 'SA',
    logo: '🔺',
  },
  {
    id: 'bundesliga',
    name: 'Bundesliga',
    shortName: 'BL',
    logo: '🏴',
  },
  {
    id: 'ligue-1',
    name: 'Ligue 1',
    shortName: 'L1',
    logo: '⚽',
  },
];

export const getLeagueById = (id: string): League | undefined =>
  leagues.find((league) => league.id === id);

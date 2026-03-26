import { League } from './types';

/**
 * Europe's Top 5 Leagues + Champions League
 * Using API-Football logo URLs
 */
export const leagues: League[] = [
  {
    id: 'premier-league',
    name: 'Premier League',
    shortName: 'EPL',
    logo: 'https://media.api-sports.io/football/leagues/39.png',
    country: 'England',
    flag: 'https://flagcdn.com/w320/gb-eng.png',
  },
  {
    id: 'la-liga',
    name: 'La Liga',
    shortName: 'LaLiga',
    logo: 'https://media.api-sports.io/football/leagues/140.png',
    country: 'Spain',
    flag: 'https://flagcdn.com/w320/es.png',
  },
  {
    id: 'serie-a',
    name: 'Serie A',
    shortName: 'SerieA',
    logo: 'https://media.api-sports.io/football/leagues/135.png',
    country: 'Italy',
    flag: 'https://flagcdn.com/w320/it.png',
  },
  {
    id: 'bundesliga',
    name: 'Bundesliga',
    shortName: 'Bundes',
    logo: 'https://media.api-sports.io/football/leagues/78.png',
    country: 'Germany',
    flag: 'https://flagcdn.com/w320/de.png',
  },
  {
    id: 'ligue-1',
    name: 'Ligue 1',
    shortName: 'L1',
    logo: 'https://media.api-sports.io/football/leagues/61.png',
    country: 'France',
    flag: 'https://flagcdn.com/w320/fr.png',
  },
  {
    id: 'champions-league',
    name: 'Champions League',
    shortName: 'UCL',
    logo: 'https://media.api-sports.io/football/leagues/2.png',
    country: 'Europe',
    flag: 'https://flagcdn.com/w320/eu.png',
  },
];

export const getLeagueById = (id: string): League | undefined =>
  leagues.find((league) => league.id === id);

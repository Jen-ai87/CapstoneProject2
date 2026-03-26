import { TeamFormMatch } from './types';
import { teams } from './teams';

const teamLogoById = new Map(teams.map((team) => [team.id, team.logo || '']));
const getOpponentLogo = (teamId: string): string => teamLogoById.get(teamId) || '';

/**
 * Team form data - last 5 matches for each team
 */
export const teamFormData: { [teamId: string]: TeamFormMatch[] } = {
  // Manchester United
  'man-utd': [
    { id: 'f1', opponent: 'arsenal', opponentLogo: getOpponentLogo('arsenal'), isHome: true, score: 2, conceded: 1, result: 'W' },
    { id: 'f2', opponent: 'chelsea', opponentLogo: getOpponentLogo('chelsea'), isHome: false, score: 1, conceded: 1, result: 'D' },
    { id: 'f3', opponent: 'newcastle', opponentLogo: getOpponentLogo('newcastle'), isHome: true, score: 2, conceded: 0, result: 'W' },
    { id: 'f4', opponent: 'brighton', opponentLogo: getOpponentLogo('brighton'), isHome: false, score: 1, conceded: 2, result: 'L' },
    { id: 'f5', opponent: 'liverpool', opponentLogo: getOpponentLogo('liverpool'), isHome: true, score: 2, conceded: 2, result: 'D' },
  ],
  // Liverpool
  'liverpool': [
    { id: 'l1', opponent: 'man-city', opponentLogo: getOpponentLogo('man-city'), isHome: false, score: 1, conceded: 3, result: 'L' },
    { id: 'l2', opponent: 'tottenham', opponentLogo: getOpponentLogo('tottenham'), isHome: true, score: 2, conceded: 1, result: 'W' },
    { id: 'l3', opponent: 'man-utd', opponentLogo: getOpponentLogo('man-utd'), isHome: false, score: 2, conceded: 2, result: 'D' },
    { id: 'l4', opponent: 'arsenal', opponentLogo: getOpponentLogo('arsenal'), isHome: true, score: 3, conceded: 2, result: 'W' },
    { id: 'l5', opponent: 'chelsea', opponentLogo: getOpponentLogo('chelsea'), isHome: false, score: 1, conceded: 1, result: 'D' },
  ],
  // Arsenal
  'arsenal': [
    { id: 'a1', opponent: 'man-utd', opponentLogo: getOpponentLogo('man-utd'), isHome: false, score: 1, conceded: 2, result: 'L' },
    { id: 'a2', opponent: 'chelsea', opponentLogo: getOpponentLogo('chelsea'), isHome: true, score: 1, conceded: 0, result: 'W' },
    { id: 'a3', opponent: 'tottenham', opponentLogo: getOpponentLogo('tottenham'), isHome: false, score: 2, conceded: 1, result: 'W' },
    { id: 'a4', opponent: 'newcastle', opponentLogo: getOpponentLogo('newcastle'), isHome: true, score: 3, conceded: 1, result: 'W' },
    { id: 'a5', opponent: 'brighton', opponentLogo: getOpponentLogo('brighton'), isHome: false, score: 2, conceded: 2, result: 'D' },
  ],
  // Chelsea
  'chelsea': [
    { id: 'c1', opponent: 'man-city', opponentLogo: getOpponentLogo('man-city'), isHome: true, score: 0, conceded: 2, result: 'L' },
    { id: 'c2', opponent: 'arsenal', opponentLogo: getOpponentLogo('arsenal'), isHome: false, score: 0, conceded: 1, result: 'L' },
    { id: 'c3', opponent: 'liverpool', opponentLogo: getOpponentLogo('liverpool'), isHome: true, score: 1, conceded: 1, result: 'D' },
    { id: 'c4', opponent: 'tottenham', opponentLogo: getOpponentLogo('tottenham'), isHome: false, score: 2, conceded: 1, result: 'W' },
    { id: 'c5', opponent: 'man-utd', opponentLogo: getOpponentLogo('man-utd'), isHome: true, score: 1, conceded: 1, result: 'D' },
  ],
  // Manchester City
  'man-city': [
    { id: 'mc1', opponent: 'newcastle', opponentLogo: getOpponentLogo('newcastle'), isHome: true, score: 3, conceded: 0, result: 'W' },
    { id: 'mc2', opponent: 'brighton', opponentLogo: getOpponentLogo('brighton'), isHome: false, score: 2, conceded: 1, result: 'W' },
    { id: 'mc3', opponent: 'tottenham', opponentLogo: getOpponentLogo('tottenham'), isHome: true, score: 4, conceded: 2, result: 'W' },
    { id: 'mc4', opponent: 'liverpool', opponentLogo: getOpponentLogo('liverpool'), isHome: true, score: 3, conceded: 1, result: 'W' },
    { id: 'mc5', opponent: 'arsenal', opponentLogo: getOpponentLogo('arsenal'), isHome: false, score: 1, conceded: 1, result: 'D' },
  ],
  // Tottenham
  'tottenham': [
    { id: 't1', opponent: 'man-city', opponentLogo: getOpponentLogo('man-city'), isHome: false, score: 2, conceded: 4, result: 'L' },
    { id: 't2', opponent: 'newcastle', opponentLogo: getOpponentLogo('newcastle'), isHome: true, score: 2, conceded: 1, result: 'W' },
    { id: 't3', opponent: 'brighton', opponentLogo: getOpponentLogo('brighton'), isHome: false, score: 1, conceded: 0, result: 'W' },
    { id: 't4', opponent: 'chelsea', opponentLogo: getOpponentLogo('chelsea'), isHome: true, score: 1, conceded: 2, result: 'L' },
    { id: 't5', opponent: 'liverpool', opponentLogo: getOpponentLogo('liverpool'), isHome: false, score: 1, conceded: 2, result: 'L' },
  ],
  // Newcastle
  'newcastle': [
    { id: 'n1', opponent: 'brighton', opponentLogo: getOpponentLogo('brighton'), isHome: true, score: 2, conceded: 1, result: 'W' },
    { id: 'n2', opponent: 'aston-villa', opponentLogo: getOpponentLogo('aston-villa'), isHome: false, score: 1, conceded: 1, result: 'D' },
    { id: 'n3', opponent: 'man-city', opponentLogo: getOpponentLogo('man-city'), isHome: false, score: 0, conceded: 3, result: 'L' },
    { id: 'n4', opponent: 'west-ham', opponentLogo: getOpponentLogo('west-ham'), isHome: true, score: 2, conceded: 0, result: 'W' },
    { id: 'n5', opponent: 'arsenal', opponentLogo: getOpponentLogo('arsenal'), isHome: false, score: 1, conceded: 3, result: 'L' },
  ],
  // Brighton
  'brighton': [
    { id: 'br1', opponent: 'tottenham', opponentLogo: getOpponentLogo('tottenham'), isHome: true, score: 0, conceded: 1, result: 'L' },
    { id: 'br2', opponent: 'newcastle', opponentLogo: getOpponentLogo('newcastle'), isHome: false, score: 1, conceded: 2, result: 'L' },
    { id: 'br3', opponent: 'man-utd', opponentLogo: getOpponentLogo('man-utd'), isHome: true, score: 2, conceded: 1, result: 'W' },
    { id: 'br4', opponent: 'chelsea', opponentLogo: getOpponentLogo('chelsea'), isHome: false, score: 2, conceded: 2, result: 'D' },
    { id: 'br5', opponent: 'man-city', opponentLogo: getOpponentLogo('man-city'), isHome: true, score: 1, conceded: 2, result: 'L' },
  ],
  // Aston Villa
  'aston-villa': [
    { id: 'av1', opponent: 'newcastle', opponentLogo: getOpponentLogo('newcastle'), isHome: true, score: 1, conceded: 1, result: 'D' },
    { id: 'av2', opponent: 'west-ham', opponentLogo: getOpponentLogo('west-ham'), isHome: false, score: 2, conceded: 1, result: 'W' },
    { id: 'av3', opponent: 'brighton', opponentLogo: getOpponentLogo('brighton'), isHome: true, score: 2, conceded: 1, result: 'W' },
    { id: 'av4', opponent: 'arsenal', opponentLogo: getOpponentLogo('arsenal'), isHome: false, score: 0, conceded: 2, result: 'L' },
    { id: 'av5', opponent: 'man-utd', opponentLogo: getOpponentLogo('man-utd'), isHome: true, score: 1, conceded: 0, result: 'W' },
  ],
  // West Ham
  'west-ham': [
    { id: 'wh1', opponent: 'aston-villa', opponentLogo: getOpponentLogo('aston-villa'), isHome: true, score: 1, conceded: 2, result: 'L' },
    { id: 'wh2', opponent: 'newcastle', opponentLogo: getOpponentLogo('newcastle'), isHome: false, score: 0, conceded: 2, result: 'L' },
    { id: 'wh3', opponent: 'brighton', opponentLogo: getOpponentLogo('brighton'), isHome: true, score: 1, conceded: 1, result: 'D' },
    { id: 'wh4', opponent: 'arsenal', opponentLogo: getOpponentLogo('arsenal'), isHome: false, score: 1, conceded: 2, result: 'L' },
    { id: 'wh5', opponent: 'man-utd', opponentLogo: getOpponentLogo('man-utd'), isHome: true, score: 2, conceded: 1, result: 'W' },
  ],
};

export const getTeamForm = (teamId: string): TeamFormMatch[] => {
  return teamFormData[teamId] || [];
};

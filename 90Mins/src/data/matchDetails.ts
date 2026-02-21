import { MatchDetail } from './types';

/**
 * Dummy match detail data — events + statistics for each match
 */
export const matchDetails: MatchDetail[] = [
  /* ── Man Utd 2 – 2 Liverpool (live-1) ── */
  {
    matchId: 'live-1',
    events: [
      { id: 'e1', minute: "12'",   type: 'goal',        playerName: 'M. Rashford',   side: 'home' },
      { id: 'e2', minute: "12'",   type: 'yellow-card', playerName: 'Casemiro',       side: 'home' },
      { id: 'e3', minute: "23'",   type: 'goal',        playerName: 'M. Salah',       side: 'away' },
      { id: 'e4', minute: "45+2'", type: 'goal',        playerName: 'B. Fernandes',   side: 'home' },
      { id: 'e5', minute: "61'",   type: 'goal',        playerName: 'D. Núñez',       side: 'away' },
    ],
    statistics: {
      possession: [48, 52],
      shots: [12, 15],
      shotsOnTarget: [6, 8],
      corners: [5, 7],
      fouls: [11, 10],
    },
  },

  /* ── Arsenal 1 – 0 Chelsea (live-2) ── */
  {
    matchId: 'live-2',
    events: [
      { id: 'e10', minute: "32'", type: 'goal',        playerName: 'B. Saka',     side: 'home' },
      { id: 'e11', minute: "38'", type: 'yellow-card', playerName: 'E. Palmieri', side: 'away' },
    ],
    statistics: {
      possession: [58, 42],
      shots: [10, 6],
      shotsOnTarget: [5, 2],
      corners: [6, 3],
      fouls: [8, 12],
    },
  },

  /* ── AC Milan 1 – 1 Inter Milan (live-3) ── */
  {
    matchId: 'live-3',
    events: [
      { id: 'e20', minute: "15'", type: 'goal',        playerName: 'R. Leão',       side: 'home' },
      { id: 'e21', minute: "55'", type: 'goal',        playerName: 'L. Martínez',   side: 'away' },
      { id: 'e22', minute: "70'", type: 'yellow-card', playerName: 'T. Hernández',  side: 'home' },
    ],
    statistics: {
      possession: [45, 55],
      shots: [9, 13],
      shotsOnTarget: [4, 6],
      corners: [4, 8],
      fouls: [14, 9],
    },
  },

  /* ── Barcelona 3 – 1 Real Madrid (finished-1) ── */
  {
    matchId: 'finished-1',
    events: [
      { id: 'e30', minute: "11'", type: 'goal',        playerName: 'R. Lewandowski', side: 'home' },
      { id: 'e31', minute: "29'", type: 'goal',        playerName: 'Vinícius Jr.',   side: 'away' },
      { id: 'e32', minute: "52'", type: 'goal',        playerName: 'Pedri',           side: 'home' },
      { id: 'e33', minute: "78'", type: 'goal',        playerName: 'L. Yamal',        side: 'home' },
      { id: 'e34', minute: "65'", type: 'yellow-card', playerName: 'D. Rüdiger',     side: 'away' },
    ],
    statistics: {
      possession: [62, 38],
      shots: [18, 8],
      shotsOnTarget: [9, 4],
      corners: [8, 3],
      fouls: [10, 14],
    },
  },

  /* ── PSG 2 – 0 Marseille (finished-2) ── */
  {
    matchId: 'finished-2',
    events: [
      { id: 'e40', minute: "24'", type: 'goal',        playerName: 'O. Dembélé',  side: 'home' },
      { id: 'e41', minute: "67'", type: 'goal',        playerName: 'B. Barcola',  side: 'home' },
      { id: 'e42', minute: "44'", type: 'yellow-card', playerName: 'Chancel Mbemba', side: 'away' },
    ],
    statistics: {
      possession: [60, 40],
      shots: [16, 7],
      shotsOnTarget: [7, 2],
      corners: [7, 4],
      fouls: [9, 13],
    },
  },

  /* ── Man City 4 – 2 Tottenham (finished-3) ── */
  {
    matchId: 'finished-3',
    events: [
      { id: 'e50', minute: "8'",  type: 'goal',        playerName: 'E. Haaland',     side: 'home' },
      { id: 'e51', minute: "22'", type: 'goal',        playerName: 'Son Heung-min',  side: 'away' },
      { id: 'e52', minute: "35'", type: 'goal',        playerName: 'E. Haaland',     side: 'home' },
      { id: 'e53', minute: "58'", type: 'goal',        playerName: 'P. Foden',       side: 'home' },
      { id: 'e54', minute: "71'", type: 'goal',        playerName: 'D. Kulusevski',  side: 'away' },
      { id: 'e55', minute: "85'", type: 'goal',        playerName: 'J. Álvarez',     side: 'home' },
    ],
    statistics: {
      possession: [65, 35],
      shots: [22, 10],
      shotsOnTarget: [12, 5],
      corners: [9, 3],
      fouls: [7, 11],
    },
  },
];

/**
 * Helper: get match detail by match ID
 */
export const getMatchDetailById = (matchId: string): MatchDetail | undefined =>
  matchDetails.find((d) => d.matchId === matchId);

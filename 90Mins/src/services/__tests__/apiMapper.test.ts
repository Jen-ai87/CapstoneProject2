import { describe, it, expect } from 'vitest';
import {
  mapApiStandingToRow,
  mapApiStandingsToLeagueStanding,
  mapApiMatchToMatch,
  mapApiTeamToTeam,
  mapApiLeagueToLeague,
  mapApiEventToMatchEvent,
  mapApiStatisticsToMatchStatistics,
  ApiStanding,
  ApiStandingsResponse,
  ApiMatch,
  ApiEvent,
  ApiStatistic,
} from '../apiMapper';

describe('apiMapper', () => {
  describe('mapApiStandingToRow', () => {
    it('maps API standing to app StandingRow shape', () => {
      const mockStanding: ApiStanding = {
        position: 1,
        positionText: '1st',
        team: {
          id: 1,
          name: 'Manchester United',
          shortName: 'Man United',
          tla: 'MUN',
          crest: 'https://example.com/mun.png',
        },
        playedGames: 10,
        form: 'WWWWW',
        won: 8,
        draw: 2,
        lost: 0,
        points: 26,
        goalsFor: 25,
        goalsAgainst: 5,
        goalDifference: 20,
      };

      const result = mapApiStandingToRow(mockStanding, 'premier-league');

      expect(result.position).toBe(1);
      expect(result.apiTeamName).toBe('Manchester United');
      expect(result.won).toBe(8);
      expect(result.drawn).toBe(2);
      expect(result.lost).toBe(0);
      expect(result.points).toBe(26);
      expect(result.goalDifference).toBe(20);
      expect(result.played).toBe(10);
      expect(result.zone).toBe('champions-league');
      expect(typeof result.teamId).toBe('string');
    });

    it('maps mid-table teams to europa-league/relegation/null zones correctly', () => {
      const europa: ApiStanding = {
        position: 5,
        positionText: '5th',
        team: { id: 5, name: 'Chelsea', shortName: 'Chelsea', tla: 'CHE' },
        playedGames: 8,
        won: 5,
        draw: 2,
        lost: 1,
        points: 17,
        goalsFor: 15,
        goalsAgainst: 8,
        goalDifference: 7,
      };

      const relegation: ApiStanding = {
        position: 19,
        positionText: '19th',
        team: { id: 19, name: 'Luton', shortName: 'Luton', tla: 'LUT' },
        playedGames: 8,
        won: 1,
        draw: 2,
        lost: 5,
        points: 5,
        goalsFor: 8,
        goalsAgainst: 20,
        goalDifference: -12,
      };

      expect(mapApiStandingToRow(europa, 'premier-league').zone).toBe('europa-league');
      expect(mapApiStandingToRow(relegation, 'premier-league').zone).toBe('relegation');
    });
  });

  describe('mapApiStandingsToLeagueStanding', () => {
    it('maps standings response to { leagueId, rows }', () => {
      const mockResponse: ApiStandingsResponse = {
        filters: {},
        competition: {
          id: 2021,
          name: 'Premier League',
          code: 'PL',
          type: 'LEAGUE',
          emblem: 'https://example.com/pl.png',
        },
        season: {
          id: 2023,
          startDate: '2023-08-01',
          endDate: '2024-05-31',
          currentMatchday: 15,
        },
        standings: [
          {
            type: 'TOTAL',
            table: [
              {
                position: 1,
                positionText: '1st',
                team: {
                  id: 1,
                  name: 'Manchester United',
                  shortName: 'Man United',
                  tla: 'MUN',
                },
                playedGames: 15,
                won: 12,
                draw: 2,
                lost: 1,
                points: 38,
                goalsFor: 45,
                goalsAgainst: 15,
                goalDifference: 30,
              },
              {
                position: 2,
                positionText: '2nd',
                team: {
                  id: 2,
                  name: 'Manchester City',
                  shortName: 'Man City',
                  tla: 'MCI',
                },
                playedGames: 15,
                won: 11,
                draw: 3,
                lost: 1,
                points: 36,
                goalsFor: 50,
                goalsAgainst: 12,
                goalDifference: 38,
              },
            ],
          },
        ],
      };

      const result = mapApiStandingsToLeagueStanding(mockResponse, 'premier-league');

      expect(result.leagueId).toBe('premier-league');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].position).toBe(1);
      expect(result.rows[0].apiTeamName).toBe('Manchester United');
      expect(result.rows[1].position).toBe(2);
    });

    it('handles empty standings table', () => {
      const mockResponse: ApiStandingsResponse = {
        filters: {},
        competition: {
          id: 2021,
          name: 'Premier League',
          code: 'PL',
          type: 'LEAGUE',
        },
        season: {
          id: 2023,
          startDate: '2023-08-01',
          endDate: '2024-05-31',
        },
        standings: [
          {
            type: 'TOTAL',
            table: [],
          },
        ],
      };

      const result = mapApiStandingsToLeagueStanding(mockResponse, 'premier-league');

      expect(result.leagueId).toBe('premier-league');
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('mapApiMatchToMatch', () => {
    it('maps finished match correctly', () => {
      const mockMatch: ApiMatch = {
        id: 123,
        utcDate: '2023-10-14T15:00:00Z',
        status: 'FINISHED',
        venue: 'Old Trafford',
        competition: {
          id: 2021,
          name: 'Premier League',
          code: 'PL',
        },
        homeTeam: {
          id: 1,
          name: 'Manchester United',
          shortName: 'Man United',
          tla: 'MUN',
        },
        awayTeam: {
          id: 2,
          name: 'Manchester City',
          shortName: 'Man City',
          tla: 'MCI',
        },
        score: {
          winner: 'HOME',
          duration: 'REGULAR',
          fullTime: {
            home: 2,
            away: 1,
          },
          halfTime: {
            home: 1,
            away: 0,
          },
        },
      };

      const result = mapApiMatchToMatch(mockMatch, 'premier-league');

      expect(result.status).toBe('finished');
      expect(result.homeTeam.score).toBe(2);
      expect(result.awayTeam.score).toBe(1);
      expect(result.minute).toBe('FT');
      expect(result.kickoff).toBeNull();
    });

    it('maps live match minute as string', () => {
      const mockMatch: ApiMatch = {
        id: 456,
        utcDate: '2023-10-14T15:00:00Z',
        status: 'IN_PLAY',
        minute: 45,
        venue: 'Etihad Stadium',
        homeTeam: {
          id: 2,
          name: 'Manchester City',
          shortName: 'Man City',
          tla: 'MCI',
        },
        awayTeam: {
          id: 3,
          name: 'Liverpool',
          shortName: 'Liverpool',
          tla: 'LIV',
        },
        score: {
          duration: 'REGULAR',
          fullTime: {
            home: null,
            away: null,
          },
          halfTime: {
            home: 1,
            away: 1,
          },
        },
      };

      const result = mapApiMatchToMatch(mockMatch, 'premier-league');

      expect(result.status).toBe('live');
      expect(result.minute).toBe('45');
    });

    it('maps upcoming match with kickoff time', () => {
      const mockMatch: ApiMatch = {
        id: 789,
        utcDate: '2023-10-21T15:00:00Z',
        status: 'SCHEDULED',
        venue: 'Anfield',
        homeTeam: {
          id: 3,
          name: 'Liverpool',
          shortName: 'Liverpool',
          tla: 'LIV',
        },
        awayTeam: {
          id: 4,
          name: 'Arsenal',
          shortName: 'Arsenal',
          tla: 'ARS',
        },
        score: {
          duration: 'REGULAR',
          fullTime: {
            home: null,
            away: null,
          },
          halfTime: {
            home: null,
            away: null,
          },
        },
      };

      const result = mapApiMatchToMatch(mockMatch, 'premier-league');

      expect(result.status).toBe('upcoming');
      expect(result.kickoff).toBeTruthy();
      expect(result.minute).toBeNull();
    });
  });

  describe('mapApiTeamToTeam', () => {
    it('maps API team correctly', () => {
      const mockApiTeam = {
        id: 1,
        name: 'Manchester United',
        logo: 'https://example.com/mun.png',
      };

      const result = mapApiTeamToTeam(mockApiTeam, 'premier-league');

      expect(result.name).toBe('Manchester United');
      expect(result.logo).toBeDefined();
      expect(result.leagueId).toBe('premier-league');
      expect(typeof result.id).toBe('string');
    });
  });

  describe('mapApiLeagueToLeague', () => {
    it('maps API league correctly', () => {
      const mockApiLeague = {
        id: 2021,
        name: 'Premier League',
        logo: 'https://example.com/pl-logo.png',
        country: 'England',
        flag: 'https://example.com/en-flag.png',
      };

      const result = mapApiLeagueToLeague(mockApiLeague);

      expect(result.name).toBe('Premier League');
      expect(result.logo).toBeDefined();
      expect(result.country).toBe('England');
    });
  });

  describe('mapApiEventToMatchEvent', () => {
    it('maps goal event correctly', () => {
      const mockEvent: ApiEvent = {
        time: { elapsed: 25 },
        type: 'Goal',
        detail: 'Normal Goal',
        team: { id: 1, name: 'Manchester United' },
        player: { id: 10, name: 'Scorer Name' },
      };

      const result = mapApiEventToMatchEvent(mockEvent, 1);

      expect(result.minute).toBe("25'");
      expect(result.type).toBe('goal');
      expect(result.playerName).toBe('Scorer Name');
      expect(result.side).toBe('home');
    });

    it('maps substitution event', () => {
      const mockEvent: ApiEvent = {
        time: { elapsed: 60 },
        type: 'subst',
        detail: 'Substitution 1',
        team: { id: 1, name: 'Manchester United' },
        player: { id: 7, name: 'Player Out' },
      };

      const result = mapApiEventToMatchEvent(mockEvent, 1);

      expect(result.type).toBe('substitution');
      expect(result.minute).toBe("60'");
    });

    it('maps yellow card event', () => {
      const mockEvent: ApiEvent = {
        time: { elapsed: 30 },
        type: 'Card',
        detail: 'Yellow Card',
        team: { id: 2, name: 'Manchester City' },
        player: { id: 5, name: 'Defender' },
      };

      const result = mapApiEventToMatchEvent(mockEvent, 1);

      expect(result.type).toBe('yellow-card');
      expect(result.minute).toBe("30'");
      expect(result.side).toBe('away');
    });
  });

  describe('mapApiStatisticsToMatchStatistics', () => {
    it('maps pair of API statistics correctly', () => {
      const homeStats: ApiStatistic = {
        team: { id: 1, name: 'Manchester United' },
        statistics: [
          { type: 'Ball Possession', value: '55%' },
          { type: 'Total Shots', value: 15 },
          { type: 'Shots on Goal', value: 8 },
          { type: 'Corner Kicks', value: 6 },
          { type: 'Fouls', value: 12 },
        ],
      };

      const awayStats: ApiStatistic = {
        team: { id: 2, name: 'Manchester City' },
        statistics: [
          { type: 'Ball Possession', value: '45%' },
          { type: 'Total Shots', value: 11 },
          { type: 'Shots on Goal', value: 4 },
          { type: 'Corner Kicks', value: 3 },
          { type: 'Fouls', value: 9 },
        ],
      };

      const result = mapApiStatisticsToMatchStatistics(homeStats, awayStats);

      expect(result.possession).toEqual([55, 45]);
      expect(result.shots).toEqual([15, 11]);
      expect(result.shotsOnTarget).toEqual([8, 4]);
      expect(result.corners).toEqual([6, 3]);
      expect(result.fouls).toEqual([12, 9]);
    });

    it('handles missing stat keys as 0', () => {
      const homeStats: ApiStatistic = {
        team: { id: 1, name: 'Manchester United' },
        statistics: [],
      };

      const awayStats: ApiStatistic = {
        team: { id: 2, name: 'Manchester City' },
        statistics: [],
      };

      const result = mapApiStatisticsToMatchStatistics(homeStats, awayStats);

      expect(result.possession).toEqual([0, 0]);
      expect(result.shots).toEqual([0, 0]);
      expect(result.shotsOnTarget).toEqual([0, 0]);
      expect(result.corners).toEqual([0, 0]);
      expect(result.fouls).toEqual([0, 0]);
    });
  });
});

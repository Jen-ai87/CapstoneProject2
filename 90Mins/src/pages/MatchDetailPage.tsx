import { useState, useEffect, useRef } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  arrowBackOutline,
  arrowDownOutline,
  arrowUpOutline,
  arrowForwardOutline,
  arrowBackOutline as arrowLeftOutline,
  timeOutline,
  flagOutline,
  football,
  squareOutline,
  swapHorizontalOutline,
  locationOutline,
  peopleOutline,
  cloudyOutline,
} from 'ionicons/icons';
import { Match, MatchEvent, MatchDetail, Team, League, TeamFormMatch } from '../data/types';
import footballApi from '../services/footballApi';
import { 
  mapApiFixtureToMatch, 
  mapApiEventToMatchEvent, 
  mapApiStatisticsToMatchStatistics,
  mapApiTeamToTeam,
  mapApiLeagueToLeague,
  mapApiMatchToMatch,
  ApiFixture,
  ApiEvent,
  ApiStatistic
} from '../services/apiMapper';
import { 
  getHistoricalEventsFromSportsAPIPro, 
  getStatisticsFromSportsAPIPro,
  shouldUseHybridForHistoricalData 
} from '../services/footballApiHybrid';
import { getMatchById } from '../data/matches';
import { getMatchDetailById } from '../data/matchDetails';
import { getTeamById as getStaticTeam } from '../data/teams';
import { getLeagueById as getStaticLeague } from '../data/leagues';
import { getTeamById as getCachedTeamById, getLeagueById as getCachedLeagueById, getAllTeams } from '../data/dataHelpers';
import { getTeamForm } from '../data/teamForm';
import Logger from '../services/logger';
import { showErrorToast } from '../services/toastNotification';
import { useLiveScorePoller } from '../hooks/useLiveScorePoller';
import { usePredictions } from '../hooks/usePredictions';
import './MatchDetailPage.css';

type DetailTab = 'overview' | 'events' | 'stats' | 'predictions';

// Check if we should use mock data
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const logger = new Logger('MatchDetailPage');

const MatchDetailPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const history = useHistory();
  const location = useLocation<{ match?: Match }>();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [liveData, setLiveData] = useState<any | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [homeForm, setHomeForm] = useState<TeamFormMatch[]>([]);
  const [awayForm, setAwayForm] = useState<TeamFormMatch[]>([]);
  const [lastScoreUpdate, setLastScoreUpdate] = useState<Date | null>(null);
  const [liveMinuteDisplay, setLiveMinuteDisplay] = useState<number | null>(null);
  const liveMinuteBaseRef = useRef<number | null>(null);
  const liveMinuteSyncRef = useRef<number | null>(null);

  // Set up live score polling for live matches (only for BSD API)
  const { isActive: isPollingActive } = useLiveScorePoller({
    enabled: !USE_MOCK_DATA && match?.status === 'live',
    initialInterval: 10000, // Poll every 10 seconds during live matches
    onUpdate: (liveMatches: any[]) => {
      // Find this match in the live updates
      const updatedMatch = liveMatches.find((m: any) => 
        m.id?.toString() === matchId || 
        m.id?.toString() === match?.id?.toString()
      );
      
      if (updatedMatch) {
        // Update the match data with new score/minute info
        const mappedMatch = mapApiMatchToMatch(updatedMatch, match?.leagueId || 'INT');
        setMatch((prevMatch) => {
          if (!prevMatch) return mappedMatch;
          return {
            ...prevMatch,
            homeTeam: { ...prevMatch.homeTeam, score: mappedMatch.homeTeam.score },
            awayTeam: { ...prevMatch.awayTeam, score: mappedMatch.awayTeam.score },
            minute: mappedMatch.minute,
            status: mappedMatch.status,
          };
        });
        setLastScoreUpdate(new Date());
      }
    },
  });

  // Fetch predictions for upcoming/live matches
  const { prediction, loading: predictionsLoading } = usePredictions({
    enabled: !USE_MOCK_DATA && match?.status !== 'finished',
    matchId: match?.id?.toString(),
  });

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId]);

  useEffect(() => {
    if (!homeTeam || !awayTeam || !match) return;

    if (USE_MOCK_DATA) {
      setHomeForm(getTeamForm(resolveTeamFormId(homeTeam, match.homeTeam.name)));
      setAwayForm(getTeamForm(resolveTeamFormId(awayTeam, match.awayTeam.name)));
      return;
    }

    const loadForm = async () => {
      const [homeApiForm, awayApiForm] = await Promise.all([
        fetchTeamFormFromApi(homeTeam, match.homeTeam.name),
        fetchTeamFormFromApi(awayTeam, match.awayTeam.name),
      ]);

      setHomeForm(homeApiForm.length > 0 ? homeApiForm : getTeamForm(resolveTeamFormId(homeTeam, match.homeTeam.name)));
      setAwayForm(awayApiForm.length > 0 ? awayApiForm : getTeamForm(resolveTeamFormId(awayTeam, match.awayTeam.name)));
    };

    loadForm();
  }, [homeTeam, awayTeam, match, USE_MOCK_DATA]);

  const extractFixtureId = (idValue: string): string | null => {
    // Accept "fixture-123", "match-123", or raw numeric id
    const cleaned = idValue.replace(/^(fixture|match)-/, '');
    return cleaned ? cleaned : null;
  };

  const buildFallbackTeam = (teamId: string, teamName?: string, crest?: string, leagueId?: string): Team | null => {
    const cachedTeam = getCachedTeamById(teamId);
    const name = teamName || cachedTeam?.name;
    if (!name || !leagueId) return null;
    const abbreviation = cachedTeam?.abbreviation || name.substring(0, 3).toUpperCase();
    return {
      id: teamId,
      name,
      abbreviation,
      leagueId,
      logo: crest || cachedTeam?.logo,
      city: cachedTeam?.city,
      bsdTeamId: cachedTeam?.bsdTeamId,
      bsdApiId: cachedTeam?.bsdApiId,
    };
  };

  const normalizeTeamName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/^(fc|cf|ac|sc|bk|afc|cfc)\s+/i, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const resolveTeamFormId = (team: Team, fallbackName?: string) => {
    const allTeams = getAllTeams();
    const name = (team?.name || fallbackName || '').trim();
    if (!name) return team?.id;

    const normalized = normalizeTeamName(name);
    const matched = allTeams.find(t => {
      const candidate = normalizeTeamName(t.name);
      return candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate);
    });

    return matched?.id || team?.id;
  };

  const buildTeamLogo = (apiId?: number | null): string | null => {
    const token = import.meta.env.VITE_BSD_API_KEY;
    if (!apiId || !token) return null;
    return `https://sports.bzzoiro.com/img/team/${apiId}/?token=${token}`;
  };

  const fetchTeamFormFromApi = async (team: Team, fallbackName?: string): Promise<TeamFormMatch[]> => {
    const teamName = (team?.name || fallbackName || '').trim();
    if (!teamName) return [];

    const teamApiId = team.bsdApiId;
    const normalizedTeamName = normalizeTeamName(teamName);
    const daysBack = 21;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allMatches: Match[] = [];
    for (let i = 0; i <= daysBack; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      try {
        const response = await footballApi.getFixturesByDate(dateStr) as any;
        const matchesArray = response?.matches || response?.data?.matches || [];
        if (Array.isArray(matchesArray)) {
          matchesArray.forEach((apiMatch: any) => {
            const mapped = mapApiMatchToMatch(apiMatch, team.leagueId);
            if (mapped.status === 'finished') {
              allMatches.push(mapped);
            }
          });
        }
      } catch (err) {
      }
    }

    const filtered = allMatches.filter(m => {
      if (teamApiId) {
        return m.homeTeam.apiTeamId === teamApiId || m.awayTeam.apiTeamId === teamApiId ||
          m.homeTeam.bsdApiId === teamApiId || m.awayTeam.bsdApiId === teamApiId;
      }

      const homeName = normalizeTeamName(m.homeTeam.name || '');
      const awayName = normalizeTeamName(m.awayTeam.name || '');
      return homeName === normalizedTeamName || awayName === normalizedTeamName;
    });

    const formMatches = filtered
      .slice(0, 5)
      .map((m) => {
        const isHome = Boolean(
          normalizeTeamName(m.homeTeam.name || '') === normalizedTeamName ||
          (teamApiId && (m.homeTeam.apiTeamId === teamApiId || m.homeTeam.bsdApiId === teamApiId))
        );
        const teamScore = isHome ? (m.homeTeam.score ?? 0) : (m.awayTeam.score ?? 0);
        const oppScore = isHome ? (m.awayTeam.score ?? 0) : (m.homeTeam.score ?? 0);
        const opponentName = isHome ? (m.awayTeam.name || 'Opponent') : (m.homeTeam.name || 'Opponent');
        const opponentLogo = isHome
          ? (m.awayTeam.crest || buildTeamLogo(m.awayTeam.bsdApiId || m.awayTeam.apiTeamId))
          : (m.homeTeam.crest || buildTeamLogo(m.homeTeam.bsdApiId || m.homeTeam.apiTeamId));
        const result: 'W' | 'L' | 'D' = teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'D';

        return {
          id: `form-${m.id}`,
          opponent: opponentName,
          opponentLogo: opponentLogo || '',
          isHome,
          score: teamScore,
          conceded: oppScore,
          result,
        };
      });

    return formMatches;
  };

  const fetchMatchDetails = async () => {
    setLoading(true);
    setError(null);

    const stateMatch = location.state?.match;
    if (stateMatch) {
      setMatch(stateMatch);
      const leagueFromCache = getCachedLeagueById(stateMatch.leagueId) || getStaticLeague(stateMatch.leagueId) || null;
      setLeague(leagueFromCache);
      const home = buildFallbackTeam(
        stateMatch.homeTeam.teamId,
        stateMatch.homeTeam.name,
        stateMatch.homeTeam.crest,
        stateMatch.leagueId
      );
      const away = buildFallbackTeam(
        stateMatch.awayTeam.teamId,
        stateMatch.awayTeam.name,
        stateMatch.awayTeam.crest,
        stateMatch.leagueId
      );
      setHomeTeam(home);
      setAwayTeam(away);

      // Attempt to fetch historical events from SportsAPIPro for past matches
      const fixtureId = extractFixtureId(matchId);
      if (fixtureId && stateMatch.status === 'finished') {
        await fetchHistoricalDataFromAlternativeProvider(fixtureId, stateMatch.homeTeam.apiTeamId);
      }

      // Live details still fetched when match is live
      if (stateMatch.status === 'live') {
        if (fixtureId) {
          await fetchLiveDetails(fixtureId);
        }
      }

      setLoading(false);
      return;
    }
    
    try {
      // Use mock data if flag is enabled
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
        
        const mockMatch = getMatchById(matchId);
        const mockDetail = getMatchDetailById(matchId);
        
        if (!mockMatch) {
          throw new Error('Match not found in mock data');
        }
        
        setMatch(mockMatch);
        setDetail(mockDetail || null);
        
        const mockHomeTeam = getStaticTeam(mockMatch.homeTeam.teamId);
        const mockAwayTeam = getStaticTeam(mockMatch.awayTeam.teamId);
        const mockLeague = getStaticLeague(mockMatch.leagueId);
        
        setHomeTeam(mockHomeTeam || null);
        setAwayTeam(mockAwayTeam || null);
        setLeague(mockLeague || null);
        
        setLoading(false);
        return;
      }
      
      // Real API calls below
      const fixtureId = extractFixtureId(matchId);
      if (!fixtureId) {
        throw new Error('Invalid match ID');
      }

      // Fetch fixture details
      const fixtureResponse = await footballApi.getFixtureById(fixtureId) as any;
      if (!fixtureResponse || fixtureResponse.length === 0) {
        throw new Error('Match not found');
      }

      const apiFixture: ApiFixture = fixtureResponse[0];
      const mappedMatch = mapApiFixtureToMatch(apiFixture);
      setMatch(mappedMatch);

      // Map teams and league
      const leagueId = `${apiFixture.league.name.toLowerCase().replace(/\s+/g, '-')}-${apiFixture.league.id}`;
      setHomeTeam(mapApiTeamToTeam(apiFixture.teams.home, leagueId));
      setAwayTeam(mapApiTeamToTeam(apiFixture.teams.away, leagueId));
      setLeague(mapApiLeagueToLeague(apiFixture.league));

      // Fetch events
      let events: MatchEvent[] = [];
      try {
        const eventsResponse = await footballApi.getFixtureEvents(fixtureId) as any;
        console.log('Events response:', eventsResponse);
        if (eventsResponse && Array.isArray(eventsResponse)) {
          const apiEvents: ApiEvent[] = eventsResponse;
          events = apiEvents.map(evt => mapApiEventToMatchEvent(evt, apiFixture.teams.home.id));
          console.log('Mapped events:', events);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
      }

      // If no events and using BSD, try SportsAPIPro for finished matches
      if (events.length === 0 && shouldUseHybridForHistoricalData() && mappedMatch.status === 'finished') {
        console.log('Trying SportsAPIPro for events...');
        const hybridEventsResponse = await getHistoricalEventsFromSportsAPIPro(fixtureId);
        console.log('Hybrid events response:', hybridEventsResponse);
        if (hybridEventsResponse && Array.isArray(hybridEventsResponse)) {
          const apiEvents: ApiEvent[] = hybridEventsResponse;
          events = apiEvents.map(evt => mapApiEventToMatchEvent(evt, apiFixture.teams.home.id));
          console.log('Hybrid mapped events:', events);
        }
      }

      // Fetch statistics
      let statistics = null;
      try {
        const statsResponse = await footballApi.getFixtureStatistics(fixtureId) as any;
        console.log('Stats response:', statsResponse);
        if (statsResponse && Array.isArray(statsResponse) && statsResponse.length >= 2) {
          const apiStats: ApiStatistic[] = statsResponse;
          statistics = mapApiStatisticsToMatchStatistics(apiStats[0], apiStats[1]);
          console.log('Mapped statistics:', statistics);
        }
      } catch (err) {
        console.error('Error fetching statistics:', err);
      }

      // If no statistics and using BSD, try SportsAPIPro for finished matches
      if (!statistics && shouldUseHybridForHistoricalData() && mappedMatch.status === 'finished') {
        const hybridStatsResponse = await getStatisticsFromSportsAPIPro(fixtureId);
        if (hybridStatsResponse && Array.isArray(hybridStatsResponse) && hybridStatsResponse.length >= 2) {
          const apiStats: ApiStatistic[] = hybridStatsResponse;
          statistics = mapApiStatisticsToMatchStatistics(apiStats[0], apiStats[1]);
        }
      }

      // Create match detail (always set, even if events or statistics are empty)
      const matchDetail: MatchDetail = {
        matchId: mappedMatch.id,
        events,
        statistics: statistics || undefined,
      };
      setDetail(matchDetail);

      // Fetch live details if match is live
      if (mappedMatch.status === 'live') {
        await fetchLiveDetails(fixtureId);
      }

    } catch (err) {
      logger.error('Error fetching match details:', err);
      setError('Failed to load match details. Please try again.');
      showErrorToast('FETCH_ERROR', 'Failed to load match details. Please try again.');

      // Fallback: use match data passed from matches page (helps past matches)
    } finally {
      setLoading(false);
    }
  };

  const isLive = match?.status === 'live';

  const getDisplayScore = () => {
    // For live matches, prioritize liveData score if available
    if (isLive && liveData) {
      const homeScore = liveData.home_score ?? liveData.homeScore ?? liveData.goals?.fulltime?.home ?? match.homeTeam.score;
      const awayScore = liveData.away_score ?? liveData.awayScore ?? liveData.goals?.fulltime?.away ?? match.awayTeam.score;
      return {
        home: homeScore !== null ? homeScore : '–',
        away: awayScore !== null ? awayScore : '–'
      };
    }
    // For non-live matches, use match state
    return {
      home: match?.homeTeam.score !== null && match ? match.homeTeam.score : '–',
      away: match?.awayTeam.score !== null && match ? match.awayTeam.score : '–'
    };
  };

  const fetchLiveDetails = async (fixtureId: string) => {
    try {
      const liveResponse = await footballApi.getLiveMatchById?.(fixtureId) as any;
      const minuteValue = typeof liveResponse?.current_minute === 'number'
        ? liveResponse.current_minute
        : typeof liveResponse?.current_minute === 'string'
          ? parseInt(liveResponse.current_minute, 10)
          : null;

      if (minuteValue !== null && !Number.isNaN(minuteValue)) {
        liveMinuteBaseRef.current = minuteValue;
        liveMinuteSyncRef.current = Date.now();
        setLiveMinuteDisplay(minuteValue);
      }
      
      // Update match score from liveData if available
      if (liveResponse && (liveResponse.home_score !== undefined || liveResponse.homeScore !== undefined)) {
        setMatch((prevMatch) => {
          if (!prevMatch) return prevMatch;
          const homeScore = liveResponse.home_score ?? liveResponse.homeScore;
          const awayScore = liveResponse.away_score ?? liveResponse.awayScore;
          return {
            ...prevMatch,
            homeTeam: { ...prevMatch.homeTeam, score: homeScore },
            awayTeam: { ...prevMatch.awayTeam, score: awayScore },
          };
        });
      }
      
      setLiveData(liveResponse || null);
    } catch (err) {
    }
  };

  const fetchHistoricalDataFromAlternativeProvider = async (fixtureId: string, homeTeamApiId?: number) => {
    try {
      // Fetch events
      console.log('Fetching historical events from alternative provider for fixture:', fixtureId);
      const eventsResponse = await getHistoricalEventsFromSportsAPIPro(fixtureId);
      console.log('Alternative provider events response:', eventsResponse);
      let events: MatchEvent[] = [];
      
      if (eventsResponse && Array.isArray(eventsResponse)) {
        const apiEvents: ApiEvent[] = eventsResponse;
        // Use homeTeamApiId if available, otherwise try to infer from first event
        const homeId = homeTeamApiId || (apiEvents.length > 0 ? apiEvents[0].team.id : 0);
        events = apiEvents.map(evt => mapApiEventToMatchEvent(evt, homeId));
        console.log('Alternative provider mapped events:', events);
      }

      // Fetch statistics
      console.log('Fetching historical statistics from alternative provider...');
      let statistics = null;
      const statsResponse = await getStatisticsFromSportsAPIPro(fixtureId);
      console.log('Alternative provider stats response:', statsResponse);
      
      if (statsResponse && Array.isArray(statsResponse) && statsResponse.length >= 2) {
        const apiStats: ApiStatistic[] = statsResponse;
        statistics = mapApiStatisticsToMatchStatistics(apiStats[0], apiStats[1]);
        console.log('Alternative provider mapped statistics:', statistics);
      }

      // Always set detail with events and statistics (even if empty)
      const matchDetail: MatchDetail = {
        matchId: match?.id || fixtureId,
        events,
        statistics: statistics || undefined,
      };
      console.log('Setting detail state:', matchDetail);
      setDetail(matchDetail);
    } catch (err) {
      console.error('Error in fetchHistoricalDataFromAlternativeProvider:', err);
    }
  };

  useEffect(() => {
    if (!match || match.status !== 'live') {
      setLiveData(null);
      setLiveMinuteDisplay(null);
      liveMinuteBaseRef.current = null;
      liveMinuteSyncRef.current = null;
      return;
    }

    const fixtureId = extractFixtureId(matchId);
    if (!fixtureId) return;

    fetchLiveDetails(fixtureId);
    const intervalId = window.setInterval(() => {
      fetchLiveDetails(fixtureId);
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [match?.status, matchId]);

  useEffect(() => {
    if (!isLive) return undefined;

    const tickId = window.setInterval(() => {
      if (liveMinuteBaseRef.current === null || liveMinuteSyncRef.current === null) return;
      const elapsedMs = Date.now() - liveMinuteSyncRef.current;
      const offsetMinutes = Math.floor(elapsedMs / 60000);
      const offsetSeconds = Math.floor((elapsedMs % 60000) / 1000);
      const nextMinute = liveMinuteBaseRef.current + offsetMinutes + (offsetSeconds > 0 ? offsetSeconds / 60 : 0);
      setLiveMinuteDisplay((prev) => (prev === nextMinute ? prev : nextMinute));
    }, 1000);

    return () => window.clearInterval(tickId);
  }, [isLive]);

  /* ── Navigation handlers ── */
  const handleTeamClick = (teamId: string) => {
    history.push(`/club/${teamId}`);
  };

  /* ── Event icon helper ── */
  const eventIcon = (evt: MatchEvent) => {
    switch (evt.type) {
      case 'goal':
        return <IonIcon icon={football} className="event-icon event-icon--goal" />;
      case 'yellow-card':
        return <span className="event-card-icon event-card-icon--yellow" />;
      case 'red-card':
        return <span className="event-card-icon event-card-icon--red" />;
      case 'substitution':
        return <IonIcon icon={squareOutline} className="event-icon event-icon--sub" />;
      default:
        return null;
    }
  };

  const formatLiveIncident = (incident: any): string => {
    const type = (incident?.type || '').toString().toLowerCase();
    const playerName = incident?.player_name || incident?.player || incident?.scorer || 'Player';

    if (type === 'goal') {
      return `Goal - ${playerName}`;
    }

    if (type === 'card') {
      return playerName;
    }

    if (type === 'substitution') {
      const playerIn = incident?.player_in || incident?.player_in_name || 'Sub In';
      const playerOut = incident?.player_out || incident?.player_out_name || 'Sub Out';
      return `Substitution - ${playerIn} for ${playerOut}`;
    }

    return `${incident?.type || 'Update'} - ${playerName}`;
  };

  const liveIncidentIcon = (incident: any) => {
    const type = (incident?.type || '').toString().toLowerCase();

    if (type === 'goal') {
      return <IonIcon icon={football} className="event-icon event-icon--goal" />;
    }

    if (type === 'card') {
      const cardType = (incident?.card_type || '').toString().toLowerCase();
      const isSecondYellow = cardType.includes('second') || cardType.includes('2') || cardType.includes('yellowred');
      if (isSecondYellow) {
        return (
          <span className="event-card-stack">
            <span className="event-card-icon event-card-icon--yellow event-card-icon--stacked" />
            <span className="event-card-icon event-card-icon--red" />
          </span>
        );
      }
      if (cardType === 'red') {
        return <span className="event-card-icon event-card-icon--red" />;
      }
      return <span className="event-card-icon event-card-icon--yellow" />;
    }

    if (type === 'substitution') {
      return null;
    }

    return <IonIcon icon={timeOutline} className="event-icon" />;
  };

  const formatOrdinal = (value: number): string => {
    const mod100 = value % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
    switch (value % 10) {
      case 1:
        return `${value}st`;
      case 2:
        return `${value}nd`;
      case 3:
        return `${value}rd`;
      default:
        return `${value}th`;
    }
  };

  const renderLiveIncidentContent = (incident: any) => {
    const type = (incident?.type || '').toString().toLowerCase();

    if (type === 'goal') {
      const playerName = incident?.player_name || incident?.player || incident?.scorer || 'Player';
      // Assist removed: not supported by live API
      const goalType = (incident?.goal_type || incident?.type_detail || '').toString().toLowerCase();
      const isPenalty = goalType.includes('pen') || goalType.includes('penalty');
      const homeScore = typeof incident?.home_score === 'number' ? incident.home_score : null;
      const awayScore = typeof incident?.away_score === 'number' ? incident.away_score : null;
      const totalGoals = homeScore !== null && awayScore !== null ? homeScore + awayScore : null;

      const isHomeGoal = Boolean(incident?.is_home);

      return (
        <>
          <span className="event-player">
            {playerName}
            {totalGoals !== null && (
              <span className="goal-meta">
                {' '}
                <span className="goal-score">
                  (
                  <span className={isHomeGoal ? 'goal-score-home' : 'goal-score-away'}>
                    {homeScore}
                  </span>
                  {' - '}
                  <span className={isHomeGoal ? 'goal-score-away' : 'goal-score-home'}>
                    {awayScore}
                  </span>
                  )
                </span>
              </span>
            )}
          </span>
          {/* Assist removed: not supported by live API */}
          {isPenalty && (
            <span className="event-subtext">Penalty</span>
          )}
        </>
      );
    }

    if (type === 'substitution') {
      const playerIn = incident?.player_in || incident?.player_in_name || 'Sub In';
      const playerOut = incident?.player_out || incident?.player_out_name || 'Sub Out';

      return (
        <>
          <span className="event-player sub-player sub-player--in">
            {playerIn}
          </span>
          <span className="event-player sub-player sub-player--out">
            {playerOut}
          </span>
        </>
      );
    }

    return <span className="event-player">{formatLiveIncident(incident)}</span>;
  };

  const getRedCardCount = (isHomeTeam: boolean): number => {
    if (!liveData?.incidents || !Array.isArray(liveData.incidents)) return 0;
    return liveData.incidents.filter((incident: any) => {
      if (!incident || incident.type !== 'card') return false;
      const cardType = (incident.card_type || '').toString().toLowerCase();
      const isRed = cardType.includes('red') || cardType.includes('second') || cardType.includes('yellowred') || cardType.includes('2');
      return isRed && Boolean(incident.is_home) === isHomeTeam;
    }).length;
  };

  const calculateHalftimeScore = () => {
    if (!liveData?.incidents || !Array.isArray(liveData.incidents)) return null;
    
    let homeGoals = 0;
    let awayGoals = 0;
    
    liveData.incidents.forEach((incident: any) => {
      if (incident?.type === 'goal') {
        const minute = parseInt(String(incident.minute), 10);
        // Count goals before halftime (before minute 45)
        if (minute < 45) {
          if (Boolean(incident.is_home)) {
            homeGoals++;
          } else {
            awayGoals++;
          }
        }
      }
    });
    
    return { home: homeGoals, away: awayGoals };
  };

  const getGoalScorers = (isHomeTeam: boolean): string[] => {
    if (!liveData?.incidents || !Array.isArray(liveData.incidents)) return [];
    // Collect all goals with player names, minutes, and own goal info
    const goals = liveData.incidents
      .filter((incident: any) => incident?.type === 'goal' && Boolean(incident.is_home) === isHomeTeam)
      .map((incident: any) => {
        const playerName = incident?.player_name || incident?.player || incident?.scorer || 'Player';
        const minute = incident?.minute ? `${incident.minute}'` : '';
        const goalType = (incident?.goal_type || incident?.type_detail || '').toString().toLowerCase();
        const isOwnGoal = goalType.includes('own goal') || goalType.includes('og');
        return {
          playerName: isOwnGoal ? `${playerName} (OG)` : playerName,
          minute
        };
      });

    // Group by player name
    const groupedGoals: Record<string, string[]> = {};
    goals.forEach((goal: { playerName: string; minute: string }) => {
      if (!groupedGoals[goal.playerName]) {
        groupedGoals[goal.playerName] = [];
      }
      if (goal.minute) {
        groupedGoals[goal.playerName].push(goal.minute);
      }
    });

    // Format as "PlayerName minute1, minute2, minute3"
    return Object.entries(groupedGoals).map(([playerName, minutes]) => {
      return minutes.length > 0 ? `${playerName} ${minutes.join(', ')}` : playerName;
    });
  };

  const getFinishedMatchGoalScorers = (isHomeTeam: boolean): string[] => {
    if (!detail?.events || !Array.isArray(detail.events)) return [];
    // Collect all goals with player names, minutes, and own goal info
    const goals = detail.events
      .filter((evt: MatchEvent) => evt.type === 'goal' && ((isHomeTeam && evt.side === 'home') || (!isHomeTeam && evt.side === 'away')))
      .map((evt: MatchEvent) => {
        const playerName = evt.playerName || 'Player';
        const minute = evt.minute ? `${evt.minute}'` : '';
        // Try to detect own goal from playerName or add a property to MatchEvent if available
        const isOwnGoal = typeof evt.playerName === 'string' && (evt.playerName.toLowerCase().includes('og') || evt.playerName.toLowerCase().includes('own goal'));
        return {
          playerName: isOwnGoal ? `${playerName} (OG)` : playerName,
          minute
        };
      });

    // Group by player name
    const groupedGoals: Record<string, string[]> = {};
    goals.forEach(goal => {
      if (!groupedGoals[goal.playerName]) {
        groupedGoals[goal.playerName] = [];
      }
      if (goal.minute) {
        groupedGoals[goal.playerName].push(goal.minute);
      }
    });

    // Format as "PlayerName minute1, minute2, minute3"
    return Object.entries(groupedGoals).map(([playerName, minutes]) => {
      return minutes.length > 0 ? `${playerName} ${minutes.join(', ')}` : playerName;
    });
  };

  const displayGoalScorers = (isHomeTeam: boolean): string[] => {
    if (isLive && liveData) {
      return getGoalScorers(isHomeTeam);
    }
    if (match?.status === 'finished') {
      return getFinishedMatchGoalScorers(isHomeTeam);
    }
    return [];
  };

  /* ── Statistics rows (label + home/away values) ── */
  const statRows = detail && detail.statistics
    ? [
        { label: 'Shots', home: detail.statistics.shots[0], away: detail.statistics.shots[1] },
        { label: 'Shots on Target', home: detail.statistics.shotsOnTarget[0], away: detail.statistics.shotsOnTarget[1] },
        { label: 'Corners', home: detail.statistics.corners[0], away: detail.statistics.corners[1] },
        { label: 'Fouls', home: detail.statistics.fouls[0], away: detail.statistics.fouls[1] },
      ]
    : [];

  /* ── Summary stats for overview tab (only important ones) ── */
  const summaryStatRows = detail && detail.statistics
    ? [
        { label: 'Shots', home: detail.statistics.shots[0], away: detail.statistics.shots[1] },
        { label: 'Shots on Target', home: detail.statistics.shotsOnTarget[0], away: detail.statistics.shotsOnTarget[1] },
        { label: 'Corners', home: detail.statistics.corners[0], away: detail.statistics.corners[1] },
        { label: 'Fouls', home: detail.statistics.fouls[0], away: detail.statistics.fouls[1] },
      ]
    : [];

  /* ── Get key stats from live_stats (xG, big chances, etc.) ── */
  const getKeyLiveStats = () => {
    if (!liveData?.live_stats) return null;
    const keyStatNames = [
      'expected_goals', 'xg',
      'big_chances', 'big_chances_missed',
      'accurate_passes', 'accurate_pass',
      'offsides', 'offside',
      'possession', 'ball_possession',
    ];
    const filtered: any = { home: {}, away: {} };
    keyStatNames.forEach((statName) => {
      const allKeys = Object.keys(liveData.live_stats.home || {});
      const matchingKey = allKeys.find((k) => k.toLowerCase().includes(statName.toLowerCase()));
      if (matchingKey) {
        filtered.home[matchingKey] = liveData.live_stats.home?.[matchingKey];
        filtered.away[matchingKey] = liveData.live_stats.away?.[matchingKey];
      }
    });
    return Object.keys(filtered.home).length > 0 ? filtered : null;
  };

  const getPossessionStats = () => {
    if (!liveData?.live_stats) return null;
    const possessionKeys = ['possession', 'ball_possession'];
    const allKeys = Object.keys(liveData.live_stats.home || {});
    const matchingKey = allKeys.find((k) => possessionKeys.some(pk => k.toLowerCase().includes(pk.toLowerCase())));
    if (matchingKey) {
      const homePoss = parseFloat(String(liveData.live_stats.home?.[matchingKey] || 0));
      const awayPoss = parseFloat(String(liveData.live_stats.away?.[matchingKey] || 0));
      return { home: homePoss, away: awayPoss, key: matchingKey };
    }
    return null;
  };

  const getOtherKeyLiveStats = () => {
    const keyStats = getKeyLiveStats();
    if (!keyStats) return null;
    const filtered: any = { home: {}, away: {} };
    const possessionKeys = ['possession', 'ball_possession'];
    
    Object.keys(keyStats.home || {}).forEach((key: string) => {
      // Skip possession stats
      if (!possessionKeys.some(pk => key.toLowerCase().includes(pk.toLowerCase()))) {
        filtered.home[key] = keyStats.home[key];
        filtered.away[key] = keyStats.away[key];
      }
    });
    
    return Object.keys(filtered.home).length > 0 ? filtered : null;
  };

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'events', label: 'Events' },
    { key: 'stats', label: 'Stats' },
    { key: 'predictions', label: 'Predictions' },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="match-detail-page">
        <button className="back-btn" onClick={() => history.push('/matches')}>
          <IonIcon icon={arrowBackOutline} />
          <span>Back to Matches</span>
        </button>
        <div className="detail-loading">
          <IonSpinner name="crescent" />
          <p>Loading match details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !match || !homeTeam || !awayTeam || !league) {
    return (
      <div className="match-detail-page">
        <button className="back-btn" onClick={() => history.push('/matches')}>
          <IonIcon icon={arrowBackOutline} />
          <span>Back to Matches</span>
        </button>
        <div className="detail-error">
          <p className="error-message">{error || 'Match not found'}</p>
          <button className="retry-button" onClick={fetchMatchDetails}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="match-detail-page">
      {/* Back button */}
      <button className="back-btn" onClick={() => history.push('/matches')}>
        <IonIcon icon={arrowBackOutline} />
        <span>Back to Matches</span>
      </button>

      {/* ── Match header ── */}
      <div className="detail-header">
        {/* Teams + score */}
        <div className="detail-teams-row">
          <div className="detail-team" onClick={() => handleTeamClick(homeTeam.id)} style={{ cursor: 'pointer' }}>
            <div className="detail-team-header">
              <div className="detail-team-logo-wrap">
                {homeTeam.logo && (
                  <img src={homeTeam.logo} alt={homeTeam.name} className="detail-team-logo" loading="lazy" />
                )}
              </div>
              <span className="detail-team-name">{homeTeam.name}</span>
            </div>
            {displayGoalScorers(true).length > 0 && (
              <div className="team-goal-list">
                {displayGoalScorers(true).map((scorer) => (
                  <span key={scorer} className="team-goal-item">{scorer}</span>
                ))}
              </div>
            )}
            {isLive && liveData && getRedCardCount(true) > 0 && (
              <span className="team-red-card" aria-label="Red card" />
            )}
          </div>

          <div className="detail-score-wrapper">
            <span className={`detail-score ${isLive ? 'live' : ''}`}>
              {match.status === 'upcoming' 
                ? '– : –'
                : `${getDisplayScore().home} : ${getDisplayScore().away}`
              }
            </span>

            {/* Live update indicator */}
            {isPollingActive && lastScoreUpdate && (
              <div className="score-update-badge" title={`Updated: ${lastScoreUpdate.toLocaleTimeString()}`}>
                <span className="live-dot"></span>
              </div>
            )}
            
            {/* Time/Status below score */}
            {isLive && (
              <div className="detail-time-container">
                <span className="detail-time-badge">
                  {/* Show timer as MM:SS (XX:XX) for live matches */}
                  {isLive && liveMinuteDisplay !== null
                    ? (() => {
                        const min = Math.floor(liveMinuteDisplay);
                        const sec = Math.floor((liveMinuteDisplay - min) * 60);
                        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                      })()
                    : match.minute
                    ? match.minute.replace(/[^\d+]/g, '').split('+')[0].padStart(2, '0') + ':00'
                    : '00:00'
                  }
                </span>
                {((liveMinuteDisplay !== null && liveMinuteDisplay > 90) || (match.minute && match.minute.includes('+'))) && (
                  <span className="detail-extra-time-badge">
                    {liveMinuteDisplay !== null && liveMinuteDisplay > 90
                      ? `+${Math.floor(liveMinuteDisplay - 90)}`
                      : match.minute
                      ? `+${match.minute.split('+')[1]}`
                      : ''
                    }
                  </span>
                )}
              </div>
            )}
            {match.status === 'finished' && (
              <span className="detail-time-badge">FT</span>
            )}
            {match.status === 'upcoming' && match.kickoff && (
              <span className="detail-time-badge">{match.kickoff}</span>
            )}

            {/* Soccer ball icon if there are goals */}
            {(displayGoalScorers(true).length > 0 || displayGoalScorers(false).length > 0) && (
              <div className="score-goal-indicator">
                <IonIcon icon={football} className="center-goal-icon" />
              </div>
            )}
          </div>

          <div className="detail-team" onClick={() => handleTeamClick(awayTeam.id)} style={{ cursor: 'pointer' }}>
            <div className="detail-team-header">
              <div className="detail-team-logo-wrap">
                {awayTeam.logo && (
                  <img src={awayTeam.logo} alt={awayTeam.name} className="detail-team-logo" loading="lazy" />
                )}
              </div>
              <span className="detail-team-name">{awayTeam.name}</span>
            </div>
            {displayGoalScorers(false).length > 0 && (
              <div className="team-goal-list">
                {displayGoalScorers(false).map((scorer) => (
                  <span key={scorer} className="team-goal-item">{scorer}</span>
                ))}
              </div>
            )}
            {isLive && liveData && getRedCardCount(false) > 0 && (
              <span className="team-red-card" aria-label="Red card" />
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="detail-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`detail-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="detail-content">
        {/* OVERVIEW tab — shows both statistics + events */}
        {activeTab === 'overview' && (
          <>
            {/* Live updates card */}
            {isLive && liveData && (
              <div className="detail-card">
                <h4 className="team-form-title">Live Updates</h4>

                {Array.isArray(liveData.incidents) && liveData.incidents.length > 0 && (
                  <div className="events-timeline">
                    {(() => {
                      const incidents = liveData.incidents || [];
                      const haltimeScore = calculateHalftimeScore();
                      const currentMinute = liveMinuteDisplay !== null ? liveMinuteDisplay : (liveData.current_minute ? parseInt(String(liveData.current_minute), 10) : 0);
                      const showHT = haltimeScore && currentMinute >= 45;
                      
                      // Split incidents by halftime and sort by minute ascending
                      const firstHalf = incidents
                        .filter((inc: any) => {
                          const minute = parseInt(String(inc.minute), 10);
                          return minute < 45;
                        })
                        .sort((a: any, b: any) => {
                          const minA = parseInt(String(a.minute), 10);
                          const minB = parseInt(String(b.minute), 10);
                          return minA - minB;
                        });
                      
                      const secondHalf = incidents
                        .filter((inc: any) => {
                          const minute = parseInt(String(inc.minute), 10);
                          return minute >= 45;
                        })
                        .sort((a: any, b: any) => {
                          const minA = parseInt(String(a.minute), 10);
                          const minB = parseInt(String(b.minute), 10);
                          return minA - minB;
                        });
                      
                      return (
                        <>
                          {/* First half incidents (appear at bottom due to column-reverse) */}
                          {firstHalf.map((incident: any, idx: number) => {
                            const isSubstitution = (incident?.type || '').toString().toLowerCase() === 'substitution';
                            return (
                              <div
                                key={`${incident.type}-${incident.minute}-${idx}`}
                                className={`event-item ${incident.is_home ? 'home' : 'away'}`}
                              >
                                <div className="event-content">
                                  <span className="event-minute">{(() => {
                                    if (!incident.minute) return '';
                                    const minuteStr = String(incident.minute);
                                    if (minuteStr.toUpperCase() === 'HT' || minuteStr.toUpperCase() === 'FT') return minuteStr.toUpperCase();
                                    const matchNum = minuteStr.match(/\d+/);
                                    return matchNum ? matchNum[0] : '';
                                  })()}</span>
                                  {liveIncidentIcon(incident)}
                                  {isSubstitution && (
                                    <div className="sub-arrows-wrapper">
                                      <IonIcon icon={arrowForwardOutline} className="sub-arrow" />
                                      <IonIcon icon={arrowLeftOutline} className="sub-arrow" />
                                    </div>
                                  )}
                                  <div className="event-text">
                                    {renderLiveIncidentContent(incident)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Halftime divider */}
                          {showHT && (
                            <div className="halftime-divider">
                              <div className="halftime-line"></div>
                              <div className="halftime-content">
                                <span className="halftime-label">HT</span>
                                <span className="halftime-score">
                                  {haltimeScore.home} : {haltimeScore.away}
                                </span>
                              </div>
                              <div className="halftime-line"></div>
                            </div>
                          )}
                          
                          {/* Second half incidents (appear at top due to column-reverse) */}
                          {secondHalf.map((incident: any, idx: number) => {
                            const isSubstitution = (incident?.type || '').toString().toLowerCase() === 'substitution';
                            return (
                              <div
                                key={`${incident.type}-${incident.minute}-${idx}`}
                                className={`event-item ${incident.is_home ? 'home' : 'away'}`}
                              >
                                <div className="event-content">
                                  <span className="event-minute">{(() => {
                                    if (!incident.minute) return '';
                                    const minuteStr = String(incident.minute);
                                    if (minuteStr.toUpperCase() === 'HT' || minuteStr.toUpperCase() === 'FT') return minuteStr.toUpperCase();
                                    const matchNum = minuteStr.match(/\d+/);
                                    return matchNum ? matchNum[0] : '';
                                  })()}</span>
                                  {liveIncidentIcon(incident)}
                                  {isSubstitution && (
                                    <div className="sub-arrows-wrapper">
                                      <IonIcon icon={arrowForwardOutline} className="sub-arrow" />
                                      <IonIcon icon={arrowLeftOutline} className="sub-arrow" />
                                    </div>
                                  )}
                                  <div className="event-text">
                                    {renderLiveIncidentContent(incident)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Show only key live stats */}
                {(getPossessionStats() || getOtherKeyLiveStats()) && (
                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Key Stats</h4>
                    
                    {/* Ball Possession Bar - Always first if available */}
                    {getPossessionStats() && (
                      <>
                        <div className="possession-bar-container" style={{ marginBottom: '16px' }}>
                          <div className="possession-label" style={{ textAlign: 'center', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ball Possession</div>
                          <div className="possession-bar">
                            <div
                              className="possession-bar-fill home"
                              style={{ width: `${getPossessionStats()!.home}%` }}
                            >
                              {getPossessionStats()!.home > 15 && <span className="possession-percent-home">{Math.round(getPossessionStats()!.home)}%</span>}
                            </div>
                            <div
                              className="possession-bar-fill away"
                              style={{ width: `${getPossessionStats()!.away}%` }}
                            >
                              {getPossessionStats()!.away > 15 && <span className="possession-percent-away">{Math.round(getPossessionStats()!.away)}%</span>}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Other key stats */}
                    {getOtherKeyLiveStats() && (
                      <>
                        {Object.keys(getOtherKeyLiveStats()!.home || {}).map((key: string) => {
                          const homeVal = parseFloat(String(getOtherKeyLiveStats()!.home?.[key])) || 0;
                          const awayVal = parseFloat(String(getOtherKeyLiveStats()!.away?.[key])) || 0;
                          const homeHigher = homeVal > awayVal;
                          const awayHigher = awayVal > homeVal;
                          return (
                            <div key={key} className="stat-row">
                              <span className={`stat-row-value home ${homeHigher ? 'highlighted' : ''}`}>
                                {getOtherKeyLiveStats()!.home?.[key] ?? '-'}
                              </span>
                              <span className="stat-row-label">{key.replace(/_/g, ' ')}</span>
                              <span className={`stat-row-value away ${awayHigher ? 'highlighted away' : ''}`}>
                                {getOtherKeyLiveStats()!.away?.[key] ?? '-'}
                              </span>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Summary Match Statistics card for overview (only basic stats) */}
            {!isLive && detail && detail.statistics && (
              <div className="detail-card">
              {/* Possession bar */}
              <div className="possession-row">
                <span className="possession-value home">{detail.statistics.possession[0]}%</span>
                <span className="possession-label">Possession</span>
                <span className="possession-value away">{detail.statistics.possession[1]}%</span>
              </div>
              <div className="possession-bar">
                <div
                  className="possession-bar-fill home"
                  style={{ width: `${detail.statistics.possession[0]}%` }}
                />
                <div
                  className="possession-bar-fill away"
                  style={{ width: `${detail.statistics.possession[1]}%` }}
                />
              </div>

              {/* Stat rows */}
              {summaryStatRows.map((row) => (
                <div key={row.label} className="stat-row">
                  <span className="stat-row-value home">{row.home}</span>
                  <span className="stat-row-label">{row.label}</span>
                  <span className="stat-row-value away">{row.away}</span>
                </div>
              ))}
              </div>
            )}

            {/* Match Events card */}
            {detail && (
              <div className="detail-card">
              <h4 className="team-form-title">Match Events</h4>
              <div className="events-timeline">
                {detail.events.map((evt) => (
                  <div
                    key={evt.id}
                    className={`event-item ${evt.side === 'home' ? 'home' : 'away'}`}
                  >
                    <div className="event-content">
                      {eventIcon(evt)}
                      <div className="event-text">
                        <span className="event-player">{evt.playerName}</span>
                        <span className="event-minute">
                          {(() => {
                            if (!evt.minute) return '';
                            if (
                              evt.minute === 'HT' ||
                              evt.minute.toUpperCase() === 'HT' ||
                              evt.minute.replace(/\s+/g, '') === '45+0' ||
                              evt.minute.replace(/\s+/g, '') === '45' ||
                              evt.minute.replace(/\s+/g, '').startsWith('45+')
                            ) {
                              return 'HT';
                            }
                            const matchNum = String(evt.minute).match(/\d+/);
                            return matchNum ? matchNum[0] : '';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            )}

            {/* Stadium Info card */}
            <div className="detail-card">
              <div className="stadium-info-grid">
                <div className="stadium-info-item">
                  <IonIcon icon={locationOutline} className="stadium-info-icon" />
                  <div className="stadium-info-text">
                    <span className="stadium-info-label">Stadium</span>
                    <span className="stadium-info-value">{match.venue}</span>
                    {homeTeam.city && league && (
                      <span className="stadium-info-location">{homeTeam.city}, {league.country}</span>
                    )}
                  </div>
                </div>
                <div className="stadium-info-item">
                  <IonIcon icon={peopleOutline} className="stadium-info-icon" />
                  <div className="stadium-info-text">
                    <span className="stadium-info-label">Capacity</span>
                    <span className="stadium-info-value">45,000</span>
                  </div>
                </div>
                <div className="stadium-info-item">
                  <IonIcon icon={cloudyOutline} className="stadium-info-icon" />
                  <div className="stadium-info-text">
                    <span className="stadium-info-label">Weather</span>
                    <span className="stadium-info-value">Partly Cloudy, 18°C</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Form card */}
            <div className="detail-card">
              <h4 className="team-form-title">Team Form</h4>
              <div className="team-form-container">
                {/* Home Team Form */}
                <div className="team-form-section">
                  <div className="form-matches">
                    {(homeForm.length > 0 ? homeForm : getTeamForm(resolveTeamFormId(homeTeam, match.homeTeam.name)))
                      .slice()
                      .reverse()
                      .map((match, idx) => {
                      const isLatest = idx === 0;
                      const resultColor = match.result === 'W' ? 'green' : match.result === 'L' ? 'red' : 'gray';
                      return (
                        <div key={match.id} className="form-match">
                          {match.isHome ? (
                            <>
                              <img src={homeTeam.logo} alt={homeTeam.name} className="form-team-logo" loading="lazy" />
                              <div className={`form-score score-${resultColor} ${isLatest ? 'latest' : ''}`}>
                                {match.score}-{match.conceded}
                              </div>
                              <img src={match.opponentLogo} alt="opponent" className="form-opponent-logo" loading="lazy" />
                            </>
                          ) : (
                            <>
                              <img src={match.opponentLogo} alt="opponent" className="form-opponent-logo" />
                              <div className={`form-score score-${resultColor} ${isLatest ? 'latest' : ''}`}>
                                {match.score}-{match.conceded}
                              </div>
                              <img src={homeTeam.logo} alt={homeTeam.name} className="form-team-logo" />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Away Team Form */}
                <div className="team-form-section">
                  <div className="form-matches">
                    {(awayForm.length > 0 ? awayForm : getTeamForm(resolveTeamFormId(awayTeam, match.awayTeam.name)))
                      .slice()
                      .reverse()
                      .map((match, idx) => {
                      const isLatest = idx === 0;
                      const resultColor = match.result === 'W' ? 'green' : match.result === 'L' ? 'red' : 'gray';
                      return (
                        <div key={match.id} className="form-match">
                          {match.isHome ? (
                            <>
                              <img src={awayTeam.logo} alt={awayTeam.name} className="form-team-logo" />
                              <div className={`form-score score-${resultColor} ${isLatest ? 'latest' : ''}`}>
                                {match.score}-{match.conceded}
                              </div>
                              <img src={match.opponentLogo} alt="opponent" className="form-opponent-logo" />
                            </>
                          ) : (
                            <>
                              <img src={match.opponentLogo} alt="opponent" className="form-opponent-logo" loading="lazy" />
                              <div className={`form-score score-${resultColor} ${isLatest ? 'latest' : ''}`}>
                                {match.score}-{match.conceded}
                              </div>
                              <img src={awayTeam.logo} alt={awayTeam.name} className="form-team-logo" loading="lazy" />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* EVENTS tab */}
        {activeTab === 'events' && (
          <div className="detail-card">
            <div className="events-timeline">
              {/* Show live incidents first (if match is live or finished with incident data) */}
              {Array.isArray(liveData?.incidents) && liveData.incidents.length > 0 && (
                <>
                  {liveData.incidents.map((incident: any, idx: number) => {
                    const isSubstitution = (incident?.type || '').toString().toLowerCase() === 'substitution';
                    return (
                      <div
                        key={`live-${incident.type}-${incident.minute}-${idx}`}
                        className={`event-item ${incident.is_home ? 'home' : 'away'}`}
                      >
                        <div className="event-content">
                          <span className="event-minute">{incident.minute ? String(incident.minute).replace(/['"]/g, '').replace(/[^0-9]/g, '') : '--'}</span>
                          {liveIncidentIcon(incident)}
                          {isSubstitution && (
                            <div className="sub-arrows-wrapper">
                              <IonIcon icon={arrowForwardOutline} className="sub-arrow" />
                              <IonIcon icon={arrowLeftOutline} className="sub-arrow" />
                            </div>
                          )}
                          <div className="event-text">
                            {renderLiveIncidentContent(incident)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Show regular match events from detail */}
              {detail?.events && detail.events.length > 0 && (
                <>
                  {(() => {
                    // Split events into first half, halftime, second half
                    const firstHalf = [];
                    const secondHalf = [];
                    let halftimeScore = { home: 0, away: 0 };
                    let halftimeIdx = -1;
                    detail.events.forEach((evt, idx) => {
                      const min = evt.minute.replace(/['"]/g, '').replace(/\s+/g, '');
                      if (min === 'HT' || min === '45' || min === '45+0' || min.startsWith('45+')) {
                        halftimeIdx = idx;
                        halftimeScore = { home: 0, away: 0 };
                        // Calculate score up to halftime
                        detail.events.slice(0, idx + 1).forEach(e => {
                          if (e.type === 'goal') {
                            if (e.side === 'home') halftimeScore.home++;
                            else halftimeScore.away++;
                          }
                        });
                      }
                    });
                    if (halftimeIdx === -1) {
                      // No halftime event, show all
                      return detail.events.map((evt) => (
                        <div
                          key={evt.id}
                          className={`event-item ${evt.side === 'home' ? 'home' : 'away'}`}
                        >
                          <div className="event-content">
                            {eventIcon(evt)}
                            <div className="event-text">
                              <span className="event-player">
                                {evt.playerName}
                              </span>
                              <span className="event-minute">
                                {evt.minute && (evt.minute === 'HT' || evt.minute.toUpperCase() === 'HT' || evt.minute.replace(/\s+/g, '') === '45+0' || evt.minute.replace(/\s+/g, '') === '45' || evt.minute.replace(/\s+/g, '').startsWith('45+'))
                                  ? 'HT'
                                  : evt.minute.replace(/['"]/g, '')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ));
                    }
                    // Split events
                    firstHalf.push(...detail.events.slice(0, halftimeIdx + 1));
                    secondHalf.push(...detail.events.slice(halftimeIdx + 1));
                    return [
                      ...firstHalf.map((evt) => (
                        <div
                          key={evt.id}
                          className={`event-item ${evt.side === 'home' ? 'home' : 'away'}`}
                        >
                          <div className="event-content">
                            {eventIcon(evt)}
                            <div className="event-text">
                              <span className="event-player">{evt.playerName}</span>
                              <span className="event-minute">
                                {evt.minute && (evt.minute === 'HT' || evt.minute.toUpperCase() === 'HT' || evt.minute.replace(/\s+/g, '') === '45+0' || evt.minute.replace(/\s+/g, '') === '45' || evt.minute.replace(/\s+/g, '').startsWith('45+'))
                                  ? 'HT'
                                  : evt.minute.replace(/['"]/g, '')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )),
                      <div className="halftime-divider" key="halftime-divider">
                        <div className="halftime-line"></div>
                        <div className="halftime-content">
                          <span className="halftime-label">HT</span>
                          <span className="halftime-score">{halftimeScore.home} : {halftimeScore.away}</span>
                        </div>
                        <div className="halftime-line"></div>
                      </div>,
                      ...secondHalf.map((evt) => (
                        <div
                          key={evt.id}
                          className={`event-item ${evt.side === 'home' ? 'home' : 'away'}`}
                        >
                          <div className="event-content">
                            {eventIcon(evt)}
                            <div className="event-text">
                              <span className="event-player">{evt.playerName}</span>
                              <span className="event-minute">
                                {evt.minute && (evt.minute === 'HT' || evt.minute.toUpperCase() === 'HT' || evt.minute.replace(/\s+/g, '') === '45+0' || evt.minute.replace(/\s+/g, '') === '45' || evt.minute.replace(/\s+/g, '').startsWith('45+'))
                                  ? 'HT'
                                  : evt.minute.replace(/['"]/g, '')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ];
                  })()}
                </>
              )}

              {/* Handle empty state */}
              {(!detail?.events || detail.events.length === 0) && (!liveData?.incidents || liveData.incidents.length === 0) && (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>No events yet</p>
              )}
            </div>
          </div>
        )}

        {/* STATS tab */}
        {activeTab === 'stats' && (
          <div className="detail-card">
            {/* Show detailed stats from various sources */}
            {(detail?.statistics || liveData?.live_stats) && (
              <>
                {/* Possession section */}
                {detail?.statistics && (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <div className="possession-label" style={{ textAlign: 'center', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Possession</div>
                      <div className="possession-bar">
                        <div
                          className="possession-bar-fill home"
                          style={{ width: `${detail.statistics.possession[0]}%` }}
                        >
                          {detail.statistics.possession[0] > 15 && <span className="possession-percent-home">{detail.statistics.possession[0]}%</span>}
                        </div>
                        <div
                          className="possession-bar-fill away"
                          style={{ width: `${detail.statistics.possession[1]}%` }}
                        >
                          {detail.statistics.possession[1] > 15 && <span className="possession-percent-away">{detail.statistics.possession[1]}%</span>}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Basic stats from detail.statistics */}
                {detail?.statistics && statRows.map((row) => (
                  <div key={row.label} className="stat-row">
                    <span className="stat-row-value home">{row.home}</span>
                    <span className="stat-row-label">{row.label}</span>
                    <span className="stat-row-value away">{row.away}</span>
                  </div>
                ))}

                {/* Detailed advanced stats from liveData.live_stats */}
                {liveData?.live_stats && Object.keys(liveData.live_stats.home || {}).length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Advanced Stats</h4>
                    
                    {/* Show possession bar first if available in live_stats */}
                    {getPossessionStats() && (
                      <>
                        <div className="possession-bar-container" style={{ marginBottom: '16px' }}>
                          <div className="possession-label" style={{ textAlign: 'center', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ball Possession</div>
                          <div className="possession-bar">
                            <div
                              className="possession-bar-fill home"
                              style={{ width: `${getPossessionStats()!.home}%` }}
                            >
                              {getPossessionStats()!.home > 15 && <span className="possession-percent-home">{Math.round(getPossessionStats()!.home)}%</span>}
                            </div>
                            <div
                              className="possession-bar-fill away"
                              style={{ width: `${getPossessionStats()!.away}%` }}
                            >
                              {getPossessionStats()!.away > 15 && <span className="possession-percent-away">{Math.round(getPossessionStats()!.away)}%</span>}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Other advanced stats */}
                    {getOtherKeyLiveStats() && (
                      <>
                        {Object.keys(getOtherKeyLiveStats()!.home || {}).map((key: string) => {
                          const homeVal = parseFloat(String(getOtherKeyLiveStats()!.home?.[key])) || 0;
                          const awayVal = parseFloat(String(getOtherKeyLiveStats()!.away?.[key])) || 0;
                          const homeHigher = homeVal > awayVal;
                          const awayHigher = awayVal > homeVal;
                          return (
                            <div key={key} className="stat-row">
                              <span className={`stat-row-value home ${homeHigher ? 'highlighted' : ''}`}>
                                {getOtherKeyLiveStats()!.home?.[key] ?? '-'}
                              </span>
                              <span className="stat-row-label">{key.replace(/_/g, ' ')}</span>
                              <span className={`stat-row-value away ${awayHigher ? 'highlighted away' : ''}`}>
                                {getOtherKeyLiveStats()!.away?.[key] ?? '-'}
                              </span>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {!detail?.statistics && !liveData?.live_stats && (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>No statistics available</p>
                )}
              </>
            )}
          </div>
        )}

        {/* PREDICTIONS tab */}
        {activeTab === 'predictions' && (
          <>
            {prediction && !predictionsLoading ? (
              <div className="detail-card predictions-card">
                <h3 className="predictions-title">Predictions & Odds</h3>
                
                {/* Main Prediction Pick */}
                <div className="prediction-pick-box">
                  <div className="prediction-pick">
                    <span className="prediction-pick-label">Predicted Winner</span>
                    <span className="prediction-pick-value">{prediction.pick}</span>
                    <span className="prediction-confidence">
                      Confidence: {prediction.confidence}
                    </span>
                  </div>
                  <div className="prediction-likely-score">
                    <span className="score-label">Most Likely Score</span>
                    <span className="score-value">{prediction.mostLikelyScore}</span>
                  </div>
                </div>

                {/* Win Probabilities */}
                <div className="odds-section">
                  <h4 className="odds-section-title">Win Probabilities (1X2)</h4>
                  <div className="probability-grid">
                    <div className="probability-item">
                      <span className="prob-label">{homeTeam.name}</span>
                      <span className="prob-value">{prediction.probabilities.homeWin}%</span>
                      {prediction.odds?.['1x2']?.home && (
                        <span className="odds-value">@{prediction.odds['1x2'].home.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="probability-item">
                      <span className="prob-label">Draw</span>
                      <span className="prob-value">{prediction.probabilities.draw}%</span>
                      {prediction.odds?.['1x2']?.draw && (
                        <span className="odds-value">@{prediction.odds['1x2'].draw.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="probability-item">
                      <span className="prob-label">{awayTeam.name}</span>
                      <span className="prob-value">{prediction.probabilities.awayWin}%</span>
                      {prediction.odds?.['1x2']?.away && (
                        <span className="odds-value">@{prediction.odds['1x2'].away.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Over/Under */}
                <div className="odds-section">
                  <h4 className="odds-section-title">Over/Under Goals</h4>
                  <div className="odds-grid">
                    <div className="odds-item">
                      <span className="odds-label">Over 1.5</span>
                      <span className="odds-value">{prediction.probabilities.over15}%</span>
                    </div>
                    <div className="odds-item">
                      <span className="odds-label">Over 2.5</span>
                      <span className="odds-value">{prediction.probabilities.over25}%</span>
                      {prediction.odds?.['over_under']?.over_25 && (
                        <span className="odds-price">@{prediction.odds['over_under'].over_25.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="odds-item">
                      <span className="odds-label">Over 3.5</span>
                      <span className="odds-value">{prediction.probabilities.over35}%</span>
                    </div>
                  </div>
                </div>

                {/* Both Teams to Score */}
                <div className="odds-section">
                  <h4 className="odds-section-title">Both Teams to Score</h4>
                  <div className="btts-box">
                    <span className="btts-label">BTTS Probability</span>
                    <span className="btts-value">{prediction.probabilities.bttsYes}%</span>
                    {prediction.odds?.['btts']?.yes && (
                      <span className="btts-odds">@{prediction.odds['btts'].yes.toFixed(2)}</span>
                    )}
                  </div>
                </div>

                {/* Expected Goals */}
                <div className="odds-section">
                  <h4 className="odds-section-title">Expected Goals (xG)</h4>
                  <div className="xg-box">
                    <div className="xg-item">
                      <span className="xg-label">{homeTeam.name}</span>
                      <span className="xg-value">{prediction.expectedGoals.home}</span>
                    </div>
                    <div className="xg-item">
                      <span className="xg-label">{awayTeam.name}</span>
                      <span className="xg-value">{prediction.expectedGoals.away}</span>
                    </div>
                  </div>
                </div>

                <div className="prediction-footer">
                  <span className="model-version">Model: {prediction.modelVersion}</span>
                </div>
              </div>
            ) : (
              <div className="detail-card">
                <p className="placeholder-text">
                  {predictionsLoading ? 'Loading predictions...' : 'Predictions not available for this match.'}
                </p>
              </div>
            )}
          </>
        )}

        {/* No detail data fallback */}
        {/* Removed empty fallback card for no detail */}
      </div>
    </div>
  );
};

export default MatchDetailPage;

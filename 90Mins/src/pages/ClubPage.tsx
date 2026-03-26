import { useState, useEffect, useRef } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { IonIcon, IonSpinner } from '@ionic/react';
import { arrowBackOutline } from 'ionicons/icons';
import Logger from '../services/logger';
import StandingsTable from '../components/StandingsTable';
import { getTeamById, getLeagueById, mapCompetitionCodeToLeagueId } from '../data/dataHelpers';
import footballApi from '../services/footballApi';
import { getStandingsByLeague } from '../data/standings';
import { getCachedStandings, setCachedStandings } from '../services/standingsCache';
import { getStandingsFromSportsAPIPro } from '../services/footballApiHybrid';
import { mapSportsAPIProStandingsToLeagueStanding } from '../services/apiMapper';
import { Match, LeagueStanding } from '../data/types';
import { liveMatches as mockLiveMatches, upcomingMatches as mockUpcomingMatches, finishedMatches as mockFinishedMatches, tomorrowMatches as mockTomorrowMatches } from '../data/matches';
import { mapApiMatchToMatch } from '../services/apiMapper';
import './ClubPage.css';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';


interface ClubFixtureItemProps {
  match: Match & { utcDate?: string };
  teamId: string;
  onMatchClick: () => void;
}

const ClubFixtureItem: React.FC<ClubFixtureItemProps> = ({ match, teamId, onMatchClick }) => {
  const homeTeam = getTeamById(match.homeTeam.teamId);
  const awayTeam = getTeamById(match.awayTeam.teamId);

  const convert24to12 = (time: string): string => {
    if (!time) return 'TBA';
    const [hours, minutes] = time.split(':').map(Number);
    const meridiem = hours >= 12 ? 'p.m.' : 'a.m.';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${meridiem}`;
  };

  const isHomeTeam = match.homeTeam.teamId === teamId;
  const teamScore = isHomeTeam ? match.homeTeam.score : match.awayTeam.score;
  const opponentScore = isHomeTeam ? match.awayTeam.score : match.homeTeam.score;

  const getResultColor = (): string => {
    if (match.status !== 'finished') return '';
    if (teamScore === null || opponentScore === null) return '';
    if (teamScore > opponentScore) return 'green';
    if (teamScore < opponentScore) return 'red';
    return 'gray'; // Draw
  };

  const resultColor = getResultColor();

  const formatMatchTime = (match: Match): string => {
    if (match.status === 'finished') {
      return 'FT';
    }
    if (match.status === 'live') {
      const minute = match.minute || '--';
      return minute;
    }
    
    // For upcoming matches, show time in 12-hour format
    if (match.kickoff) {
      return convert24to12(match.kickoff);
    }
    return 'TBA';
  };

  // Format date for display
  const getMatchDate = (): string => {
    // Use utcDate from API if available
    if (match.utcDate) {
      const date = new Date(match.utcDate);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    }
    
    // Fallback for mock data
    if (match.status === 'finished') {
      return 'Feb 18';
    }
    return 'Upcoming';
  };

  return (
    <div className="club-match-item" onClick={onMatchClick} style={{ cursor: 'pointer' }}>
      <div className="match-date-display">
        <span className="match-date-text">{getMatchDate()}</span>
      </div>

      <div className="match-info">
        {/* Home team - name then logo */}
        <div className="team-section">
          <span className="team-name">{homeTeam?.name || 'Unknown'}</span>
          {homeTeam?.logo && (
            <img src={homeTeam.logo} alt={homeTeam.name} className="team-logo" loading="lazy" />
          )}
        </div>

        {/* Score/Time */}
        <div className="match-center">
          {match.status === 'finished' || match.status === 'live' ? (
            <div className={`score-box score-box-${resultColor}`}>
              <span className="score">{match.homeTeam.score ?? 0}</span>
              <span className="separator">-</span>
              <span className="score">{match.awayTeam.score ?? 0}</span>
            </div>
          ) : (
            <span className="time">{formatMatchTime(match)}</span>
          )}
        </div>

        {/* Away team - logo then name */}
        <div className="team-section">
          {awayTeam?.logo && (
            <img src={awayTeam.logo} alt={awayTeam.name} className="team-logo" loading="lazy" />
          )}
          <span className="team-name">{awayTeam?.name || 'Unknown'}</span>
        </div>
      </div>
    </div>
  );
};

const logger = new Logger('ClubPage');

const ClubPage: React.FC = () => {
  const history = useHistory();
  const { teamId } = useParams<{ teamId: string }>();
  const team = getTeamById(teamId);
  const league = team ? getLeagueById(team.leagueId) : null;

  const [activeTab, setActiveTab] = useState<'fixtures' | 'table'>('fixtures');
  const [fixtureMatches, setFixtureMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);
  const [standings, setStandings] = useState<LeagueStanding | null>(null);

  useEffect(() => {
    if (activeTab === 'fixtures') {
      if (isInitialLoad.current) {
        setLoading(true);
      }
      fetchFixtures();
    } else if (activeTab === 'table') {
      // Ensure standings are loaded when table tab is opened
      if (!standings) {
        fetchStandingsForClub();
      }
    }
  }, [activeTab, teamId]);

  useEffect(() => {
    // Reset state when teamId changes
    
    setActiveTab('fixtures');
    setFixtureMatches([]);
    setStandings(null);
    isInitialLoad.current = true;
    
    if (!USE_MOCK_DATA) {
      fetchStandingsForClub();
    } else {
      // Load mock standings immediately
      if (team) {
        const mockStanding = getStandingsByLeague(team.leagueId);
        setStandings(mockStanding || null);
      }
    }
  }, [teamId]);

  // Fetch standings for the club's league
  const fetchStandingsForClub = async () => {
    if (!team) return;

    // Map leagueId to API code
    const leagueIdToApiCode: Record<string, string> = {
      'premier-league': 'PL',
      'la-liga': 'LA',
      'serie-a': 'SA',
      'bundesliga': 'BL1',
      'ligue-1': 'FL1',
    };

    const apiId = leagueIdToApiCode[team.leagueId];
    if (!apiId) {
      // Fallback to mock data
      const mockStanding = getStandingsByLeague(team.leagueId);
      setStandings(mockStanding || null);
      return;
    }

    try {
      // Check cache first
      const cached = getCachedStandings(team.leagueId);
      if (cached) {
        setStandings(cached);
        return;
      }

      // Fetch from API
      const now = new Date();
      const currentSeason = now.getMonth() < 7 ? (now.getFullYear() - 1).toString() : now.getFullYear().toString();
      const response = await getStandingsFromSportsAPIPro(apiId, currentSeason);

      if (response && response.standings && response.standings.length > 0) {
        const mappedStanding = mapSportsAPIProStandingsToLeagueStanding(response, team.leagueId);
        setStandings(mappedStanding);
        setCachedStandings(team.leagueId, mappedStanding);
      } else {
        // Fallback to mock data
        const mockStanding = getStandingsByLeague(team.leagueId);
        setStandings(mockStanding || null);
      }
    } catch (err) {
      logger.error('Error fetching standings for club page:', err);
      // Fallback to mock data
      const mockStanding = getStandingsByLeague(team.leagueId);
      setStandings(mockStanding || null);
    }
  };

  const fetchFixtures = async () => {
    try {
      if (USE_MOCK_DATA) {
        // Fetch all matches from all mock data
        const allMatches = [...mockFinishedMatches, ...mockLiveMatches, ...mockUpcomingMatches, ...mockTomorrowMatches];

        // Filter by team (both home and away)
        const teamMatches = allMatches.filter(m => 
          m.homeTeam.teamId === teamId || m.awayTeam.teamId === teamId
        );

        // Sort by date/status (oldest finished first, then upcoming)
        const sortedMatches = teamMatches.sort((a, b) => {
          const aIsFinished = a.status === 'finished';
          const bIsFinished = b.status === 'finished';
          
          // If both have same status, sort by time (don't have exact time in mock data, so just keep order)
          if (aIsFinished === bIsFinished) return 0;
          
          // Finished matches come first
          return aIsFinished ? -1 : 1;
        });

        setFixtureMatches(sortedMatches);
      } else {
        // Fetch from API - get fixtures for next 14 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const formatDate = (date: Date): string => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        // Fetch matches for next 14 days to get upcoming fixtures
        const datePromises = [];
        for (let i = 0; i < 14; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          const dateStr = formatDate(date);
          datePromises.push(
            footballApi.getFixturesByDate(dateStr)
              .then(response => ({ date: dateStr, response }))
              .catch(err => {
                return null;
              })
          );
        }

        const results = await Promise.all(datePromises);
        const allMatches: Array<Match & { utcDate?: string }> = [];

        // Process all matches
        for (const result of results) {
          if (result && result.response) {
            const response = result.response as any;
            if (response.matches && Array.isArray(response.matches)) {
              for (const apiMatch of response.matches) {
                try {
                  // Extract league ID from competition code
                  const competitionCode = apiMatch.competition?.code || '';
                  const leagueId = mapCompetitionCodeToLeagueId(competitionCode, 'other');
                  
                  const match = mapApiMatchToMatch(apiMatch, leagueId);
                  
                  // Store the original utcDate for sorting
                  allMatches.push({ ...match, utcDate: apiMatch.utcDate });
                } catch (err) {
                }
              }
            }
          }
        }

        // Filter matches for this specific team (by ID or name)
        const teamMatches = allMatches.filter(match => {
          const isHomeMatchById = match.homeTeam.teamId === teamId;
          const isAwayMatchById = match.awayTeam.teamId === teamId;
          
          // Fallback: match by team name (case-insensitive)
          const teamNameLower = team?.name.toLowerCase() || '';
          const homeTeamName = match.homeTeam.name?.toLowerCase() || '';
          const awayTeamName = match.awayTeam.name?.toLowerCase() || '';
          
          const isHomeMatchByName = homeTeamName && (
            homeTeamName === teamNameLower || 
            homeTeamName.includes(teamNameLower) ||
            teamNameLower.includes(homeTeamName)
          );
          const isAwayMatchByName = awayTeamName && (
            awayTeamName === teamNameLower ||
            awayTeamName.includes(teamNameLower) ||
            teamNameLower.includes(awayTeamName)
          );
          
          return isHomeMatchById || isAwayMatchById || isHomeMatchByName || isAwayMatchByName;
        });

        // Sort by date (earliest first)
        const sortedMatches = teamMatches.sort((a, b) => {
          const dateA = a.utcDate ? new Date(a.utcDate).getTime() : 0;
          const dateB = b.utcDate ? new Date(b.utcDate).getTime() : 0;
          return dateA - dateB;
        });

        // Take at least 5 upcoming matches, but show all if less than 5
        const upcomingMatches = sortedMatches.filter(m => m.status === 'upcoming');
        const displayMatches = upcomingMatches.slice(0, Math.max(5, upcomingMatches.length));

        setFixtureMatches(displayMatches);
      }
    } catch (err) {
      logger.error('Failed to fetch fixtures:', err);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  };

  if (!team || !league) {
    return (
      <div className="club-page">
        <div className="club-page-error">
          <p>Club not found</p>
          <button onClick={() => history.push('/matches')}>Back to Matches</button>
        </div>
      </div>
    );
  }

  return (
    <div className="club-page">
      {/* Club header */}
      <div className="club-header">
        <button className="club-page-back-btn" onClick={() => history.goBack()} aria-label="Go back">
          <IonIcon icon={arrowBackOutline} />
        </button>
        {team.logo && (
          <img src={team.logo} alt={team.name} className="club-logo" loading="lazy" />
        )}
        <div className="club-header-info">
          <h1 className="club-name">{team.name}</h1>
          <p className="club-league">
            {league.name}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="club-tabs">
        <button
          className={`club-tab ${activeTab === 'fixtures' ? 'active' : ''}`}
          onClick={() => setActiveTab('fixtures')}
        >
          Fixtures
        </button>
        <button
          className={`club-tab ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          Table
        </button>
      </div>

      {/* Tab content */}
      <div className="club-tab-content">
        {activeTab === 'fixtures' ? (
          <div className="club-fixtures-wrapper">
            {loading && (
              <div className="club-fixtures-loading">
                <IonSpinner name="crescent" />
                <p>Loading fixtures...</p>
              </div>
            )}

            {!loading && fixtureMatches.length > 0 ? (
              <div className="club-fixtures-list">
                {fixtureMatches.map((match) => (
                  <ClubFixtureItem key={match.id} match={match} teamId={teamId} onMatchClick={() => history.push(`/match/${match.id}`)} />
                ))}
              </div>
            ) : !loading ? (
              <div className="club-no-data">
                <p>No fixtures available</p>
              </div>
            ) : null}
          </div>
        ) : activeTab === 'table' ? (
          <div className="club-standings-wrapper">
            {standings ? (
              <StandingsTable standing={standings} highlightTeamId={teamId} />
            ) : (
              <div className="club-no-data">
                <p>No standings available</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ClubPage;

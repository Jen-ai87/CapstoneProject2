import { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { IonIcon, IonSpinner } from '@ionic/react';
import { arrowBackOutline } from 'ionicons/icons';
import Logger from '../services/logger';
import DateSelector from '../components/DateSelector';
import { LeagueMatchesGroup } from '../components/LeagueMatchesCard';
import StandingsTable from '../components/StandingsTable';
import { getLeagueById, mapCompetitionCodeToLeagueId } from '../data/dataHelpers';
import footballApi from '../services/footballApi';
import { getStandingsByLeague } from '../data/standings';
import { getCachedStandings, setCachedStandings } from '../services/standingsCache';
import { getStandingsFromSportsAPIPro } from '../services/footballApiHybrid';
import { mapSportsAPIProStandingsToLeagueStanding } from '../services/apiMapper';
import { Match, LeagueStanding } from '../data/types';
import { liveMatches as mockLiveMatches, upcomingMatches as mockUpcomingMatches, finishedMatches as mockFinishedMatches, tomorrowMatches as mockTomorrowMatches } from '../data/matches';
import { mapApiMatchToMatch } from '../services/apiMapper';

import './LeaguePage.css';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const logger = new Logger('LeaguePage');

const LeaguePage: React.FC = () => {
  const history = useHistory();
  const { leagueId } = useParams<{ leagueId: string }>();
  const league = getLeagueById(leagueId);

  const [activeTab, setActiveTab] = useState<'table' | 'fixtures'>('table');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [fixtureMatches, setFixtureMatches] = useState<Array<Match & { utcDate?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [leagueProfile, setLeagueProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'short' | 'full' | 'form'>('full');
  const [standings, setStandings] = useState<LeagueStanding | null>(null);

  useEffect(() => {
    if (activeTab === 'fixtures') {
      fetchFixtures();
    }
  }, [selectedDate, activeTab, leagueId]);

  useEffect(() => {
    // Reset league profile when leagueId changes to avoid showing wrong league data
    setLeagueProfile(null);
    setStandings(null);
    setActiveTab('table'); // Reset to table view when switching leagues
    if (!USE_MOCK_DATA) {
      fetchLeagueProfile();
      fetchStandingsForLeague();
    } else {
      // Load mock standings immediately
      const mockStanding = getStandingsByLeague(leagueId);
      setStandings(mockStanding || null);
    }
  }, [leagueId]);

  // Fetch standings for the league
  const fetchStandingsForLeague = async () => {
    // Map leagueId to API code
    const leagueIdToApiCode: Record<string, string> = {
      'premier-league': 'PL',
      'la-liga': 'LA',
      'serie-a': 'SA',
      'bundesliga': 'BL1',
      'ligue-1': 'FL1',
      'champions-league': 'CL',
    };

    const apiId = leagueIdToApiCode[leagueId];
    if (!apiId) {
      // Fallback to mock data for cup competitions
      const mockStanding = getStandingsByLeague(leagueId);
      setStandings(mockStanding || null);
      return;
    }

    try {
      // Check cache first
      const cached = getCachedStandings(leagueId);
      if (cached) {
        setStandings(cached);
        return;
      }

      // Fetch from API
      const now = new Date();
      const currentSeason = now.getMonth() < 7 ? (now.getFullYear() - 1).toString() : now.getFullYear().toString();
      const response = await getStandingsFromSportsAPIPro(apiId, currentSeason);

      if (response && response.standings && response.standings.length > 0) {
        const mappedStanding = mapSportsAPIProStandingsToLeagueStanding(response, leagueId);
        setStandings(mappedStanding);
        setCachedStandings(leagueId, mappedStanding);
      } else {
        // Fallback to mock data
        const mockStanding = getStandingsByLeague(leagueId);
        setStandings(mockStanding || null);
      }
    } catch (err) {
      console.error('❌ Error fetching standings for league page:', err);
      // Fallback to mock data
      const mockStanding = getStandingsByLeague(leagueId);
      setStandings(mockStanding || null);
    }
  };

  const getNumericIdFromSlug = (value: string): string | null => {
    const match = value.match(/(\d+)$/);
    return match ? match[1] : null;
  };

  const buildLeagueLogo = (apiId?: number | null): string | null => {
    const token = import.meta.env.VITE_BSD_API_KEY;
    if (!apiId || !token) return null;
    return `https://sports.bzzoiro.com/img/league/${apiId}/?token=${token}`;
  };

  const fetchLeagueProfile = async () => {
    const numericId = getNumericIdFromSlug(leagueId);
    if (!numericId) return;

    setProfileLoading(true);
    try {
      const leagueResponse = await footballApi.getLeagueById?.(numericId) as any;
      setLeagueProfile(leagueResponse || null);
    } catch (err) {
    } finally {
      setProfileLoading(false);
    }
  };

  const getDayDifference = (date: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    const diffTime = compareDate.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const fetchFixtures = async () => {
    setLoading(true);
    try {
      if (USE_MOCK_DATA) {
        // Use mock data
        const dayDiff = getDayDifference(selectedDate);
        let allMatches: Match[] = [];

        if (dayDiff === -1) {
          allMatches = mockFinishedMatches;
        } else if (dayDiff === 0) {
          allMatches = [...mockLiveMatches, ...mockUpcomingMatches];
        } else if (dayDiff === 1) {
          allMatches = mockTomorrowMatches;
        }

        // Filter by league
        const leagueMatches = allMatches.filter(m => m.leagueId === leagueId);
        setFixtureMatches(leagueMatches);
      } else {
        // For cup competitions (Champions League, Europa League, etc.), fetch a wider date range
        // since they don't have matches every day
        const isCupCompetition = ['champions-league', 'europa-league', 'europa-conference-league', 'world-cup', 'european-championship'].includes(leagueId);
        
        if (isCupCompetition) {
          const allMatches: Array<Match & { utcDate?: string }> = [];
          const today = new Date();
          const startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 14);
          const endDate = new Date(today);
          endDate.setDate(endDate.getDate() + 30);
          
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            try {
              const response = await footballApi.getFixturesByDate?.(dateStr);
              const matchesArray = response?.data?.matches || response?.matches || [];
              
              if (Array.isArray(matchesArray)) {
                for (const apiMatch of matchesArray) {
                  const competitionCode = apiMatch.competition?.code || '';
                  const mappedLeagueId = mapCompetitionCodeToLeagueId(competitionCode);
                  
                  // Only add matches for this competition
                  if (mappedLeagueId === leagueId) {
                    const match = mapApiMatchToMatch(apiMatch, mappedLeagueId);
                    if (match) {
                      allMatches.push({ ...match, utcDate: apiMatch.utcDate });
                    }
                  }
                }
              }
            } catch (err) {
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          
          // Sort by kickoff time
          allMatches.sort((a, b) => {
            const dateA = a.utcDate ? new Date(a.utcDate).getTime() : 0;
            const dateB = b.utcDate ? new Date(b.utcDate).getTime() : 0;
            return dateA - dateB;
          });
          
          setFixtureMatches(allMatches);
        } else {
          const dateStr = selectedDate.toISOString().split('T')[0];

          try {
            const response = await footballApi.getFixturesByDate?.(dateStr);
            const matchesArray = response?.data?.matches || response?.matches || [];

            if (Array.isArray(matchesArray) && matchesArray.length > 0) {
              const allMatches: Array<Match & { utcDate?: string }> = [];

              // Map matches with proper league IDs and store utcDate
              for (const apiMatch of matchesArray) {
                const competitionCode = apiMatch.competition?.code || '';
                const mappedLeagueId = mapCompetitionCodeToLeagueId(competitionCode);
                const match = mapApiMatchToMatch(apiMatch, mappedLeagueId);
                if (match) {
                  allMatches.push({ ...match, utcDate: apiMatch.utcDate });
                }
              }

              // Filter by this league
              const leagueMatches = allMatches.filter((m) => m.leagueId === leagueId);

              // Sort by kickoff time
              leagueMatches.sort((a, b) => {
                const dateA = a.utcDate ? new Date(a.utcDate).getTime() : 0;
                const dateB = b.utcDate ? new Date(b.utcDate).getTime() : 0;
                return dateA - dateB;
              });

              setFixtureMatches(leagueMatches);
            } else {
              setFixtureMatches([]);
            }
          } catch (err) {
            logger.error('Failed to fetch fixtures:', err);
            setFixtureMatches([]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching fixtures:', error);
      setFixtureMatches([]);
    } finally {
      setLoading(false);
    }
  };

  if (!league) {
    return (
      <div className="league-page">
        <div className="league-page-error">
          <p>League not found</p>
          <button onClick={() => history.push('/matches')}>Back to Matches</button>
        </div>
      </div>
    );
  }

  const isCupCompetition = ['champions-league', 'europa-league', 'europa-conference-league', 'world-cup', 'european-championship'].includes(leagueId);

  const profileLogo = buildLeagueLogo(leagueProfile?.api_id) || league.logo || null;

  return (
    <div className="league-page">
      {/* League header */}
      <div className="league-header">
        <button className="league-page-back-btn" onClick={() => history.goBack()} aria-label="Go back">
          <IonIcon icon={arrowBackOutline} />
        </button>
        {profileLogo && (
          <img src={profileLogo} alt={leagueProfile?.name || league.name} className="league-logo" loading="lazy" />
        )}
        <div className="league-header-info">
          <h1 className="league-name">{leagueProfile?.name || league.name}</h1>
          <p className="league-country">
            {leagueProfile?.country || league.country}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="league-tabs">
        <button
          className={`league-tab ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          Table
        </button>
        <button
          className={`league-tab ${activeTab === 'fixtures' ? 'active' : ''}`}
          onClick={() => setActiveTab('fixtures')}
        >
          Fixtures
        </button>
      </div>

      {/* Tab content */}
      <div className="league-tab-content">
        {activeTab === 'table' ? (
          <div className="league-standings-wrapper">
            {standings ? (
              <StandingsTable 
                standing={standings} 
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            ) : (
              <div className="league-no-data">
                <p>No standings available</p>
              </div>
            )}
          </div>
        ) : (
          <div className="league-fixtures-wrapper">
            <div className="league-fixtures-header">
              <h3>{isCupCompetition ? 'Past & Upcoming Fixtures' : 'Fixtures'}</h3>
              <p className="league-fixtures-subtitle">
                {isCupCompetition 
                  ? 'Showing all matches from the past 2 weeks and next 30 days'
                  : 'Select a date to view matches'}
              </p>
            </div>
            {!isCupCompetition && <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />}

            {loading && (
              <div className="league-fixtures-loading">
                <IonSpinner name="crescent" />
                <p>Loading fixtures...</p>
              </div>
            )}

            {!loading && fixtureMatches.length > 0 ? (
              <LeagueMatchesGroup league={league} matches={fixtureMatches} />
            ) : !loading ? (
              <div className="league-no-data">
                <p>{isCupCompetition 
                  ? 'No fixtures found in the past 2 weeks or next 30 days'
                  : 'No fixtures found for this date'}</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaguePage;

import { useState, useEffect, useCallback } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { IonIcon, IonSpinner } from '@ionic/react';
import { calendarOutline, alertCircleOutline, star, chevronDownOutline } from 'ionicons/icons';
import DateSelector from '../components/DateSelector';
import LeagueFilter from '../components/LeagueFilter';
import { LeagueMatchesGroup, MatchItem } from '../components/LeagueMatchesCard';
import { Match } from '../data/types';
import footballApi, { LEAGUE_IDS } from '../services/footballApi';
import { mapApiMatchToMatch, ApiMatchesResponse } from '../services/apiMapper';
import { getLeagueById, addTeamsToCache, createTeamFromAPI, mapCompetitionCodeToLeagueId } from '../data/dataHelpers';
import { liveMatches as mockLiveMatches, upcomingMatches as mockUpcomingMatches, finishedMatches as mockFinishedMatches, tomorrowMatches as mockTomorrowMatches } from '../data/matches';
import { favouriteTeams } from '../data/favourites';
import { getTeamById } from '../data/dataHelpers';
// Helper: get all matches involving user's followed teams
const getFollowingMatches = (matches: Match[]): Match[] => {
  const followedIds = favouriteTeams.map(f => f.teamId);
  return matches.filter(m => followedIds.includes(m.homeTeam.teamId) || followedIds.includes(m.awayTeam.teamId));
};
import { showErrorToast } from '../services/toastNotification';
import { useLiveScorePoller } from '../hooks/useLiveScorePoller';
import Logger from '../services/logger';

import './MatchesPage.css';

// Check if we should use mock data
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Helper to group matches by league
const groupMatchesByLeague = (matches: Match[]): Map<string, Match[]> => {
  const grouped = new Map<string, Match[]>();
  matches.forEach(match => {
    const leagueId = match.leagueId;
    if (!grouped.has(leagueId)) {
      grouped.set(leagueId, []);
    }
    grouped.get(leagueId)!.push(match);
  });
  return grouped;
};

const logger = new Logger('MatchesPage');

const MatchesPage: React.FC = () => {
  const location = useLocation();
  const history = useHistory();

  // Read league from URL query param (?league=premier-league)
  const queryLeague = new URLSearchParams(location.search).get('league');

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Create a date explicitly at midnight local time for today
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return today;
  });
  const [selectedLeague, setSelectedLeague] = useState<string | null>(queryLeague);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<Match[]>([]);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);
  // Live filter state
  const [showOnlyLive, setShowOnlyLive] = useState(false);
  const [followingCollapsed, setFollowingCollapsed] = useState(false);

  // Set up live score polling (only for BSD API with unlimited requests)
  const { isActive: isPollingActive } = useLiveScorePoller({
    enabled: !USE_MOCK_DATA,
    initialInterval: 15000, // Poll every 15 seconds for live matches
    onUpdate: (updatedMatches: any[]) => {
      // Update only live matches from polling
      const mappedLive = updatedMatches
        .map((m: any) => {
          const code = (m.competition?.code as string | undefined)?.toUpperCase() || 'INT';
          const leagueId = mapCompetitionCodeToLeagueId(code, 'other');
          return mapApiMatchToMatch(m, leagueId);
        })
        .filter((m: Match) => m.status === 'live');
      
      if (mappedLive.length > 0) {
        setLiveMatches(mappedLive);
        setLastLiveUpdate(new Date());
      }
    },
  });

  // Sync when URL query param changes (e.g. Quick Access sidebar click)
  useEffect(() => {
    setSelectedLeague(queryLeague);
  }, [queryLeague]);

  const formatDate = (date: Date): string => {
    // Use local date, not UTC (avoid timezone offset issues)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDayDifference = (date: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    const diffTime = compareDate.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const fetchMatches = useCallback(async () => {
    // Show loading state but don't clear matches yet - keep showing old data
    setLoading(true);
    setError(null);
    
    try {
      // Use mock data if flag is enabled
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
        const dayDiff = getDayDifference(selectedDate);
        if (dayDiff === 0) {
          // Today
          setLiveMatches(mockLiveMatches);
          setUpcomingMatches(mockUpcomingMatches);
          setFinishedMatches([]);
        } else if (dayDiff === -1) {
          // Yesterday
          setLiveMatches([]);
          setUpcomingMatches([]);
          setFinishedMatches(mockFinishedMatches);
        } else if (dayDiff === 1) {
          // Tomorrow
          setLiveMatches([]);
          setUpcomingMatches(mockTomorrowMatches);
          setFinishedMatches([]);
        } else {
          // Other dates - show empty
          setLiveMatches([]);
          setUpcomingMatches([]);
          setFinishedMatches([]);
        }
        setLoading(false);
        return;
      }
      
      // Real API calls below
      const dateStr = formatDate(selectedDate);
      const dayDiff = getDayDifference(selectedDate);
      let allMatches: Match[] = [];
      let response: ApiMatchesResponse | null = null;
      
      try {
        // Get current season year
        const now = new Date();
        const currentSeason = now.getMonth() < 7 ? (now.getFullYear() - 1).toString() : now.getFullYear().toString();
        // Fetch matches for the selected date first
        response = await footballApi.getFixturesByDate(dateStr) as ApiMatchesResponse;
        console.log('[DEBUG] API matches for date', dateStr, response?.matches);
        
        if (response && response.matches && response.matches.length > 0) {
          // Create mapping of leagues
          const leagueCodeMap: Record<string, string> = {
            'PL': 'premier-league',
            'LA': 'la-liga',
            'SA': 'serie-a',
            'BL1': 'bundesliga',
            'FL1': 'ligue-1',
            'CL': 'champions-league',
            'DED': 'eredivisie',
            'PPL': 'primeira-liga',
          };
          
          // Identify which leagues have matches and fetch their teams
          const leaguesToFetch = new Set<string>();
          response.matches.forEach(match => {
            if (match.competition && match.competition.code) {
              const code = (match.competition.code as string).toUpperCase();
              if (leagueCodeMap[code]) {
                leaguesToFetch.add(code);
              }
            }
          });
          
          // Fetch teams for each league with a small delay between requests to avoid rate limiting
          for (const leagueCode of leaguesToFetch) {
            try {
              // Add a small delay between requests
              await new Promise(resolve => setTimeout(resolve, 300));
              
              const leagueTeamsResponse = await footballApi.getCompetitionTeams(leagueCode, currentSeason) as any;
              if (leagueTeamsResponse?.teams && Array.isArray(leagueTeamsResponse.teams)) {
                // Convert API teams to Team objects and cache them
                const teamObjects = leagueTeamsResponse.teams.map((apiTeam: any) =>
                  createTeamFromAPI(apiTeam.id, apiTeam.name, leagueCodeMap[leagueCode])
                );
                addTeamsToCache(teamObjects);
              }
            } catch (err) {
              // Don't fail the entire page load if team fetching fails
            }
          }
          
          // Get allowed league codes
          const allowedCodes = Object.keys(leagueCodeMap);
          
          // Filter matches to only include allowed leagues and map them
          response.matches.forEach((match, idx) => {
            // Debug log for each match's date and status
            console.log('[DEBUG] Match:', {
              id: match.id,
              home: match.homeTeam?.name,
              away: match.awayTeam?.name,
              utcDate: match.utcDate,
              status: match.status,
              minute: match.minute,
              competition: match.competition?.code
            });
            // Determine which league this match belongs to
            let leagueId = '';
            let leagueCode = '';
            // Try to match based on competition code from match level
            if (match.competition && match.competition.code) {
              const code = (match.competition.code as string).toUpperCase();
              if (allowedCodes.includes(code)) {
                leagueCode = code;
                leagueId = leagueCodeMap[code];
              } else if (idx < 2) {
                // Include matches from competitions we didn't explicitly request, but that were returned
                leagueCode = code;
                leagueId = leagueCodeMap[code];
              }
            }
            // Only map if we have a valid leagueId (skip unknown leagues)
            if (leagueId) {
              try {
                const mappedMatch = mapApiMatchToMatch(match, leagueId);
                allMatches.push(mappedMatch);
              } catch (err) {
              }
            } else {
            }
          });
        }
      } catch (err) {
        logger.error('Error fetching matches from API:', err);
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(`API Error: ${errorMsg}`);
        showErrorToast('FETCH_ERROR', `Failed to load matches: ${errorMsg}`);
      }
      
      // If no matches found, try fetching from each league individually as fallback
      if (allMatches.length === 0) {
        // Build dynamic league list based on active provider's LEAGUE_IDS
        const leagues = Object.entries(LEAGUE_IDS).map(([key, code]) => ({
          code,
          id: key.toLowerCase().replace(/_/g, '-'),
        }));
        
        // Get current season year
        const now = new Date();
        const currentSeason = now.getMonth() < 7 ? (now.getFullYear() - 1).toString() : now.getFullYear().toString();
        
        for (const league of leagues) {
          try {
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 600));
            
            const leagueResponse = await footballApi.getFixturesByLeague(league.code, currentSeason) as ApiMatchesResponse;
            
            if (leagueResponse?.matches && leagueResponse.matches.length > 0) {
              // Filter to only matches from the selected date
              const leagueMatches = leagueResponse.matches
                .filter(m => {
                  // Convert UTC date to local date (avoid timezone offset issues)
                  const matchDate = new Date(m.utcDate);
                  const year = matchDate.getFullYear();
                  const month = String(matchDate.getMonth() + 1).padStart(2, '0');
                  const day = String(matchDate.getDate()).padStart(2, '0');
                  const matchDateStr = `${year}-${month}-${day}`;
                  return matchDateStr === dateStr;
                })
                .slice(0, 5) // Limit to 5 per league
                .map(match => {
                  try {
                    return mapApiMatchToMatch(match, league.id);
                  } catch (e) {
                    return null;
                  }
                })
                .filter((m): m is Match => m !== null);
              
              allMatches.push(...leagueMatches);
            }
          } catch (err) {
          }
        }
      }
      
      // If viewing today, merge live matches from the live endpoint
      if (dayDiff === 0) {
        try {
          const liveResponse = await footballApi.getLiveMatches() as ApiMatchesResponse;
          const liveMatches = (liveResponse?.matches || [])
            .map((match) => {
              const code = (match.competition?.code as string | undefined)?.toUpperCase();
              if (!code) return null;

              const leagueId = mapCompetitionCodeToLeagueId(code, '');
              if (!leagueId || !getLeagueById(leagueId)) return null;

              try {
                return mapApiMatchToMatch(match, leagueId);
              } catch (e) {
                return null;
              }
            })
            .filter((m): m is Match => m !== null);

          const mergedById = new Map<string, Match>();
          allMatches.forEach((m) => mergedById.set(m.id, m));
          liveMatches.forEach((m) => mergedById.set(m.id, m));
          allMatches = Array.from(mergedById.values());
        } catch (err) {
        }
      }

      // Categorize matches by status
      // Only show live matches if their date is today
      const todayStr = formatDate(new Date());
      const newLiveMatches = allMatches.filter(m => {
        if (m.status !== 'live') return false;
        // Try to get match date from kickoff or utcDate
        let matchDateStr = '';
        const matchWithDate = m as Match & { utcDate?: string; date?: string };
        if (m.kickoff) {
          // Assume kickoff is in HH:mm format, use selectedDate
          matchDateStr = formatDate(selectedDate);
        } else if (matchWithDate.utcDate) {
          const matchDate = new Date(matchWithDate.utcDate);
          matchDateStr = formatDate(matchDate);
        } else if (matchWithDate.date) {
          const matchDate = new Date(matchWithDate.date);
          matchDateStr = formatDate(matchDate);
        } else {
          // Fallback: treat as today
          matchDateStr = todayStr;
        }
        return matchDateStr === todayStr;
      });
      const newUpcomingMatches = allMatches.filter(m => m.status === 'upcoming');
      const newFinishedMatches = allMatches.filter(m => m.status === 'finished');
      
      // Update state with the new matches
      // If we have matches, show them; if we got a valid response with no matches, clear them
      if (allMatches.length > 0) {
        setLiveMatches(newLiveMatches);
        setUpcomingMatches(newUpcomingMatches);
        setFinishedMatches(newFinishedMatches);
      } else if (response !== null) {
        setLiveMatches([]);
        setUpcomingMatches([]);
        setFinishedMatches([]);
      }
      // If response is null (error occurred), don't clear existing matches
      
    } catch (err) {
      logger.error('Error fetching matches:', err);
      setError('Failed to load matches. Please try again.');
      showErrorToast('FETCH_ERROR', 'Failed to load matches. Please try again.');
      // Don't clear existing matches on error - keep showing what we have
    } finally {
      setLoading(false);
    }
  }, [selectedDate]); // Add selectedDate as dependency

  // Fetch matches when date changes
  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // When user changes league via pill, update the URL too
  const handleLeagueChange = (leagueId: string | null) => {
    if (leagueId === 'live') {
      setShowOnlyLive(true);
      setSelectedLeague('live');
    } else {
      setShowOnlyLive(false);
      setSelectedLeague(leagueId);
    }
    if (leagueId && leagueId !== 'live') {
      history.replace(`/matches?league=${leagueId}`);
    } else {
      history.replace('/matches');
    }
  };

  // Apply league filter
  const filterByLeague = (matches: Match[]): Match[] => {
    if (!selectedLeague) return matches;
    return matches.filter((m) => m.leagueId === selectedLeague);
  };

  const filteredLive = filterByLeague(liveMatches);
  const filteredUpcoming = filterByLeague(upcomingMatches);
  const filteredFinished = filterByLeague(finishedMatches);

  // If live filter is active, only show live matches
  // FINAL GUARD: Remove live matches from display if selectedDate is not today
  const isToday = getDayDifference(selectedDate) === 0;
  const filteredLiveForDisplay = isToday ? filteredLive : [];
  const matchesToShow = showOnlyLive
    ? (isToday ? liveMatches : [])
    : [...filteredLiveForDisplay, ...filteredUpcoming, ...filteredFinished];
  const followingMatches = getFollowingMatches(matchesToShow);

  return (
    <div className="matches-page">
      {/* Page heading */}
      <div className="matches-page-header">
        <div className="header-title-section">
          <h1 className="matches-title">Football Matches</h1>
        </div>
        <p className="matches-subtitle">Live scores and upcoming fixtures</p>
      </div>

      {/* Compact inline filters */}
      <div className="inline-filters">
        <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />
        <LeagueFilter
          selectedLeague={selectedLeague}
          onChange={handleLeagueChange}
          expanded={true}
          showOnlyLive={showOnlyLive}
          setShowOnlyLive={setShowOnlyLive}
        />
      </div>

      {/* Following card: show if any followed team has a match today */}
      {followingMatches.length > 0 && (
        <div className="league-matches-card">
          <div className="league-card-header" onClick={() => setFollowingCollapsed(v => !v)} style={{ cursor: 'pointer' }}>
            <h3 className="league-card-title">
              <IonIcon icon={star} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Following
            </h3>
            <div className="header-spacer"></div>
            <button className={`collapse-toggle ${followingCollapsed ? 'collapsed' : ''}`} aria-label="Toggle following" tabIndex={-1} style={{ background: 'none', border: 'none', outline: 'none' }}>
              <IonIcon icon={chevronDownOutline} />
            </button>
          </div>
          <div className={`league-matches-list${followingCollapsed ? ' collapsed' : ''}`}>
            {!followingCollapsed && followingMatches.map((match) => (
              <MatchItem key={match.id} match={match} />
            ))}
          </div>
        </div>
      )}
      {/* Loading state */}
      {loading && (
        <div className="matches-loading">
          <IonSpinner name="crescent" />
          <p>Loading matches...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="matches-error">
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={fetchMatches}>
            Retry
          </button>
        </div>
      )}

      {/* Matches grouped by league only */}
      {matchesToShow.length > 0 && (
        <div>
          {Array.from(groupMatchesByLeague(matchesToShow))
            .map(([leagueId, leagueMatches]) => {
              const league = getLeagueById(leagueId);
              if (!league) return null;
              return (
                <LeagueMatchesGroup
                  key={leagueId}
                  league={league}
                  matches={leagueMatches}
                />
              );
            })}
        </div>
      )}

      {/* Empty state */}
          {!loading && !error && matchesToShow.length === 0 && (
        <div className="matches-empty">
          <IonIcon icon={calendarOutline} className="empty-icon" />
          <p className="empty-title">No matches found</p>
          <p className="empty-subtitle">Try selecting a different date or league</p>
        </div>
      )}
    </div>
  );
};

export default MatchesPage;

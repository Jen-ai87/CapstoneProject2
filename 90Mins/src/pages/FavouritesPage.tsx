import { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { IonIcon, IonSpinner } from '@ionic/react';
import { starOutline, addOutline, closeOutline, lockClosedOutline, trophyOutline, calendarOutline, flashOutline } from 'ionicons/icons';
import FavouriteCard from '../components/FavouriteCard';
import { getLeagueById, getTeamById, getAllTeams, mapCompetitionCodeToLeagueId } from '../data/dataHelpers';
import { FavouriteTeam, Match } from '../data/types';
import { useAuth } from '../context/AuthContext';
import footballApi from '../services/footballApi';
import { mapApiMatchToMatch } from '../services/apiMapper';
import { showErrorToast, showInfoToast } from '../services/toastNotification';
import Logger from '../services/logger';
import { useMatchReminders } from '../hooks/useMatchReminders';
import {
  addUserFavouriteTeam,
  fetchUserFavouriteTeamIds,
  getCachedUserFavouriteTeamIds,
  removeUserFavouriteTeam,
} from '../services/userFavourites';
import './FavouritesPage.css';

// Check if we should use mock data
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const logger = new Logger('FavouritesPage');
const NEXT_MATCH_LOOKAHEAD_DAYS = 5;

const mapTeamIdsToFavourites = (teamIds: string[]): FavouriteTeam[] =>
  teamIds.map((teamId) => ({ teamId, nextMatch: null }));

const areTeamIdListsEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, idx) => id === b[idx]);

const FavouritesPage: React.FC = () => {
  const { isAuthenticated, openAuthModal, user } = useAuth();
  const history = useHistory();
  const [favourites, setFavourites] = useState<FavouriteTeam[]>([]);
  const [isLoadingFavourites, setIsLoadingFavourites] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMatches, setLoadingMatches] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Setup match reminders for upcoming matches
  useMatchReminders({
    enabled: isAuthenticated && !USE_MOCK_DATA,
    userId: user?.id,
    onReminder: (match) => {
      const title = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
      const message = `Match starting in 15 minutes at ${match._kickoffTime}`;
      logger.info(`[Reminder] ${title} - ${message}`);
      showInfoToast(`⏰ ${message} - ${title}`);
    },
  });

  // Load saved favourites for the current signed-in user.
  useEffect(() => {
    let cancelled = false;

    const loadFavourites = async () => {
      if (!isAuthenticated || !user?.id) {
        setFavourites([]);
        setLoadingMatches(false);
        return;
      }

      const cachedTeamIds = getCachedUserFavouriteTeamIds(user.id);
      const cachedFavourites = mapTeamIdsToFavourites(cachedTeamIds);

      setFavourites(cachedFavourites);
      setIsLoadingFavourites(cachedFavourites.length === 0);

      if (!USE_MOCK_DATA && cachedFavourites.length > 0) {
        void fetchNextMatches(cachedFavourites, { showSpinner: false });
      }

      const teamIds = await fetchUserFavouriteTeamIds(user.id);
      if (cancelled) return;

      if (areTeamIdListsEqual(teamIds, cachedTeamIds)) {
        setIsLoadingFavourites(false);
        return;
      }

      const loadedFavourites = mapTeamIdsToFavourites(teamIds);
      setFavourites(loadedFavourites);
      setIsLoadingFavourites(false);

      if (!USE_MOCK_DATA && loadedFavourites.length > 0) {
        await fetchNextMatches(loadedFavourites, { showSpinner: true });
      } else {
        setLoadingMatches(false);
      }
    };

    loadFavourites();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!showSearch) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchPanelRef.current && !searchPanelRef.current.contains(target)) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSearch]);

  useEffect(() => {
    if (showSearch) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [showSearch]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatMatchDate = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  const formatMatchTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${meridiem}`;
  };

  const fetchNextMatches = async (teamsList = favourites, options: { showSpinner?: boolean } = {}) => {
    const { showSpinner = false } = options;

    if (showSpinner) {
      setLoadingMatches(true);
    }

    try {
      const { liveMatches } = await import('../data/matches');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const datePromises = [];
      for (let i = 0; i < NEXT_MATCH_LOOKAHEAD_DAYS; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = formatDate(date);
        datePromises.push(
          footballApi.getFixturesByDate(dateStr)
            .then((response) => ({ date: dateStr, response }))
            .catch(() => null)
        );
      }

      const results = await Promise.all(datePromises);
      const allMatches: Array<Match & { utcDate?: string }> = [];

      allMatches.push(...liveMatches);

      for (const result of results) {
        if (result && result.response) {
          const response = result.response as any;
          if (response.matches && Array.isArray(response.matches)) {
            for (const apiMatch of response.matches) {
              try {
                const competitionCode = apiMatch.competition?.code || '';
                const leagueId = mapCompetitionCodeToLeagueId(competitionCode, 'other');
                const match = mapApiMatchToMatch(apiMatch, leagueId);
                if (match.status === 'upcoming') {
                  allMatches.push({ ...match, utcDate: apiMatch.utcDate });
                }
              } catch {
                // Silently skip matches that fail to map
              }
            }
          }
        }
      }

      const normalizeTeamName = (name: string): string => {
        let normalized = name
          .toLowerCase()
          .replace(/[ü]/g, 'u')
          .replace(/[ö]/g, 'o')
          .replace(/[ä]/g, 'a')
          .replace(/[é]/g, 'e')
          .replace(/[è]/g, 'e')
          .replace(/^(fc|cf|ac|sc|bk|afc|cfc|rb)\s+/i, '')
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        return normalized
          .replace(/\bmunchen\b/g, 'munich')
          .replace(/\bköln\b/g, 'cologne')
          .replace(/\bdüsseldorf\b/g, 'dusseldorf')
          .replace(/\blyon\b/g, 'lyon')
          .replace(/\bsão paulo\b/g, 'sao paulo')
          .replace(/\bmönchengladbach\b/g, 'moenchengladbach')
          .replace(/\bm\s*gladbach\b/g, 'moenchengladbach');
      };

      const updatedFavourites = teamsList.map((fav) => {
        const team = getTeamById(fav.teamId);
        if (!team) {
          return fav;
        }

        const teamMatches = allMatches.filter((match) => {
          const isHomeMatchById = match.homeTeam.teamId === team.id;
          const isAwayMatchById = match.awayTeam.teamId === team.id;

          const teamNameNormalized = normalizeTeamName(team.name);
          const homeTeamNormalized = normalizeTeamName(match.homeTeam.name || '');
          const awayTeamNormalized = normalizeTeamName(match.awayTeam.name || '');

          const isHomeMatchByName = homeTeamNormalized && (
            homeTeamNormalized === teamNameNormalized ||
            homeTeamNormalized.includes(teamNameNormalized) ||
            teamNameNormalized.includes(homeTeamNormalized)
          );
          const isAwayMatchByName = awayTeamNormalized && (
            awayTeamNormalized === teamNameNormalized ||
            awayTeamNormalized.includes(teamNameNormalized) ||
            teamNameNormalized.includes(awayTeamNormalized)
          );

          return isHomeMatchById || isAwayMatchById || isHomeMatchByName || isAwayMatchByName;
        });

        if (teamMatches.length === 0) {
          return { ...fav, nextMatch: null };
        }

        teamMatches.sort((a, b) => {
          const dateA = a.utcDate ? new Date(a.utcDate).getTime() : 0;
          const dateB = b.utcDate ? new Date(b.utcDate).getTime() : 0;
          return dateA - dateB;
        });

        const nextMatch = teamMatches[0];
        const teamNameNormalized = normalizeTeamName(team.name);
        const homeTeamNormalized = normalizeTeamName(nextMatch.homeTeam.name || '');
        const awayTeamNormalized = normalizeTeamName(nextMatch.awayTeam.name || '');

        const isHomeById = nextMatch.homeTeam.teamId === team.id;
        const isAwayById = nextMatch.awayTeam.teamId === team.id;
        const isHomeByName = homeTeamNormalized && (
          homeTeamNormalized === teamNameNormalized ||
          homeTeamNormalized.includes(teamNameNormalized) ||
          teamNameNormalized.includes(homeTeamNormalized)
        );

        const isHome = isHomeById || (isHomeByName && !isAwayById);
        const opponentTeamId = isHome ? nextMatch.awayTeam.teamId : nextMatch.homeTeam.teamId;
        const opponentTeam = getTeamById(opponentTeamId);
        const opponentName = isHome
          ? (opponentTeam?.name || nextMatch.awayTeam.name || 'Unknown')
          : (opponentTeam?.name || nextMatch.homeTeam.name || 'Unknown');

        let matchDateStr = formatMatchDate(new Date());
        let matchTimeStr = nextMatch.kickoff || 'TBA';

        if (nextMatch.utcDate) {
          const matchDateTime = new Date(nextMatch.utcDate);
          matchDateStr = formatMatchDate(matchDateTime);
          matchTimeStr = formatMatchTime(matchDateTime);
        }

        return {
          ...fav,
          nextMatch: {
            opponent: opponentName,
            date: matchDateStr,
            time: matchTimeStr,
          },
        };
      });

      setFavourites(updatedFavourites);
    } catch (err) {
      logger.error('Failed to fetch next matches:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch matches';
      showErrorToast('FETCH_ERROR', `Could not load next matches: ${errorMsg}`);
    } finally {
      if (showSpinner) {
        setLoadingMatches(false);
      }
    }
  };

  const handleRemove = async (teamId: string) => {
    if (!user?.id) return;

    const previous = favourites;
    const next = previous.filter((f) => f.teamId !== teamId);
    setFavourites(next);

    const result = await removeUserFavouriteTeam(user.id, teamId);
    if (!result.ok) {
      setFavourites(previous);
      showErrorToast('FAVOURITES_ERROR', `Could not remove team: ${result.error || 'Unknown error'}`);
      return;
    }

    if (!USE_MOCK_DATA && next.length > 0) {
      fetchNextMatches(next, { showSpinner: false });
    }
  };

  const handleTeamClick = (teamId: string) => {
    history.push(`/club/${teamId}`);
  };

  const handleAdd = async (teamId: string) => {
    if (!user?.id) return;
    if (favourites.some((f) => f.teamId === teamId)) return;

    const previous = favourites;
    const newFavourites = [...favourites, { teamId, nextMatch: null }];
    setFavourites(newFavourites);
    setSearchQuery('');

    const result = await addUserFavouriteTeam(user.id, teamId);
    if (!result.ok) {
      setFavourites(previous);
      showErrorToast('FAVOURITES_ERROR', `Could not save team: ${result.error || 'Unknown error'}`);
      return;
    }
    
    // Refresh match data after adding a team (pass new list)
    if (!USE_MOCK_DATA) {
      fetchNextMatches(newFavourites, { showSpinner: false });
    }
  };

  const handleToggleSearch = () => {
    setShowSearch((prev) => {
      const next = !prev;
      if (!next) {
        setSearchQuery('');
      }
      return next;
    });
  };

  // Filter teams for search — use getAllTeams() to include both static and API teams
  const allTeams = getAllTeams(); // This includes both API cached teams and static teams
  const availableTeams = allTeams.filter((t) => !favourites.some((f) => f.teamId === t.id));
  
  const searchResults = searchQuery.trim().length > 0
    ? availableTeams.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.abbreviation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.city?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableTeams; // Show all available teams when search is empty

  const upcomingCount = favourites.filter((f) => f.nextMatch !== null).length;

  /* ── Auth guard: show sign-in prompt if not logged in ── */
  if (!isAuthenticated) {
    return (
      <div className="favourites-page">
        <div className="favourites-page-header">
          <h1 className="favourites-title">My Favourites</h1>
          <p className="favourites-subtitle">Track your favourite teams and never miss a match</p>
        </div>

        <div className="favourites-auth-guard">
          <div className="auth-guard-icon-wrapper">
            <IonIcon icon={lockClosedOutline} className="auth-guard-icon" />
          </div>
          <h3 className="auth-guard-title">Sign in required</h3>
          <p className="auth-guard-subtitle">Create an account or sign in to start following your favorite teams and get personalized updates</p>
          <div className="auth-guard-actions">
            <button className="auth-guard-btn auth-guard-btn-primary" onClick={() => openAuthModal('signin')}>
              Sign In
            </button>
            <button className="auth-guard-btn auth-guard-btn-secondary" onClick={() => openAuthModal('signup')}>
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="favourites-page">
      {/* Page heading */}
      <div className="favourites-page-header">
        <h1 className="favourites-title">My Favourites</h1>
        <p className="favourites-subtitle">Track your favourite teams and never miss a match</p>
      </div>

      {/* Stats cards at top */}
      <div className="favourites-stats-grid">
        <div className="stat-card-modern">
          <div className="stat-icon-wrapper stat-icon-teams">
            <IonIcon icon={trophyOutline} />
          </div>
          <div className="stat-content">
            {loadingMatches ? (
              <IonSpinner name="crescent" className="stat-spinner" />
            ) : (
              <>
                <span className="stat-value-modern">{favourites.length}</span>
                <span className="stat-label-modern">Teams Following</span>
              </>
            )}
          </div>
        </div>
        <div className="stat-card-modern">
          <div className="stat-icon-wrapper stat-icon-upcoming">
            <IonIcon icon={calendarOutline} />
          </div>
          <div className="stat-content">
            {loadingMatches ? (
              <IonSpinner name="crescent" className="stat-spinner" />
            ) : (
              <>
                <span className="stat-value-modern">{upcomingCount}</span>
                <span className="stat-label-modern">Upcoming Matches</span>
              </>
            )}
          </div>
        </div>
        <div className="stat-card-modern">
          <div className="stat-icon-wrapper stat-icon-live">
            <IonIcon icon={flashOutline} />
          </div>
          <div className="stat-content">
            {loadingMatches ? (
              <IonSpinner name="crescent" className="stat-spinner" />
            ) : (
              <>
                <span className="stat-value-modern">0</span>
                <span className="stat-label-modern">Live Now</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section header + search container */}
      <div className="favourites-section-container" ref={searchPanelRef}>
        {/* Top bar */}
        <div className="favourites-section-bar">
          <div className="favourites-section-left">
            <IonIcon icon={starOutline} className="favourites-star-icon" />
            <span className="favourites-section-label">My Favourites</span>
            {loadingMatches && (
              <span className="loading-indicator">
                <IonSpinner name="crescent" className="loading-spinner-small" />
                <span className="loading-text">Updating matches...</span>
              </span>
            )}
          </div>
          <div className={`add-team-shell ${showSearch ? 'open' : ''}`}>
            {!showSearch ? (
              <button className="add-team-btn" onClick={handleToggleSearch}>
                <IonIcon icon={addOutline} />
                <span>Add Team</span>
              </button>
            ) : (
              <div className="add-team-search-inline">
                <IonIcon icon={addOutline} className="add-team-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="add-team-search-input"
                  placeholder="Search teams to add..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="add-team-search-close"
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  aria-label="Close team search"
                >
                  <IonIcon icon={closeOutline} />
                </button>
              </div>
            )}
          </div>
        </div>

        {showSearch && (
          <div className="search-results-inline">
            {searchQuery.trim().length === 0 ? (
              <div className="search-hint-inline">
                Start typing to search for a team.
              </div>
            ) : searchResults.length > 0 ? (
              <div className="search-results">
                {searchResults.map((team) => {
                  const league = getLeagueById(team.leagueId);
                  return (
                    <div
                      key={team.id}
                      className="search-result-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleAdd(team.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleAdd(team.id);
                        }
                      }}
                      aria-label={`Add ${team.name} to favourites`}
                    >
                      <div className="search-result-left">
                        {team.logo ? (
                          <img src={team.logo} alt={team.name} className="search-result-logo" loading="lazy" />
                        ) : (
                          <span className="search-result-abbr">{team.abbreviation}</span>
                        )}
                        <div className="search-result-info">
                          <span className="search-result-name">{team.name}</span>
                          <span className="search-result-league">{league?.name}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="search-result-add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdd(team.id);
                        }}
                        aria-label={`Add ${team.name} to favourites`}
                      >
                        <IonIcon icon={addOutline} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="search-no-results">
                <p>No teams found matching "{searchQuery}"</p>
                {allTeams.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())) && (
                  <p style={{ fontSize: '12px', marginTop: '8px', opacity: '0.7' }}>
                    This team may already be in your favourites
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Favourite team cards */}
      <div className="favourites-list-wrapper">
        {favourites.length > 0 ? (
          <div className="favourites-list">
            {favourites.map((fav) => (
              <FavouriteCard
                key={fav.teamId}
                favourite={fav}
                onRemove={handleRemove}
                onClick={() => handleTeamClick(fav.teamId)}
              />
            ))}
          </div>
        ) : (
          <div className="favourites-empty-modern">
            <div className="empty-icon-wrapper">
              <IonIcon icon={starOutline} className="empty-icon-large" />
            </div>
            <h3 className="empty-title-large">No favourite teams yet</h3>
            <p className="empty-subtitle-large">Start following teams to get quick access to their fixtures, standings, and live updates</p>
            <button className="empty-add-btn" onClick={handleToggleSearch}>
              <IonIcon icon={addOutline} />
              <span>Add Your First Team</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavouritesPage;

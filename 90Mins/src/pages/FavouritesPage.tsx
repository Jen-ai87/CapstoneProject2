import { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { starOutline, addOutline, closeOutline, lockClosedOutline } from 'ionicons/icons';
import FavouriteCard from '../components/FavouriteCard';
import { favouriteTeams } from '../data/favourites';
import { teams } from '../data/teams';
import { getLeagueById } from '../data/leagues';
import { FavouriteTeam } from '../data/types';
import { useAuth } from '../context/AuthContext';
import './FavouritesPage.css';

const FavouritesPage: React.FC = () => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [favourites, setFavourites] = useState<FavouriteTeam[]>(favouriteTeams);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleRemove = (teamId: string) => {
    setFavourites((prev) => prev.filter((f) => f.teamId !== teamId));
  };

  const handleAdd = (teamId: string) => {
    if (favourites.some((f) => f.teamId === teamId)) return;
    setFavourites((prev) => [...prev, { teamId, nextMatch: null }]);
    setSearchQuery('');
  };

  const handleToggleSearch = () => {
    setShowSearch((prev) => !prev);
    setSearchQuery('');
  };

  // Filter teams for search — exclude already favourited, match by name
  const searchResults = searchQuery.trim().length > 0
    ? teams.filter(
        (t) =>
          !favourites.some((f) => f.teamId === t.id) &&
          t.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const upcomingCount = favourites.filter((f) => f.nextMatch !== null).length;

  /* ── Auth guard: show sign-in prompt if not logged in ── */
  if (!isAuthenticated) {
    return (
      <div className="favourites-page">
        <div className="favourites-page-header">
          <h1 className="favourites-title">My Favourites</h1>
          <p className="favourites-subtitle">Track your favourite teams</p>
        </div>

        <div className="favourites-auth-guard">
          <IonIcon icon={lockClosedOutline} className="auth-guard-icon" />
          <p className="auth-guard-title">Sign in required</p>
          <p className="auth-guard-subtitle">Please sign in to view and manage your favourite teams</p>
          <button className="auth-guard-btn" onClick={() => openAuthModal('signin')}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="favourites-page">
      {/* Page heading */}
      <div className="favourites-page-header">
        <h1 className="favourites-title">My Favourites</h1>
        <p className="favourites-subtitle">Track your favourite teams</p>
      </div>

      {/* Section header + search container */}
      <div className="favourites-section-container">
        {/* Top bar */}
        <div className="favourites-section-bar">
          <div className="favourites-section-left">
            <IonIcon icon={starOutline} className="favourites-star-icon" />
            <span className="favourites-section-label">My Favourites</span>
          </div>
          <button className="add-team-btn" onClick={handleToggleSearch}>
            <IonIcon icon={showSearch ? closeOutline : addOutline} />
            <span>{showSearch ? 'Close' : 'Add Team'}</span>
          </button>
        </div>

        {/* Search panel — shown when Add Team is clicked */}
        {showSearch && (
          <div className="search-panel">
            <p className="search-panel-label">Search for a team to add to favourites</p>
            <input
              type="text"
              className="search-panel-input"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((team) => {
                  const league = getLeagueById(team.leagueId);
                  return (
                    <div key={team.id} className="search-result-item">
                      <div className="search-result-left">
                        <span className="search-result-abbr">{team.abbreviation}</span>
                        <div className="search-result-info">
                          <span className="search-result-name">{team.name}</span>
                          <span className="search-result-league">{league?.name}</span>
                        </div>
                      </div>
                      <button
                        className="search-result-add-btn"
                        onClick={() => handleAdd(team.id)}
                      >
                        <IonIcon icon={addOutline} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Favourite team cards */}
      <div className="favourites-list">
        {favourites.map((fav) => (
          <FavouriteCard
            key={fav.teamId}
            favourite={fav}
            onRemove={handleRemove}
          />
        ))}
        {favourites.length === 0 && (
          <div className="favourites-empty">
            <p>No favourite teams yet. Add a team to get started!</p>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="favourites-stats">
        <div className="stat-card">
          <span className="stat-label">Teams Following</span>
          <span className="stat-value">{favourites.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Upcoming Matches</span>
          <span className="stat-value">{upcomingCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Live Now</span>
          <span className="stat-value">1</span>
        </div>
      </div>
    </div>
  );
};

export default FavouritesPage;

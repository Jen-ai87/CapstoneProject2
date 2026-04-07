import { useState, useEffect, useRef } from 'react';
import { IonIcon, IonToast } from '@ionic/react';
import { 
  searchOutline, 
  notificationsOutline, 
  personCircleOutline,
  happyOutline,
  footballOutline,
  flameOutline,
  flashOutline,
  trophyOutline,
  menuOutline,
  closeOutline,
  homeOutline,
  checkmarkOutline,
  starOutline,
  logOutOutline
} from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationDrawer from './NotificationDrawer';
import { teams } from '../data/teams';
import { leagues } from '../data/leagues';
import './Header.css';

interface SearchResult {
  type: 'team' | 'league' | 'country';
  id: string;
  name: string;
  secondaryInfo?: string;
  logo?: string;
}

const AVATAR_ICON_BY_KEY: Record<string, string> = {
  personCircleOutline,
  happyOutline,
  footballOutline,
  flameOutline,
  flashOutline,
  trophyOutline,
  starOutline,
};

const Header: React.FC = () => {
  const { isAuthenticated, user, openAuthModal, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const history = useHistory();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false);
  const [showSignOutToast, setShowSignOutToast] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    
    return () => {
      document.body.classList.remove('mobile-menu-open');
    };
  }, [mobileMenuOpen]);

  // Focus mobile search input when modal opens
  useEffect(() => {
    if (showMobileSearch && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [showMobileSearch]);

  // Search logic
  const performSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search teams
    teams.forEach(team => {
      if (
        team.name.toLowerCase().includes(lowercaseQuery) ||
        team.abbreviation.toLowerCase().includes(lowercaseQuery) ||
        team.city?.toLowerCase().includes(lowercaseQuery)
      ) {
        results.push({
          type: 'team',
          id: team.id,
          name: team.name,
          secondaryInfo: team.city,
          logo: team.logo,
        });
      }
    });

    // Search leagues (and countries)
    const uniqueCountries = new Set<string>();
    leagues.forEach(league => {
      if (league.name.toLowerCase().includes(lowercaseQuery)) {
        results.push({
          type: 'league',
          id: league.id,
          name: league.name,
          secondaryInfo: league.country,
          logo: league.logo,
        });
      }
      
      // Add country if it matches
      if (league.country && league.country.toLowerCase().includes(lowercaseQuery)) {
        if (!uniqueCountries.has(league.country)) {
          uniqueCountries.add(league.country);
          results.push({
            type: 'country',
            id: league.country.toLowerCase().replace(/\s+/g, '-'),
            name: league.country,
            secondaryInfo: `${leagues.filter(l => l.country === league.country).length} league(s)`,
            logo: leagues.find(l => l.country === league.country)?.flag,
          });
        }
      }
    });

    setSearchResults(results.slice(0, 8)); // Limit to 8 results
    setShowSearchResults(true);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchResults]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Close mobile user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileUserMenuRef.current && !mobileUserMenuRef.current.contains(event.target as Node)) {
        setShowMobileUserMenu(false);
      }
    };

    if (showMobileUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileUserMenu]);

  const handleSearchResultClick = (result: SearchResult) => {
    if (result.type === 'team') {
      history.push(`/club/${result.id}`);
    } else if (result.type === 'league') {
      history.push(`/league/${result.id}`);
    } else if (result.type === 'country') {
      // Filter by country - for now, show first league of that country
      const countryLeague = leagues.find(l => l.country === result.name);
      if (countryLeague) {
        history.push(`/league/${countryLeague.id}`);
      }
    }
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const navItems = [
    { icon: homeOutline, label: 'Matches', path: '/matches' },
    { icon: checkmarkOutline, label: 'Standings', path: '/standings' },
    { icon: starOutline, label: 'Favourites', path: '/favourites' },
  ];

  const quickAccessLeagues = [
    { label: 'Premier League', leagueId: 'premier-league' },
    { label: 'La Liga', leagueId: 'la-liga' },
    { label: 'Serie A', leagueId: 'serie-a' },
    { label: 'Bundesliga', leagueId: 'bundesliga' },
    { label: 'Ligue 1', leagueId: 'ligue-1' },
    { label: 'Champions League', leagueId: 'champions-league' },
  ];

  const handleNavigation = (path: string) => {
    history.push(path);
    setMobileMenuOpen(false);
  };

  const handleLeagueClick = (leagueId: string) => {
    history.push(`/league/${leagueId}`);
    setMobileMenuOpen(false);
  };

  const handleAuthClick = () => {
    openAuthModal('signin');
    setMobileMenuOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    setMobileMenuOpen(false);
    setShowSignOutToast(true);
    history.push('/matches');
  };

  const closeMobileSearch = () => {
    setShowMobileSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const activeLeagueId = new URLSearchParams(location.search).get('league');
  const userAvatarIcon = (user?.avatarIcon && AVATAR_ICON_BY_KEY[user.avatarIcon]) || personCircleOutline;
  const userAvatarColor = user?.avatarColor || '#00B8DB';

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <IonIcon icon={menuOutline} />
          </button>
          <button 
            className="header-logo"
            onClick={() => handleNavigation('/matches')}
            aria-label="Go to home"
          >
            90mins
          </button>
        </div>

        <div className="header-search" ref={searchContainerRef}>
          <IonIcon icon={searchOutline} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search for leagues, teams..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => performSearch(e.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
          />
          
          {/* Search results dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}-${index}`}
                  className={`search-result-item search-result-${result.type}`}
                  onClick={() => handleSearchResultClick(result)}
                >
                  {result.logo && (
                    <img src={result.logo} alt={result.name} className="search-result-logo" loading="lazy" />
                  )}
                  <div className="search-result-info">
                    <span className="search-result-name">{result.name}</span>
                    {result.secondaryInfo && (
                      <span className="search-result-secondary">{result.secondaryInfo}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {showSearchResults && searchQuery && searchResults.length === 0 && (
            <div className="search-results">
              <div className="search-result-empty">
                <span>No results found for "{searchQuery}"</span>
              </div>
            </div>
          )}
        </div>

        <div className="header-actions">
          {/* Mobile search button */}
          <button
            className="mobile-search-btn"
            aria-label="Search"
            onClick={() => setShowMobileSearch(true)}
          >
            <IonIcon icon={searchOutline} />
          </button>

          {isAuthenticated && (
            <button
              className="notification-btn"
              aria-label="Notifications"
              onClick={() => setShowNotifications((prev) => !prev)}
            >
              <IonIcon icon={notificationsOutline} />
              {unreadCount > 0 && (
                <span className="notif-count-badge">{unreadCount}</span>
              )}
            </button>
          )}

          {/* Mobile user avatar */}
          {isAuthenticated && (
            <div className="mobile-user-menu-container" ref={mobileUserMenuRef}>
              <button
                className="mobile-user-btn"
                aria-label="User menu"
                onClick={() => setShowMobileUserMenu(!showMobileUserMenu)}
              >
                <IonIcon icon={userAvatarIcon} style={{ color: userAvatarColor }} />
              </button>
              
              {showMobileUserMenu && (
                <div className="mobile-user-dropdown">
                  <button 
                    className="mobile-user-menu-item"
                    onClick={() => {
                      setShowMobileUserMenu(false);
                      history.push('/profile');
                    }}
                  >
                    <IonIcon icon={personCircleOutline} />
                    <span>Go to Profile</span>
                  </button>
                  <button 
                    className="mobile-user-menu-item"
                    onClick={() => {
                      setShowMobileUserMenu(false);
                      signOut();
                      setShowSignOutToast(true);
                      history.push('/matches');
                    }}
                  >
                    <IonIcon icon={logOutOutline} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {isAuthenticated ? (
            <div className="header-user" ref={userMenuRef}>
              <button 
                className="header-user-link" 
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label="User menu"
              >
                <span className="header-user-avatar" style={{ background: `${userAvatarColor}22`, borderColor: `${userAvatarColor}55` }}>
                  <IonIcon icon={userAvatarIcon} className="header-user-icon" style={{ color: userAvatarColor }} />
                </span>
                <span className="header-user-name">{user?.name}</span>
              </button>
              
              {showUserMenu && (
                <div className="header-user-dropdown">
                  <button 
                    className="header-user-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      history.push('/profile');
                    }}
                  >
                    <IonIcon icon={personCircleOutline} />
                    <span>Go to Profile</span>
                  </button>
                  <button 
                    className="header-user-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      signOut();
                      setShowSignOutToast(true);
                      history.push('/matches');
                    }}
                  >
                    <IonIcon icon={logOutOutline} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="sign-in-btn" onClick={() => openAuthModal('signin')}>
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-menu">
            <div className="mobile-menu-header">
              <div className="header-logo">90mins</div>
              <button 
                className="mobile-menu-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <IonIcon icon={closeOutline} />
              </button>
            </div>

            <nav className="mobile-menu-nav">
              {navItems.map((item) => {
                const isActive =
                  item.path === '/matches'
                    ? location.pathname === '/matches' || location.pathname.startsWith('/match/')
                    : location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <IonIcon icon={item.icon} className="mobile-nav-icon" />
                    <span className="mobile-nav-label">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mobile-quick-access">
              <h3 className="mobile-quick-access-title">QUICK ACCESS</h3>
              {quickAccessLeagues.map((league) => (
                <button
                  key={league.leagueId}
                  className={`mobile-league-link ${activeLeagueId === league.leagueId ? 'active' : ''}`}
                  onClick={() => handleLeagueClick(league.leagueId)}
                >
                  {league.label}
                </button>
              ))}
              
              {!isAuthenticated && (
                <button className="mobile-sign-in-btn-menu" onClick={handleAuthClick}>
                  Sign In
                </button>
              )}
            </div>

            <div className="mobile-menu-footer">
              {isAuthenticated ? (
                <>
                  <button className="mobile-profile-btn" onClick={() => handleNavigation('/profile')}>
                    <IonIcon icon={personCircleOutline} className="mobile-profile-icon" />
                    <span>{user?.name}</span>
                  </button>
                  <button className="mobile-sign-out-btn" onClick={handleSignOut}>
                    Sign Out
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* Mobile Search Modal */}
      {showMobileSearch && (
        <>
          <div className="mobile-search-overlay" onClick={closeMobileSearch} />
          <div className="mobile-search-modal">
            <div className="mobile-search-header">
              <button 
                className="mobile-search-close"
                onClick={closeMobileSearch}
                aria-label="Close search"
              >
                <IonIcon icon={closeOutline} />
              </button>
              <div className="mobile-search-input-wrapper">
                <IonIcon icon={searchOutline} className="mobile-search-icon" />
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  placeholder="Search for leagues, teams..."
                  className="mobile-search-input"
                  value={searchQuery}
                  onChange={(e) => performSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Search results */}
            <div className="mobile-search-results">
              {searchResults.length > 0 ? (
                searchResults.map((result, index) => (
                  <div
                    key={`${result.type}-${result.id}-${index}`}
                    className={`mobile-search-result-item mobile-search-result-${result.type}`}
                    onClick={() => {
                      handleSearchResultClick(result);
                      closeMobileSearch();
                    }}
                  >
                    {result.logo && (
                      <img src={result.logo} alt={result.name} className="mobile-search-result-logo" loading="lazy" />
                    )}
                    <div className="mobile-search-result-info">
                      <span className="mobile-search-result-name">{result.name}</span>
                      {result.secondaryInfo && (
                        <span className="mobile-search-result-secondary">{result.secondaryInfo}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : searchQuery ? (
                <div className="mobile-search-empty">
                  <span>No results found for "{searchQuery}"</span>
                </div>
              ) : (
                <div className="mobile-search-empty">
                  <span>Start typing to search...</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {isAuthenticated && (
        <NotificationDrawer
          open={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      )}

      <IonToast
        isOpen={showSignOutToast}
        onDidDismiss={() => setShowSignOutToast(false)}
        message="You have been signed out successfully"
        duration={2000}
        position="top"
        color="success"
      />
    </>
  );
};

export default Header;

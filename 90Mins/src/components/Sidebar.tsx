import { IonIcon } from '@ionic/react';
import { homeOutline, checkmarkOutline, starOutline } from 'ionicons/icons';
import { useLocation, useHistory } from 'react-router-dom';
import './Sidebar.css';

interface NavItem {
  icon: string;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: homeOutline, label: 'Matches', path: '/matches' },
  { icon: checkmarkOutline, label: 'Standings', path: '/standings' },
  { icon: starOutline, label: 'Favourites', path: '/favourites' },
];

interface QuickAccessLeague {
  label: string;
  leagueId: string;
}

const quickAccessLeagues: QuickAccessLeague[] = [
  { label: 'Premier League', leagueId: 'premier-league' },
  { label: 'La Liga', leagueId: 'la-liga' },
  { label: 'Seria A', leagueId: 'serie-a' },
  { label: 'Bundesliga', leagueId: 'bundesliga' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const history = useHistory();

  // Detect active league from URL query param
  const activeLeagueId = new URLSearchParams(location.search).get('league');

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive =
            item.path === '/matches'
              ? location.pathname === '/matches' || location.pathname.startsWith('/match/')
              : location.pathname === item.path;
          return (
            <button
              key={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => history.push(item.path)}
            >
              <IonIcon icon={item.icon} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="quick-access">
        <h3 className="quick-access-title">QUICK ACCESS</h3>
        {quickAccessLeagues.map((league) => (
          <button
            key={league.leagueId}
            className={`league-link ${activeLeagueId === league.leagueId ? 'active' : ''}`}
            onClick={() => history.push(`/matches?league=${league.leagueId}`)}
          >
            {league.label}
          </button>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;

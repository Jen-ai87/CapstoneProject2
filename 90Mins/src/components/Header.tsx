import { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { searchOutline, notificationsOutline, personCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header: React.FC = () => {
  const { isAuthenticated, user, openAuthModal, signOut } = useAuth();
  const history = useHistory();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <header className="app-header">
        <div className="header-logo">90mins</div>

        <div className="header-search">
          <IonIcon icon={searchOutline} className="search-icon" />
          <input
            type="text"
            placeholder="Search for leagues, teams..."
            className="search-input"
          />
        </div>

        <div className="header-actions">
          {isAuthenticated && (
            <button
              className="notification-btn"
              aria-label="Notifications"
              onClick={() => setShowNotifications((prev) => !prev)}
            >
              <IonIcon icon={notificationsOutline} />
              <span className="notif-count-badge">3</span>
            </button>
          )}

          {isAuthenticated ? (
            <div className="header-user">
              <button className="header-user-link" onClick={() => history.push('/profile')}>
                <IonIcon icon={personCircleOutline} className="header-user-icon" />
                <span className="header-user-name">John Smith</span>
              </button>
              <button className="sign-out-btn" onClick={signOut}>Sign Out</button>
            </div>
          ) : (
            <button className="sign-in-btn">
              Sign In
            </button>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;

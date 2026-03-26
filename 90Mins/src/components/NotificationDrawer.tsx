import { IonIcon } from '@ionic/react';
import { closeOutline, trashOutline, checkmarkDoneOutline } from 'ionicons/icons';
import { useNotifications } from '../context/NotificationContext';
import { useHistory } from 'react-router-dom';
import './NotificationDrawer.css';

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ open, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const history = useHistory();

  const handleNotificationClick = (notif: any) => {
    if (!notif.unread) return;
    markAsRead(notif.id);
    if (notif.matchId) {
      onClose();
      // Ensure matchId is numeric (strip 'match-' or 'fixture-' prefix if present)
      const matchId = String(notif.matchId).replace(/^(match-|fixture-)/, '');
      history.push(`/match/${matchId}`);
    }
  };

  return (
    <>
      {/* Overlay */}
      {open && <div className="notif-overlay" onClick={onClose} />}

      {/* Drawer */}
      <div className={`notif-drawer ${open ? 'open' : ''}`}>
        {/* Drawer header */}
        <div className="notif-drawer-header">
          <div className="notif-drawer-title-row">
            <h2 className="notif-drawer-title">Notifications</h2>
            {unreadCount > 0 && (
              <span className="notif-unread-badge">{unreadCount}</span>
            )}
          </div>
          <div className="notif-header-actions">
            {notifications.length > 0 && (
              <>
                {unreadCount > 0 && (
                  <button className="notif-action-btn" onClick={markAllAsRead} title="Mark all as read">
                    <IonIcon icon={checkmarkDoneOutline} />
                  </button>
                )}
                <button className="notif-action-btn" onClick={clearAll} title="Clear all">
                  <IonIcon icon={trashOutline} />
                </button>
              </>
            )}
            <button className="notif-close-btn" onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="notif-list">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`notif-item ${notif.unread ? 'unread' : ''} ${notif.matchId ? 'clickable' : ''}`}
                onClick={() => handleNotificationClick(notif)}
                style={{ cursor: notif.matchId && notif.unread ? 'pointer' : 'default' }}
              >
                <div className="notif-icon-wrapper" style={{ color: notif.iconColor }}>
                  <IonIcon icon={notif.icon} />
                </div>
                <div className="notif-content">
                  <span className="notif-item-title">{notif.title}</span>
                  <span className="notif-item-body">{notif.body}</span>
                  <span className="notif-item-time">{notif.time}</span>
                </div>
                {notif.unread && <span className="notif-dot" />}
              </div>
            ))
          ) : (
            <div className="notif-empty">
              <p className="notif-empty-text">No notifications yet</p>
              <p className="notif-empty-subtext">You'll see updates here when your favourite teams play</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;

import { IonIcon } from '@ionic/react';
import {
  closeOutline,
  footballOutline,
  trophyOutline,
  alertCircleOutline,
  megaphoneOutline,
  starOutline,
  timeOutline,
} from 'ionicons/icons';
import './NotificationDrawer.css';

interface Notification {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

const dummyNotifications: Notification[] = [
  {
    id: 'n1',
    icon: footballOutline,
    iconColor: '#00B8DB',
    title: 'GOAL! Man Utd 2 – 2 Liverpool',
    body: "D. Núñez equalises in the 61st minute!",
    time: '2 min ago',
    unread: true,
  },
  {
    id: 'n2',
    icon: footballOutline,
    iconColor: '#00B8DB',
    title: 'GOAL! Man Utd 2 – 1 Liverpool',
    body: 'B. Fernandes scores from a free kick at 45+2\'',
    time: '24 min ago',
    unread: true,
  },
  {
    id: 'n3',
    icon: alertCircleOutline,
    iconColor: '#f59e0b',
    title: 'Yellow Card – Casemiro',
    body: 'Casemiro receives a yellow card for a late tackle',
    time: '55 min ago',
    unread: true,
  },
  {
    id: 'n4',
    icon: timeOutline,
    iconColor: '#8b949e',
    title: 'Half Time: Arsenal 1 – 0 Chelsea',
    body: 'B. Saka\'s goal separates the sides at the break',
    time: '30 min ago',
    unread: false,
  },
  {
    id: 'n5',
    icon: starOutline,
    iconColor: '#00B8DB',
    title: 'Favourite Team Playing',
    body: 'Bayern Munich vs Dortmund kicks off at 18:30',
    time: '1 hr ago',
    unread: false,
  },
  {
    id: 'n6',
    icon: trophyOutline,
    iconColor: '#22c55e',
    title: 'Standings Updated',
    body: 'Premier League table has been updated after today\'s results',
    time: '3 hrs ago',
    unread: false,
  },
  {
    id: 'n7',
    icon: megaphoneOutline,
    iconColor: '#3b82f6',
    title: 'Transfer News',
    body: 'Breaking: Major transfer rumours from the Premier League',
    time: '5 hrs ago',
    unread: false,
  },
  {
    id: 'n8',
    icon: footballOutline,
    iconColor: '#8b949e',
    title: 'Full Time: Barcelona 3 – 1 Real Madrid',
    body: 'Lewandowski, Pedri and Yamal score in El Clásico win',
    time: 'Yesterday',
    unread: false,
  },
];

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ open, onClose }) => {
  const unreadCount = dummyNotifications.filter((n) => n.unread).length;

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
          <button className="notif-close-btn" onClick={onClose}>
            <IonIcon icon={closeOutline} />
          </button>
        </div>

        {/* Notification list */}
        <div className="notif-list">
          {dummyNotifications.map((notif) => (
            <div key={notif.id} className={`notif-item ${notif.unread ? 'unread' : ''}`}>
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
          ))}
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;

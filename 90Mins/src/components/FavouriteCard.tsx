import { useEffect, useRef, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { ellipsisVertical, trashOutline } from 'ionicons/icons';
import { FavouriteTeam } from '../data/types';
import { getTeamById, getLeagueById } from '../data/dataHelpers';
import './FavouriteCard.css';

interface FavouriteCardProps {
  favourite: FavouriteTeam;
  onRemove: (teamId: string) => void;
  onClick?: () => void;
}

const FavouriteCard: React.FC<FavouriteCardProps> = ({ favourite, onRemove, onClick }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuWrapperRef = useRef<HTMLDivElement | null>(null);
  const team = getTeamById(favourite.teamId);
  if (!team) return null;

  const league = getLeagueById(team.leagueId);
  if (!league) return null;

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showMenu) {
      setShowMenu(false);
      onRemove(favourite.teamId);
      return;
    }

    setShowMenu(true);
  };

  useEffect(() => {
    if (!showMenu) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuWrapperRef.current && !menuWrapperRef.current.contains(target)) {
        setShowMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showMenu]);

  return (
    <div className="favourite-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="favourite-card-left">
        {team.logo ? (
          <img src={team.logo} alt={team.name} className="favourite-team-logo" loading="lazy" />
        ) : (
          <span className="favourite-team-abbr">{team.abbreviation}</span>
        )}
        <div className="favourite-team-details">
          <span className="favourite-team-name">{team.name}</span>
          <span className="favourite-league-name">{league.name}</span>
          {favourite.nextMatch && (
            <span className="favourite-next-match">
              Next:{' '}
              <span className="next-match-info">
                vs {favourite.nextMatch.opponent} - {' '}
                {`${favourite.nextMatch.date}, ${favourite.nextMatch.time}`}
              </span>
            </span>
          )}
        </div>
      </div>
      <div className="favourite-menu-wrapper" ref={menuWrapperRef}>
        <button
          className={`favourite-menu-btn${showMenu ? ' open' : ''}`}
          onClick={handleMenuToggle}
          aria-label={showMenu ? 'Delete favourite team' : 'More options'}
          aria-expanded={showMenu}
        >
          <IonIcon icon={ellipsisVertical} className="favourite-menu-icon favourite-menu-icon-ellipsis" />
          <IonIcon icon={trashOutline} className="favourite-menu-icon favourite-menu-icon-trash" />
        </button>
      </div>
    </div>
  );
};

export default FavouriteCard;

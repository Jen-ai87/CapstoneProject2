import { useState } from 'react';
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
  const team = getTeamById(favourite.teamId);
  if (!team) return null;

  const league = getLeagueById(team.leagueId);
  if (!league) return null;

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onRemove(favourite.teamId);
  };

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
      <div className="favourite-menu-wrapper">
        <button
          className="favourite-menu-btn"
          onClick={handleMenuToggle}
          aria-label="More options"
        >
          <IonIcon icon={ellipsisVertical} />
        </button>
        {showMenu && (
          <>
            <div className="favourite-menu-backdrop" onClick={handleMenuToggle} />
            <div className="favourite-menu-dropdown">
              <button className="favourite-menu-item" onClick={handleRemoveClick}>
                <IonIcon icon={trashOutline} />
                <span>Remove from favourites</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FavouriteCard;

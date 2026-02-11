import { IonIcon } from '@ionic/react';
import { trashOutline } from 'ionicons/icons';
import { FavouriteTeam } from '../data/types';
import { getTeamById } from '../data/teams';
import { getLeagueById } from '../data/leagues';
import './FavouriteCard.css';

interface FavouriteCardProps {
  favourite: FavouriteTeam;
  onRemove: (teamId: string) => void;
}

const FavouriteCard: React.FC<FavouriteCardProps> = ({ favourite, onRemove }) => {
  const team = getTeamById(favourite.teamId);
  if (!team) return null;

  const league = getLeagueById(team.leagueId);
  if (!league) return null;

  return (
    <div className="favourite-card">
      <div className="favourite-card-left">
        <span className="favourite-team-abbr">{team.abbreviation}</span>
        <div className="favourite-team-details">
          <span className="favourite-team-name">{team.name}</span>
          <span className="favourite-league-name">{league.name}</span>
          {favourite.nextMatch && (
            <span className="favourite-next-match">
              Next:{' '}
              <span className="next-match-info">
                vs {favourite.nextMatch.opponent} - {favourite.nextMatch.date},{' '}
                {favourite.nextMatch.time}
              </span>
            </span>
          )}
        </div>
      </div>
      <button
        className="favourite-remove-btn"
        onClick={() => onRemove(favourite.teamId)}
        aria-label="Remove from favourites"
      >
        <IonIcon icon={trashOutline} />
      </button>
    </div>
  );
};

export default FavouriteCard;

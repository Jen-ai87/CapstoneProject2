import { IonIcon } from '@ionic/react';
import { locationOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { Match } from '../data/types';
import { getTeamById } from '../data/teams';
import { getLeagueById } from '../data/leagues';
import './MatchCard.css';

interface MatchCardProps {
  match: Match;
}

const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const history = useHistory();
  const league = getLeagueById(match.leagueId);
  const homeTeam = getTeamById(match.homeTeam.teamId);
  const awayTeam = getTeamById(match.awayTeam.teamId);

  if (!league || !homeTeam || !awayTeam) return null;

  const isLive = match.status === 'live';
  const isHT = match.minute === 'HT';

  return (
    <div className="match-card clickable" onClick={() => history.push(`/match/${match.id}`)}>
      {/* Card header: league info + time/minute */}
      <div className="match-card-header">
        <div className="match-league">
          <span className="league-logo">{league.logo}</span>
          <span className="league-name">{league.name}</span>
        </div>
        <div className="match-time">
          {isLive && (
            <>
              <span className={`status-dot ${isHT ? 'ht' : 'live'}`}></span>
              <span className={`minute-text ${isHT ? 'ht' : ''}`}>
                {match.minute}
              </span>
            </>
          )}
          {match.status === 'upcoming' && (
            <span className="kickoff-text">{match.kickoff}</span>
          )}
          {match.status === 'finished' && (
            <span className="ft-text">FT</span>
          )}
        </div>
      </div>

      {/* Team rows */}
      <div className="match-teams">
        <div className="team-row">
          <div className="team-info">
            <span className="team-abbr">{homeTeam.abbreviation}</span>
            <span className="team-name">{homeTeam.name}</span>
          </div>
          <span className={`team-score ${isLive ? 'live' : ''}`}>
            {match.homeTeam.score !== null ? match.homeTeam.score : '–'}
          </span>
        </div>
        <div className="team-row">
          <div className="team-info">
            <span className="team-abbr">{awayTeam.abbreviation}</span>
            <span className="team-name">{awayTeam.name}</span>
          </div>
          <span className={`team-score ${isLive ? 'live' : ''}`}>
            {match.awayTeam.score !== null ? match.awayTeam.score : '–'}
          </span>
        </div>
      </div>

      {/* Venue */}
      <div className="match-venue">
        <IonIcon icon={locationOutline} className="venue-icon" />
        <span>{match.venue}</span>
      </div>
    </div>
  );
};

export default MatchCard;

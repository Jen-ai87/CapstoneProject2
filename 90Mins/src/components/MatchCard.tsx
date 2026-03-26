import { IonIcon } from '@ionic/react';
import { locationOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { Match } from '../data/types';
import { getTeamById, getLeagueById, fetchAndCacheTeamIfNeeded } from '../data/dataHelpers';
import './MatchCard.css';

interface MatchCardProps {
  match: Match;
}

const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const history = useHistory();
  const league = getLeagueById(match.leagueId);
  let homeTeam = getTeamById(match.homeTeam.teamId);
  let awayTeam = getTeamById(match.awayTeam.teamId);

  // If league not found, don't render - this shouldn't happen
  if (!league) {
    return null;
  }



  // If team not found and we have API data, create it dynamically
  if (!homeTeam && match.homeTeam.name) {
    const apiId = match.homeTeam.bsdApiId || match.homeTeam.apiTeamId;
    const internalId = match.homeTeam.bsdInternalId;
    if (apiId) {
      homeTeam = fetchAndCacheTeamIfNeeded(apiId, match.homeTeam.name, match.leagueId, internalId);
    }
  }
  
  if (!awayTeam && match.awayTeam.name) {
    const apiId = match.awayTeam.bsdApiId || match.awayTeam.apiTeamId;
    const internalId = match.awayTeam.bsdInternalId;
    if (apiId) {
      awayTeam = fetchAndCacheTeamIfNeeded(apiId, match.awayTeam.name, match.leagueId, internalId);
    }
  }

  // Create display objects - Use API logos when available, fallback to cached only when API doesn't provide
  const homeTeamDisplay = {
    name: match.homeTeam.name || homeTeam?.name || match.homeTeam.teamId.replace(/-/g, ' ').toUpperCase() || 'Unknown Team',
    logo: match.homeTeam.crest || homeTeam?.logo, // Use BSD crest if available, otherwise fallback to cached
    abbreviation: homeTeam?.abbreviation || '',
  };
  
  const awayTeamDisplay = {
    name: match.awayTeam.name || awayTeam?.name || match.awayTeam.teamId.replace(/-/g, ' ').toUpperCase() || 'Unknown Team',
    logo: match.awayTeam.crest || awayTeam?.logo, // Use BSD crest if available, otherwise fallback to cached
    abbreviation: awayTeam?.abbreviation || '',
  };



  const isLive = match.status === 'live';
  const isHT = match.minute === 'HT';

  // Helper to extract only numeric minute (or HT/FT)
  const getNumericMinute = (minute: string | null | undefined) => {
    if (!minute) return '';
    if (minute.toUpperCase() === 'HT' || minute.toUpperCase() === 'FT') return minute.toUpperCase();
    const matchNum = minute.match(/\d+/);
    return matchNum ? matchNum[0] : '';
  };

  const handleOpenMatch = () => {
    history.push({
      pathname: `/match/${match.id}`,
      state: { match },
    });
  };

  return (
    <div className="match-card clickable" onClick={handleOpenMatch}>
      {/* Card header: league info + time/minute */}
      <div className="match-card-header">
        <div className="match-league">
          <img src={league.logo} alt={league.name} className="league-logo" loading="lazy" />
          <span className="league-name">{league.name}</span>
        </div>
        <div className="match-time">
          {isLive && (
            <>
              <span className={`status-dot ${isHT ? 'ht' : 'live'}`}></span>
              <span className={`minute-text ${isHT ? 'ht' : ''}`}>
                {getNumericMinute(match.minute)}
              </span>
            </>
          )}
          {match.status === 'upcoming' && (
            <span className="kickoff-text">{match.kickoff ? String(match.kickoff).replace(/["']/g, "") : ""}</span>
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
            {homeTeamDisplay.logo && <img src={homeTeamDisplay.logo} alt={homeTeamDisplay.name} className="team-logo" loading="lazy" />}
            <span className="team-name">{homeTeamDisplay.name}</span>
          </div>
          <span className={`team-score ${isLive ? 'live' : ''}`}>
            {match.status === 'upcoming' 
              ? '–' 
              : (match.homeTeam.score !== null ? match.homeTeam.score : '–')}
          </span>
        </div>
        <div className="team-row">
          <div className="team-info">
            {awayTeamDisplay.logo && <img src={awayTeamDisplay.logo} alt={awayTeamDisplay.name} className="team-logo" loading="lazy" />}
            <span className="team-name">{awayTeamDisplay.name}</span>
          </div>
          <span className={`team-score ${isLive ? 'live' : ''}`}>
            {match.status === 'upcoming' 
              ? '–' 
              : (match.awayTeam.score !== null ? match.awayTeam.score : '–')}
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

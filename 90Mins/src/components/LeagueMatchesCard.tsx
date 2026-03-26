import { Match, League } from '../data/types';
import { getTeamById, fetchAndCacheTeamIfNeeded } from '../data/dataHelpers';
import { useHistory } from 'react-router-dom';
import { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { chevronDownOutline } from 'ionicons/icons';
import './LeagueMatchesCard.css';

interface MatchItemProps {
  match: Match;
}

const MatchItem: React.FC<MatchItemProps> = ({ match }) => {
  const history = useHistory();

  const handleMatchClick = () => {
    history.push({
      pathname: `/match/${match.id}`,
      state: { match },
    });
  };

  const handleTeamClick = (e: React.MouseEvent, teamId: string) => {
    e.stopPropagation();
    history.push(`/club/${teamId}`);
  };

  const getMatchStatus = (match: Match): 'finished' | 'live' | 'upcoming' => {
    if (match.status === 'finished') return 'finished';
    if (match.status === 'live') return 'live';
    return 'upcoming';
  };

  const convert24to12 = (time: string): string => {
    if (!time) return 'TBA';
    const [hours, minutes] = time.split(':').map(Number);
    const meridiem = hours >= 12 ? 'p.m.' : 'a.m.';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${meridiem}`;
  };

  const formatMatchTime = (match: Match): string => {
    if (match.status === 'finished') {
      return 'FT';
    }
    if (match.status === 'live') {
      // Remove any single or double quotes from minute value
      const minute = match.minute ? String(match.minute).replace(/['"]/g, '') : '--';
      return minute;
    }
    
    // For upcoming matches, show time in 12-hour format
    if (match.kickoff) {
      return convert24to12(match.kickoff);
    }
    return 'TBA';
  };

  const getStatusLabel = (match: Match): string => {
    if (match.status === 'finished') return 'FT';
    if (match.status === 'live') {
      const minute = match.minute || '--';
      return minute;
    }
    return formatMatchTime(match);
  };

  const homeTeam = getTeamById(match.homeTeam.teamId);
  const awayTeam = getTeamById(match.awayTeam.teamId);

  // If team not found and we have API data, create it dynamically with logo
  let homeTeamWithLogo = homeTeam;
  if (!homeTeamWithLogo && match.homeTeam.name) {
    const apiId = match.homeTeam.bsdApiId || match.homeTeam.apiTeamId;
    const internalId = match.homeTeam.bsdInternalId;
    if (apiId) {
      homeTeamWithLogo = fetchAndCacheTeamIfNeeded(apiId, match.homeTeam.name, match.leagueId, internalId);
    }
  }

  let awayTeamWithLogo = awayTeam;
  if (!awayTeamWithLogo && match.awayTeam.name) {
    const apiId = match.awayTeam.bsdApiId || match.awayTeam.apiTeamId;
    const internalId = match.awayTeam.bsdInternalId;
    if (apiId) {
      awayTeamWithLogo = fetchAndCacheTeamIfNeeded(apiId, match.awayTeam.name, match.leagueId, internalId);
    }
  }

  // PREFER API team names over database names
  const homeTeamName = match.homeTeam.name || homeTeamWithLogo?.name || 'Unknown';
  const awayTeamName = match.awayTeam.name || awayTeamWithLogo?.name || 'Unknown';

  return (
    <div className="league-match-item" onClick={handleMatchClick} style={{ cursor: 'pointer' }}>
      <div className="match-info">
        {/* Home team - name then logo */}
        <div className="team-section">
          <span 
            className="team-name team-name-clickable" 
            onClick={(e) => handleTeamClick(e, match.homeTeam.teamId)}
          >
            {homeTeamName}
          </span>
          {homeTeamWithLogo?.logo && (
            <img src={homeTeamWithLogo.logo} alt={homeTeamName} className="team-logo" loading="lazy" />
          )}
        </div>

        {/* Score/Time */}
        <div className="match-center">
          {match.status === 'finished' || match.status === 'live' ? (
            <>
              <span className="score">{match.homeTeam.score ?? 0}</span>
              <span className="separator">-</span>
              <span className="score">{match.awayTeam.score ?? 0}</span>
            </>
          ) : (
            <span className={
              `time${formatMatchTime(match) === 'HT' ? ' live-minute' : ''}`
            }>{formatMatchTime(match)}</span>
          )}
        </div>

        {/* Away team - logo then name */}
        <div className="team-section">
          {awayTeamWithLogo?.logo && (
            <img src={awayTeamWithLogo.logo} alt={awayTeamName} className="team-logo" loading="lazy" />
          )}
          <span 
            className="team-name team-name-clickable" 
            onClick={(e) => handleTeamClick(e, match.awayTeam.teamId)}
          >
            {awayTeamName}
          </span>
        </div>
      </div>

      {/* Status badge - always render but hidden for upcoming matches to maintain alignment */}
      <div className={`match-status ${getMatchStatus(match) === 'upcoming' ? 'hidden' : ''}`}>
        <span className={`status-badge ${getMatchStatus(match)}`}>
          {getStatusLabel(match)}
        </span>
      </div>
    </div>
  );
};

interface LeagueMatchesGroupProps {
  league?: League;
  matches: Match[];
}

export const LeagueMatchesGroup: React.FC<LeagueMatchesGroupProps> = ({
  league,
  matches,
}) => {
  const history = useHistory();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (matches.length === 0) return null;

  const leagueTitle = league
    ? `${league.country || league.name} - ${league.name}`
    : 'Unknown League';

  const handleLeagueNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (league?.id) {
      history.push(`/league/${league.id}`);
    }
  };

  const handleHeaderClick = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="league-matches-card">
      <div className="league-card-header" onClick={handleHeaderClick}>
        {league?.flag && (
          <img src={league.flag} alt={league.country} className="league-card-flag" loading="lazy" />
        )}
        <h3 className="league-card-title" onClick={handleLeagueNameClick}>
          {leagueTitle}
        </h3>
        <div className="header-spacer"></div>
        <button className={`collapse-toggle ${isCollapsed ? 'collapsed' : ''}`} aria-label="Toggle league">
          <IonIcon icon={chevronDownOutline} />
        </button>
      </div>
      <div className={`league-matches-list ${isCollapsed ? 'collapsed' : ''}`}>
        {matches.map((match) => (
          <MatchItem key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
};

export { MatchItem };
export default LeagueMatchesGroup;

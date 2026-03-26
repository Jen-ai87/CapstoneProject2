import { useHistory } from 'react-router-dom';
import { LeagueStanding, ZoneType } from '../data/types';
import { getTeamById, getLeagueById, fetchAndCacheTeamIfNeeded } from '../data/dataHelpers';
import './StandingsTable.css';

interface StandingsTableProps {
  standing: LeagueStanding;
  viewMode?: 'short' | 'full' | 'form';
  onViewModeChange?: (mode: 'short' | 'full' | 'form') => void;
  highlightTeamId?: string;
}

const getZoneClass = (zone: ZoneType): string => {
  switch (zone) {
    case 'champions-league':
      return 'zone-cl';
    case 'europa-league':
      return 'zone-el';
    case 'relegation':
      return 'zone-rel';
    default:
      return '';
  }
};

const StandingsTable: React.FC<StandingsTableProps> = ({ standing, viewMode = 'full', onViewModeChange, highlightTeamId }) => {
  const history = useHistory();
  const league = getLeagueById(standing.leagueId);

  const handleLeagueClick = () => {
    if (league?.id) {
      history.push(`/league/${league.id}`);
    }
  };

  const handleTeamClick = (teamId: string) => {
    history.push(`/club/${teamId}`);
  };

  if (!league) return null;

  const renderFormBadge = (result: 'W' | 'L' | 'D', isLatest: boolean) => {
    return (
      <span
        className={`form-badge form-${result.toLowerCase()}${isLatest ? ' latest' : ''}`}
        title={result === 'W' ? 'Win' : result === 'L' ? 'Loss' : 'Draw'}
      >
        {result}
      </span>
    );
  };

  return (
    <div className="standings-table-container">
      {/* League header with view toggle */}
      <div className="standings-league-header">
        <div className="league-info" onClick={handleLeagueClick} style={{ cursor: 'pointer' }}>
          <img src={league.logo} alt={league.name} className="standings-league-logo" />
          <span className="standings-league-name">{league.name}</span>
        </div>
        <div className="view-mode-controls">
          <button
            className={`view-toggle ${viewMode === 'short' ? 'active' : ''}`}
            onClick={() => onViewModeChange?.('short')}
          >
            Short
          </button>
          <button
            className={`view-toggle ${viewMode === 'full' ? 'active' : ''}`}
            onClick={() => onViewModeChange?.('full')}
          >
            Full
          </button>
          <button
            className={`view-toggle ${viewMode === 'form' ? 'active' : ''}`}
            onClick={() => onViewModeChange?.('form')}
          >
            Form
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="standings-table">
        <thead>
          <tr className="standings-header-row">
            <th className="col-pos">#</th>
            <th className="col-team">Team</th>
            {viewMode === 'full' && (
              <>
                <th className="col-stat" data-tooltip="Played">P</th>
                <th className="col-stat" data-tooltip="Wins">W</th>
                <th className="col-stat" data-tooltip="Draws">D</th>
                <th className="col-stat" data-tooltip="Losses">L</th>
                <th className="col-stat" data-tooltip="Goals For">GF</th>
                <th className="col-stat" data-tooltip="Goals Against">GA</th>
                <th className="col-stat" data-tooltip="Goal Difference">GD</th>
                <th className="col-stat" data-tooltip="Points">Pts</th>
              </>
            )}
            {viewMode === 'short' && (
              <>
                <th className="col-stat" data-tooltip="Played">P</th>
                <th className="col-stat" data-tooltip="Goal Difference">GD</th>
                <th className="col-stat" data-tooltip="Points">Pts</th>
              </>
            )}
            {viewMode === 'form' && (
              <th className="col-stat" data-tooltip="Last 5 Matches">Last 5 matches</th>
            )}
          </tr>
        </thead>
        <tbody>
          {standing.rows.map((row) => {
            let team = getTeamById(row.teamId);
            
            // If team not found and we have API data, create it dynamically
            if (!team && row.apiTeamId && row.apiTeamName) {
              team = fetchAndCacheTeamIfNeeded(row.apiTeamId, row.apiTeamName, standing.leagueId);
            }
            
            // Skip rendering if still no team (shouldn't happen with API data)
            if (!team) return null;
            
            const zoneClass = getZoneClass(row.zone);
            const isHighlighted = highlightTeamId && row.teamId === highlightTeamId;

            return (
              <tr key={row.position} className={`standings-row ${zoneClass} ${isHighlighted ? 'highlighted' : ''}`}>
                <td className={`col-pos ${zoneClass}`}>
                  <span className="position-number">{row.position}</span>
                </td>
                <td className="col-team">
                  <div className="standings-team-info">
                    {team.logo && <img src={team.logo} alt={team.name} className="standings-team-logo" loading="lazy" />}
                    <span 
                      className="standings-team-name standings-team-name-clickable" 
                      onClick={() => handleTeamClick(team.id)}
                    >
                      {team.name}
                    </span>
                  </div>
                </td>
                {viewMode === 'full' && (
                  <>
                    <td className="col-stat">{row.played}</td>
                    <td className="col-stat">{row.won}</td>
                    <td className="col-stat">{row.drawn}</td>
                    <td className="col-stat">{row.lost}</td>
                    <td className="col-stat">{row.goalsFor}</td>
                    <td className="col-stat">{row.goalsAgainst}</td>
                    <td className="col-stat col-gd">
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                    <td className="col-stat col-pts">{row.points}</td>
                  </>
                )}
                {viewMode === 'short' && (
                  <>
                    <td className="col-stat">{row.played}</td>
                    <td className="col-stat col-gd">
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                    <td className="col-stat col-pts">{row.points}</td>
                  </>
                )}
                {viewMode === 'form' && (
                  <td className="col-form">
                    <div className="form-display">
                      {row.form && row.form.length > 0 ? (
                        row.form.map((result, idx) => 
                          renderFormBadge(result, idx === row.form!.length - 1)
                        )
                      ) : (
                        <span className="no-form">-</span>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="standings-legend">
        <div className="legend-item">
          <span className="legend-dot legend-cl"></span>
          <span className="legend-label">Champions League</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot legend-el"></span>
          <span className="legend-label">Europa League</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot legend-rel"></span>
          <span className="legend-label">Relegation</span>
        </div>
      </div>
    </div>
  );
};

export default StandingsTable;

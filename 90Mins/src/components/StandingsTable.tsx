import { LeagueStanding, ZoneType } from '../data/types';
import { getTeamById } from '../data/teams';
import { getLeagueById } from '../data/leagues';
import './StandingsTable.css';

interface StandingsTableProps {
  standing: LeagueStanding;
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

const StandingsTable: React.FC<StandingsTableProps> = ({ standing }) => {
  const league = getLeagueById(standing.leagueId);

  if (!league) return null;

  return (
    <div className="standings-table-container">
      {/* League header */}
      <div className="standings-league-header">
        <span className="standings-league-logo">{league.logo}</span>
        <span className="standings-league-name">{league.name}</span>
      </div>

      {/* Table */}
      <table className="standings-table">
        <thead>
          <tr className="standings-header-row">
            <th className="col-pos">#</th>
            <th className="col-team">Team</th>
            <th className="col-stat">P</th>
            <th className="col-stat">W</th>
            <th className="col-stat">D</th>
            <th className="col-stat">L</th>
            <th className="col-stat">GF</th>
            <th className="col-stat">GA</th>
            <th className="col-stat">GD</th>
            <th className="col-stat">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standing.rows.map((row) => {
            const team = getTeamById(row.teamId);
            if (!team) return null;
            const zoneClass = getZoneClass(row.zone);

            return (
              <tr key={row.position} className={`standings-row ${zoneClass}`}>
                <td className={`col-pos ${zoneClass}`}>
                  <span className="position-number">{row.position}</span>
                </td>
                <td className="col-team">
                  <div className="standings-team-info">
                    <span className="standings-team-abbr">{team.abbreviation}</span>
                    <span className="standings-team-name">{team.name}</span>
                  </div>
                </td>
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

import StandingsTable from '../components/StandingsTable';
import { premierLeagueStandings } from '../data/standings';
import './StandingsPage.css';

const StandingsPage: React.FC = () => {
  return (
    <div className="standings-page">
      {/* Page heading */}
      <div className="standings-page-header">
        <h1 className="standings-title">League Standings</h1>
        <p className="standings-subtitle">Current league tables and positions</p>
      </div>

      {/* Premier League standings */}
      <StandingsTable standing={premierLeagueStandings} />
    </div>
  );
};

export default StandingsPage;
import { IonIcon } from '@ionic/react';
import { funnelOutline } from 'ionicons/icons';
import { leagues } from '../data/leagues';
import './LeagueFilter.css';

interface LeagueFilterProps {
  selectedLeague: string | null; // null means "All Leagues"
  onChange: (leagueId: string | null) => void;
}

const LeagueFilter: React.FC<LeagueFilterProps> = ({ selectedLeague, onChange }) => {
  return (
    <div className="league-filter">
      <div className="league-filter-label">
        <IonIcon icon={funnelOutline} className="league-filter-icon" />
        <span>Filter by League</span>
      </div>
      <div className="league-tabs">
        <button
          className={`league-tab ${selectedLeague === null ? 'active' : ''}`}
          onClick={() => onChange(null)}
        >
          All Leagues
        </button>
        {leagues.map((league) => (
          <button
            key={league.id}
            className={`league-tab ${selectedLeague === league.id ? 'active' : ''}`}
            onClick={() => onChange(league.id)}
          >
            {league.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LeagueFilter;

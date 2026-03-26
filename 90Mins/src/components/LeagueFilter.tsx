import { useState, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import { filterOutline } from 'ionicons/icons';
import { getAllLeagues } from '../data/dataHelpers';
import './LeagueFilter.css';

interface LeagueFilterProps {
  selectedLeague: string | null; // null means "All Leagues"
  onChange: (leagueId: string | null) => void;
  expanded?: boolean; // Show all options inline (for home page)
  showOnlyLive?: boolean;
  setShowOnlyLive?: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const LeagueFilter: React.FC<LeagueFilterProps> = ({ selectedLeague, onChange, expanded = false, showOnlyLive, setShowOnlyLive }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const leagues = getAllLeagues();
  
  const getSelectedLeagueName = () => {
    if (showOnlyLive) return 'Live';
    if (!selectedLeague) return 'All Leagues';
    const league = leagues.find(l => l.id === selectedLeague);
    return league ? league.name : 'All Leagues';
  };
  
  // Lock body scroll when dropdown is open (only for compact mode)
  useEffect(() => {
    if (!expanded && isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded, expanded]);
  
  const handleLeagueSelect = (leagueId: string | null) => {
    onChange(leagueId);
    setIsExpanded(false);
  };

  // For expanded mode (home page), show selected league or all options inline
  if (expanded) {
    if (!isExpanded) {
      // Show only selected league as clickable text with filter icon
      return (
        <div className="league-filter-inline">
          <button
            className="league-filter-inline-button"
            onClick={() => setIsExpanded(true)}
          >
            <IonIcon icon={filterOutline} className="league-filter-icon" />
            {getSelectedLeagueName()}
          </button>
        </div>
      );
    }

    // Show all options expanded inline
    return (
      <div className="league-filter-inline-expanded">
        <button
          className={`league-filter-inline-option ${selectedLeague === null ? 'active' : ''}`}
          onClick={() => {
            onChange(null);
            setIsExpanded(false);
          }}
        >
          All Leagues
        </button>
        {leagues.map((league) => (
          <button
            key={league.id}
            className={`league-filter-inline-option ${selectedLeague === league.id ? 'active' : ''}`}
            onClick={() => {
              onChange(league.id);
              setIsExpanded(false);
            }}
          >
            {league.name}
          </button>
        ))}
        {/* Live filter toggle */}
        {typeof showOnlyLive === 'boolean' && typeof setShowOnlyLive === 'function' && (
          <button
            className={`league-filter-inline-option${showOnlyLive ? ' active' : ''}`}
            style={{ marginTop: 0 }}
            onClick={() => {
              setShowOnlyLive(true);
              onChange('live'); // Save 'Live' as selectedLeague
              setIsExpanded(false);
            }}
          >
            Live
          </button>
        )}
      </div>
    );
  }

  // Compact mode (standings page)
  return (
    <div className="league-filter-compact">
      <button 
        className={`league-filter-toggle ${isExpanded ? 'expanded' : ''} ${selectedLeague ? 'active' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label="Filter by league"
      >
        {getSelectedLeagueName()}
      </button>

      {isExpanded && (
        <>
          <div className="league-filter-overlay" onClick={() => setIsExpanded(false)} />
          <div className="league-filter-dropdown">
            <div className="league-filter-list">
              <button
                className={`league-filter-item ${selectedLeague === null ? 'active' : ''}`}
                onClick={() => handleLeagueSelect(null)}
              >
                All Leagues
              </button>
              {leagues.map((league) => (
                <button
                  key={league.id}
                  className={`league-filter-item ${selectedLeague === league.id ? 'active' : ''}`}
                  onClick={() => handleLeagueSelect(league.id)}
                >
                  {league.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeagueFilter;

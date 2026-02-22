import { useState, useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import { calendarOutline } from 'ionicons/icons';
import DateSelector from '../components/DateSelector';
import LeagueFilter from '../components/LeagueFilter';
import MatchCard from '../components/MatchCard';
import { liveMatches, upcomingMatches, finishedMatches, tomorrowMatches } from '../data/matches';
import { Match } from '../data/types';
import './MatchesPage.css';

type DateTab = 'yesterday' | 'today' | 'tomorrow';

const MatchesPage: React.FC = () => {
  const location = useLocation();
  const history = useHistory();

  // Read league from URL query param (?league=premier-league)
  const queryLeague = new URLSearchParams(location.search).get('league');

  const [selectedDate, setSelectedDate] = useState<DateTab>('today');
  const [selectedLeague, setSelectedLeague] = useState<string | null>(queryLeague);

  // Sync when URL query param changes (e.g. Quick Access sidebar click)
  useEffect(() => {
    setSelectedLeague(queryLeague);
  }, [queryLeague]);

  // When user changes league via pill, update the URL too
  const handleLeagueChange = (leagueId: string | null) => {
    setSelectedLeague(leagueId);
    if (leagueId) {
      history.replace(`/matches?league=${leagueId}`);
    } else {
      history.replace('/matches');
    }
  };

  // Get matches based on selected date
  const getMatchesForDate = (): { live: Match[]; upcoming: Match[]; finished: Match[] } => {
    switch (selectedDate) {
      case 'yesterday':
        return { live: [], upcoming: [], finished: finishedMatches };
      case 'today':
        return { live: liveMatches, upcoming: upcomingMatches, finished: [] };
      case 'tomorrow':
        return { live: [], upcoming: tomorrowMatches, finished: [] };
      default:
        return { live: [], upcoming: [], finished: [] };
    }
  };

  const { live, upcoming, finished } = getMatchesForDate();

  // Apply league filter
  const filterByLeague = (matches: Match[]): Match[] => {
    if (!selectedLeague) return matches;
    return matches.filter((m) => m.leagueId === selectedLeague);
  };

  const filteredLive = filterByLeague(live);
  const filteredUpcoming = filterByLeague(upcoming);
  const filteredFinished = filterByLeague(finished);

  return (
    <div className="matches-page">
      {/* Page heading */}
      <div className="matches-page-header">
        <h1 className="matches-title">Football Matches</h1>
        <p className="matches-subtitle">Live scores and upcoming fixtures</p>
      </div>

      {/* Filters container */}
      <div className="filters-container">
        <DateSelector selected={selectedDate} onChange={setSelectedDate} />
        <LeagueFilter selectedLeague={selectedLeague} onChange={handleLeagueChange} />
      </div>

      {/* Live Now section */}
      {filteredLive.length > 0 && (
        <div className="matches-section">
          <div className="section-header">
            <span className="live-badge">
              <span className="live-dot"></span>
              Live Now ({filteredLive.length})
            </span>
          </div>
          <div className="matches-grid">
            {filteredLive.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Matches section */}
      {filteredUpcoming.length > 0 && (
        <div className="matches-section">
          <div className="section-header">
            <span className="section-title">
              Upcoming Matches ({filteredUpcoming.length})
            </span>
          </div>
          <div className="matches-grid">
            {filteredUpcoming.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      )}

      {/* Finished Matches section */}
      {filteredFinished.length > 0 && (
        <div className="matches-section">
          <div className="section-header">
            <span className="section-title">
              Finished ({filteredFinished.length})
            </span>
          </div>
          <div className="matches-grid">
            {filteredFinished.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredLive.length === 0 && filteredUpcoming.length === 0 && filteredFinished.length === 0 && (
        <div className="matches-empty">
          <IonIcon icon={calendarOutline} className="empty-icon" />
          <p className="empty-title">No matches found</p>
          <p className="empty-subtitle">Try selecting a different date or league</p>
        </div>
      )}
    </div>
  );
};

export default MatchesPage;

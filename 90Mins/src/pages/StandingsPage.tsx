import { useState, useEffect } from 'react';
import { IonSpinner } from '@ionic/react';
import Logger from '../services/logger';
import { showErrorToast } from '../services/toastNotification';
import StandingsTable from '../components/StandingsTable';
import { LeagueStanding } from '../data/types';
import footballApi from '../services/footballApi';
import { getStandingsFromSportsAPIPro } from '../services/footballApiHybrid';
import { mapApiStandingsToLeagueStanding, mapSportsAPIProStandingsToLeagueStanding, ApiStandingsResponse } from '../services/apiMapper';
import { getCachedStandings, setCachedStandings } from '../services/standingsCache';
import { 
  premierLeagueStandings, 
  laLigaStandings, 
  serieAStandings, 
  bundesligaStandings, 
  ligue1Standings,
  getStandingsByLeague 
} from '../data/standings';

import './StandingsPage.css';

// Check if we should use mock data
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const logger = new Logger('StandingsPage');

const StandingsPage: React.FC = () => {
  const [selectedLeague, setSelectedLeague] = useState<string>('premier-league');
  const [standing, setStanding] = useState<LeagueStanding | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'short' | 'full' | 'form'>('full');

  // Europe's Top 5 Leagues (Champions League doesn't have traditional standings)
  const leagues = [
    { id: 'premier-league', name: 'Premier League', apiId: 'PL' },
    { id: 'la-liga', name: 'La Liga', apiId: 'LA' },
    { id: 'serie-a', name: 'Serie A', apiId: 'SA' },
    { id: 'bundesliga', name: 'Bundesliga', apiId: 'BL1' },
    { id: 'ligue-1', name: 'Ligue 1', apiId: 'FL1' },
  ];

  useEffect(() => {
    fetchStandings();
  }, [selectedLeague]);

  const fetchStandings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check cache first
      const cachedStanding = getCachedStandings(selectedLeague);
      if (cachedStanding) {
        setStanding(cachedStanding);
        setLoading(false);
        return;
      }

      // Use mock data if flag is enabled
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
        
        // Use mock data from standings.ts
          const mockStanding = getStandingsByLeague(selectedLeague);
          if (!mockStanding) {
            throw new Error('League standings not found');
          }
          setStanding(mockStanding);
          setCachedStandings(selectedLeague, mockStanding);
        setLoading(false);
        return;
      }
      
      // Real API calls below
      // Use SportsAPIPro for standings since BSD doesn't support it
      
      const league = leagues.find(l => l.id === selectedLeague);
      if (!league) {
        throw new Error('League not found');
      }
      
      // Get current season year (football seasons run Aug-May, so Feb is in previous year's season)
      const now = new Date();
      const currentSeason = now.getMonth() < 7 ? (now.getFullYear() - 1).toString() : now.getFullYear().toString();
      const response = await getStandingsFromSportsAPIPro(league.apiId, currentSeason);
      
      if (!response) {
        // Fallback to mock data if API fails
        const mockStanding = getStandingsByLeague(selectedLeague);
        if (!mockStanding) {
          throw new Error('League standings not found');
        }
        setStanding(mockStanding);
        setCachedStandings(selectedLeague, mockStanding);
        return;
      }
      
      // Check if response has standings data
      if (!response.standings || response.standings.length === 0) {
        // Fallback to mock data if API returns empty
        const mockStanding = getStandingsByLeague(selectedLeague);
        if (!mockStanding) {
          throw new Error('League standings not found');
        }
        setStanding(mockStanding);
        setCachedStandings(selectedLeague, mockStanding);
        return;
      }

      // Use SportsAPIPro-specific mapper since response format is different
      const mappedStanding = mapSportsAPIProStandingsToLeagueStanding(response, selectedLeague);
      setStanding(mappedStanding);
      setCachedStandings(selectedLeague, mappedStanding);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Error fetching standings:', errorMessage);
      showErrorToast('FETCH_ERROR', `Failed to load standings: ${errorMessage}`);
      
      // Final fallback: use mock data on any error
      try {
        const mockStanding = getStandingsByLeague(selectedLeague);
        if (mockStanding) {
          setStanding(mockStanding);
          setCachedStandings(selectedLeague, mockStanding);
          setError(null);
        } else {
          setError(`Failed to load standings: ${errorMessage}`);
        }
      } catch (fallbackErr) {
        setError(`Failed to load standings: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="standings-page">
      {/* Page heading */}
      <div className="standings-page-header">
        <h1 className="standings-title">League Standings</h1>
        <p className="standings-subtitle">Current league tables and positions</p>
      </div>

      {/* League selector */}
      <div className="league-selector">
        {leagues.map(league => (
          <button
            key={league.id}
            className={`league-button ${selectedLeague === league.id ? 'active' : ''}`}
            onClick={() => setSelectedLeague(league.id)}
          >
            {league.name}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="standings-loading">
          <IonSpinner name="crescent" />
          <p>Loading standings...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="standings-error">
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={fetchStandings}>
            Retry
          </button>
        </div>
      )}

      {/* Standings table */}
      {!loading && !error && standing && (
        <StandingsTable 
          standing={standing} 
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}
    </div>
  );
};

export default StandingsPage;


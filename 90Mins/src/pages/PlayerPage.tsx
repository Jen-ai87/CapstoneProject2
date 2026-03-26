import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { IonIcon, IonSpinner } from '@ionic/react';
import { arrowBackOutline } from 'ionicons/icons';
import footballApi from '../services/footballApi';
import './PlayerPage.css';

type PlayerProfile = {
  id: number;
  api_id: number;
  name: string;
  short_name?: string;
  position?: string;
  jersey_number?: number | null;
  height?: number | null;
  date_of_birth?: string | null;
  nationality?: string;
  market_value?: number | null;
  current_team?: {
    id: number;
    api_id?: number;
    name: string;
  };
};

const PlayerPage: React.FC = () => {
  const history = useHistory();
  const { playerId } = useParams<{ playerId: string }>();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayerProfile();
  }, [playerId]);

  const buildPlayerLogo = (apiId?: number | null): string | null => {
    const token = import.meta.env.VITE_BSD_API_KEY;
    if (!apiId || !token) return null;
    return `https://sports.bzzoiro.com/img/player/${apiId}/?token=${token}`;
  };

  const formatMarketValue = (value?: number | null): string => {
    if (!value) return 'N/A';
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M EUR`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K EUR`;
    return `${value} EUR`;
  };

  const fetchPlayerProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await footballApi.getPlayerById?.(playerId) as any;
      if (!response) {
        throw new Error('Player not found');
      }
      setPlayer(response as PlayerProfile);
    } catch (err) {
      setError('Failed to load player profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="player-page">
        <button className="player-back-btn" onClick={() => history.goBack()}>
          <IonIcon icon={arrowBackOutline} />
          <span>Back</span>
        </button>
        <div className="player-loading">
          <IonSpinner name="crescent" />
          <p>Loading player...</p>
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="player-page">
        <button className="player-back-btn" onClick={() => history.goBack()}>
          <IonIcon icon={arrowBackOutline} />
          <span>Back</span>
        </button>
        <div className="player-error">
          <p>{error || 'Player not found'}</p>
        </div>
      </div>
    );
  }

  const playerLogo = buildPlayerLogo(player.api_id);
  const teamId = player.current_team?.api_id || player.current_team?.id;

  return (
    <div className="player-page">
      <button className="player-back-btn" onClick={() => history.goBack()}>
        <IonIcon icon={arrowBackOutline} />
        <span>Back</span>
      </button>

      <div className="player-header">
        {playerLogo && <img src={playerLogo} alt={player.name} className="player-logo" loading="lazy" />}
        <div className="player-header-info">
          <h1 className="player-name">{player.name}</h1>
          <p className="player-meta">{player.short_name || player.position || 'Player'}</p>
        </div>
      </div>

      <div className="player-details">
        <div className="player-detail-row">
          <span className="player-detail-label">Position</span>
          <span className="player-detail-value">{player.position || 'N/A'}</span>
        </div>
        <div className="player-detail-row">
          <span className="player-detail-label">Nationality</span>
          <span className="player-detail-value">{player.nationality || 'N/A'}</span>
        </div>
        <div className="player-detail-row">
          <span className="player-detail-label">Jersey</span>
          <span className="player-detail-value">{player.jersey_number ?? 'N/A'}</span>
        </div>
        <div className="player-detail-row">
          <span className="player-detail-label">Height</span>
          <span className="player-detail-value">{player.height ? `${player.height} cm` : 'N/A'}</span>
        </div>
        <div className="player-detail-row">
          <span className="player-detail-label">Birth Date</span>
          <span className="player-detail-value">{player.date_of_birth || 'N/A'}</span>
        </div>
        <div className="player-detail-row">
          <span className="player-detail-label">Market Value</span>
          <span className="player-detail-value">{formatMarketValue(player.market_value)}</span>
        </div>
        <div className="player-detail-row">
          <span className="player-detail-label">Current Team</span>
          {teamId ? (
            <button className="player-team-link" onClick={() => history.push(`/club/${teamId}`)}>
              {player.current_team?.name || 'Team'}
            </button>
          ) : (
            <span className="player-detail-value">{player.current_team?.name || 'N/A'}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerPage;

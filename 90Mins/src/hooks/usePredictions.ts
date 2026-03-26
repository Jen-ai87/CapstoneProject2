import { useEffect, useState } from 'react';
import footballApi from '../services/footballApi';
import Logger from '../services/logger';

interface PredictionData {
  pick: string;
  probabilities: {
    homeWin: number | string;
    draw: number | string;
    awayWin: number | string;
    over15: number | string | null;
    over25: number | string;
    over35: number | string | null;
    bttsYes: number | string;
  };
  expectedGoals: {
    home: number | string;
    away: number | string;
  };
  confidence: number | string;
  mostLikelyScore: string;
  favorite: string;
  modelVersion: string;
  odds: any | null;
}

interface UsePredictionsOptions {
  enabled?: boolean;
  matchId?: string;
  onLoaded?: (prediction: PredictionData | null) => void;
}

interface UsePredictionsResult {
  prediction: PredictionData | null;
  loading: boolean;
  error: Error | null;
}

const logger = new Logger('usePredictions');

/**
 * React hook for match predictions
 * Fetches ML predictions and odds for a given match
 */
export const usePredictions = (options: UsePredictionsOptions = {}): UsePredictionsResult => {
  const { enabled = true, matchId, onLoaded } = options;

  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !matchId) {
      setPrediction(null);
      return;
    }

    let isMounted = true;

    const fetchPrediction = async () => {
      setLoading(true);
      setError(null);
      try {
        logger.debug(`Fetching prediction for match ${matchId}`);

        const rawPrediction = await footballApi.getPredictionByMatchId(matchId);

        if (!isMounted) return;

        if (rawPrediction) {
          const formatted = footballApi.formatPredictionsForDisplay(rawPrediction);
          setPrediction(formatted);
          logger.debug('[usePredictions] Prediction loaded:', formatted?.pick);
          onLoaded?.(formatted);
        } else {
          setPrediction(null);
          logger.debug('[usePredictions] No prediction available');
          onLoaded?.(null);
        }
      } catch (err) {
        if (!isMounted) return;

        const error = err instanceof Error ? err : new Error(String(err));
        logger.error('[usePredictions] Error fetching prediction:', error);
        setError(error);
        setPrediction(null);
        onLoaded?.(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPrediction();

    return () => {
      isMounted = false;
    };
  }, [enabled, matchId, onLoaded]);

  return {
    prediction,
    loading,
    error,
  };
};

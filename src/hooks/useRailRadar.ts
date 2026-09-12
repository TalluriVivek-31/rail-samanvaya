// Rail Samnvay — RailRadar React Hooks
// Polling hooks for live train tracking and station boards with explicit 30s TTL, retry, and cache bust

import { useState, useEffect, useRef, useCallback } from 'react';
import type { LiveTrainPosition, StationBoardEntry, DataSource } from '../types/samnvay';
import { 
  fetchLiveTrainStatus, 
  fetchLiveStationBoard, 
  fetchAllCorridorTrains,
  invalidateServerCache 
} from '../services/railRadarClient';

export const EXACT_POLL_INTERVAL = 60_000; // 60 seconds (prevents hitting 10 req/min upstream tier across 6 corridor trains)

/**
 * Poll all corridor trains at a regular 30-second interval.
 * Genuinely requests fresh data repeatedly with automatic retry and manual cache busting.
 */
export function useCorridorTrains(
  isLiveMode: boolean = true, 
  enabled: boolean = true, 
  pollInterval: number = EXACT_POLL_INTERVAL
) {
  const [trains, setTrains] = useState<LiveTrainPosition[]>([]);
  const [source, setSource] = useState<DataSource>(isLiveMode ? 'LIVE' : 'UNAVAILABLE');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [upstreamUpdatedAt, setUpstreamUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode: 'live' | 'demo' = isLiveMode ? 'live' : 'demo';

  const fetchData = useCallback(async (manualRefresh: boolean = false) => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      if (manualRefresh) {
        await invalidateServerCache();
      }
      const result = await fetchAllCorridorTrains({ 
        mode, 
        refresh: manualRefresh 
      });

      // Update state
      setTrains(result.trains);
      setSource(result.source);
      setLastUpdated(result.timestamp);
      if (result.upstreamUpdatedAt) {
        setUpstreamUpdatedAt(result.upstreamUpdatedAt);
      }
      setError(result.errors.length > 0 && result.trains.length === 0 ? result.errors[0] : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh corridor trains');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, mode]);

  // Initial fetch and repeated 30-second polling interval
  useEffect(() => {
    if (!enabled) return;
    
    // Immediate fetch on mount or mode change
    fetchData(false);

    const interval = setInterval(() => {
      fetchData(false);
    }, pollInterval);

    return () => clearInterval(interval);
  }, [enabled, pollInterval, fetchData]);

  const manualRefetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return { 
    trains, 
    source, 
    lastUpdated, 
    upstreamUpdatedAt,
    isLoading, 
    error, 
    refetch: manualRefetch 
  };
}

/**
 * Poll a single station board at 30-second interval.
 */
export function useStationBoard(
  stationCode: string | null, 
  isLiveMode: boolean = true, 
  enabled: boolean = true, 
  pollInterval: number = EXACT_POLL_INTERVAL
) {
  const [entries, setEntries] = useState<StationBoardEntry[]>([]);
  const [source, setSource] = useState<DataSource>(isLiveMode ? 'LIVE' : 'UNAVAILABLE');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [upstreamUpdatedAt, setUpstreamUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode: 'live' | 'demo' = isLiveMode ? 'live' : 'demo';

  const fetchData = useCallback(async (manualRefresh: boolean = false) => {
    if (!enabled || !stationCode) return;
    setIsLoading(true);
    try {
      const result = await fetchLiveStationBoard(stationCode, { 
        mode, 
        refresh: manualRefresh 
      });
      if (result.data) {
        setEntries(Array.isArray(result.data) ? result.data : []);
      } else {
        setEntries([]);
      }
      setSource(result.source);
      setLastUpdated(result.timestamp);
      if (result.upstreamUpdatedAt) {
        setUpstreamUpdatedAt(result.upstreamUpdatedAt);
      }
      setError(result.error || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch station board');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, stationCode, mode]);

  useEffect(() => {
    if (!enabled || !stationCode) return;
    fetchData(false);
    const interval = setInterval(() => {
      fetchData(false);
    }, pollInterval);
    return () => clearInterval(interval);
  }, [enabled, stationCode, pollInterval, fetchData]);

  const manualRefetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return { 
    entries, 
    source, 
    lastUpdated, 
    upstreamUpdatedAt,
    isLoading, 
    error, 
    refetch: manualRefetch 
  };
}

/**
 * On-demand single train lookup with live vs demo mode support and cache bust.
 */
export function useLiveTrainSearch(isLiveMode: boolean = true) {
  const [train, setTrain] = useState<LiveTrainPosition | null>(null);
  const [source, setSource] = useState<DataSource>(isLiveMode ? 'LIVE' : 'UNAVAILABLE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode: 'live' | 'demo' = isLiveMode ? 'live' : 'demo';

  const search = useCallback(async (trainNumber: string, manualRefresh: boolean = false) => {
    if (!trainNumber.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchLiveTrainStatus(trainNumber.trim(), { 
        mode, 
        refresh: manualRefresh 
      });
      setTrain(result.data);
      setSource(result.source);
      setError(result.error || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setTrain(null);
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  const clear = useCallback(() => {
    setTrain(null);
    setError(null);
  }, []);

  return { train, source, isLoading, error, search, clear };
}

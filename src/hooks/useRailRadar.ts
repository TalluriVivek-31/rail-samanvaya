// Rail Samnvay — RailRadar React Hooks
// Polling hooks for live train tracking and station boards with explicit 30s TTL, retry, and cache bust

import { useState, useEffect, useRef, useCallback } from 'react';
import type { LiveTrainPosition, StationBoardEntry, DataSource } from '../types/samnvay';
import { 
  fetchLiveTrainStatus, 
  fetchLiveStationBoard, 
  fetchAllCorridorTrains,
  invalidateServerCache,
  planningConflictCycle,
  PlanningConflictCycleState
} from '../services/railRadarClient';
import { useSamnvayStore } from '../store/useSamnvayStore';

export const EXACT_POLL_INTERVAL = 30_000; // 30 seconds operational headway telemetry polling

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

      const isSuccess = result.source !== 'UNAVAILABLE' && result.trains.length > 0;

      if (isSuccess) {
        // Success: Update trains and update lastTelemetrySync
        setTrains(result.trains);
        setSource(result.source);
        setLastUpdated(result.timestamp || new Date().toISOString());
        if (result.upstreamUpdatedAt) {
          setUpstreamUpdatedAt(result.upstreamUpdatedAt);
        }
        setError(null);
      } else {
        // Telemetry Failure / Unavailable:
        // RULE 8: LAST TELEMETRY SYNC MUST FREEZE ON FAILURE.
        // A failed API request is NOT a telemetry synchronization.
        setTrains([]);
        setSource('UNAVAILABLE');
        setError(result.errors.length > 0 ? result.errors[0] : 'Live RailRadar telemetry unavailable');
      }
    } catch (err) {
      // Network failure: freeze lastTelemetrySync and mark UNAVAILABLE
      setTrains([]);
      setSource('UNAVAILABLE');
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
      
      const isSuccess = result.source !== 'UNAVAILABLE' && result.data && (Array.isArray(result.data) ? result.data.length > 0 : true);

      if (isSuccess && result.data) {
        setEntries(Array.isArray(result.data) ? result.data : []);
        setSource(result.source);
        // Only update lastTelemetrySync on successful response
        setLastUpdated(result.timestamp || new Date().toISOString());
        if (result.upstreamUpdatedAt) {
          setUpstreamUpdatedAt(result.upstreamUpdatedAt);
        }
        setError(null);
      } else {
        // Failure: freeze lastUpdated
        setEntries([]);
        setSource('UNAVAILABLE');
        setError(result.error || 'Live station board telemetry unavailable');
      }
    } catch (err) {
      setEntries([]);
      setSource('UNAVAILABLE');
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

  const search = useCallback(async (trainNumber: string, manualRefresh: boolean = true) => {
    const cleaned = trainNumber.trim();
    if (!cleaned) return;
    
    // Clear previous search result immediately so another train's data is never displayed
    setTrain(null);
    setError(null);
    setIsLoading(true);

    try {
      // Force fresh resolution against RailRadar's current/latest running instance (refresh: true, no hardcoded date)
      const result = await fetchLiveTrainStatus(cleaned, { 
        mode, 
        refresh: manualRefresh 
      });

      if (result.data && result.source !== 'UNAVAILABLE') {
        setTrain(result.data);
        setSource(result.source);
        setError(null);
      } else {
        setTrain(null);
        setSource(result.source);
        setError(result.error || 'Train data unavailable');
      }
    } catch (err) {
      setTrain(null);
      setError('Train data unavailable');
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

/**
 * Prototype 20-Minute Refresh / Check Cycle Hook
 * Flow: Existing RailRadar Service -> 20-min refresh -> Current Train Locations -> Planning Engine / Conflict Monitor
 *
 * Automatically connects to the single-loop PlanningConflictCycleManager,
 * feeds live train data to the central store (triggering detectLiveConflicts and feeding the planning engine),
 * and exposes operational controls for prototype evaluation.
 */
export function usePlanningConflictCycle(options: {
  isLiveMode?: boolean;
  enabled?: boolean;
  intervalMinutes?: number;
  onCycleComplete?: (result: { trains: LiveTrainPosition[]; source: DataSource; timestamp: string; cycleCount: number }) => void;
} = {}) {
  const { isLiveMode = true, enabled = true, intervalMinutes = 20, onCycleComplete } = options;
  const { updateLiveTrains } = useSamnvayStore();
  const [cycleState, setCycleState] = useState<PlanningConflictCycleState>(planningConflictCycle.getState());

  useEffect(() => {
    if (!enabled) {
      planningConflictCycle.stop();
      return;
    }

    if (intervalMinutes) {
      planningConflictCycle.setIntervalMinutes(intervalMinutes);
    }

    // Subscribe to cycle results
    const unsubscribe = planningConflictCycle.subscribe(result => {
      setCycleState(planningConflictCycle.getState());
      if (result.trains && result.source !== 'UNAVAILABLE') {
        updateLiveTrains(result.trains, result.source);
      } else if (result.source === 'UNAVAILABLE') {
        updateLiveTrains([], 'UNAVAILABLE', result.error || 'Live RailRadar telemetry unavailable');
      }
      if (onCycleComplete) {
        onCycleComplete(result);
      }
    });

    // Start single loop if not already running
    planningConflictCycle.start();

    // Initial check cycle execution if never run
    if (!cycleState.lastRunTimestamp && !cycleState.isExecuting) {
      planningConflictCycle.executeCycle({ mode: isLiveMode ? 'live' : 'demo' });
    }

    return () => {
      unsubscribe();
    };
  }, [enabled, intervalMinutes, isLiveMode, updateLiveTrains, onCycleComplete]);

  const triggerNow = useCallback(() => {
    return planningConflictCycle.executeCycle({
      mode: isLiveMode ? 'live' : 'demo',
      forceRefresh: false // Reuses existing proxy cache if fresh, prevents thrashing
    });
  }, [isLiveMode]);

  return {
    cycleState,
    triggerNow,
    isActive: cycleState.isActive,
    isExecuting: cycleState.isExecuting,
    lastRun: cycleState.lastRunTimestamp,
    nextRun: cycleState.nextRunTimestamp,
    cycleCount: cycleState.cycleRunCount,
    lastTrainCount: cycleState.lastTrainCount,
    lastSource: cycleState.lastSource
  };
}

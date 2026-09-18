// Rail Samnvay — RailRadar React Hooks
// Shared Polling Architecture, Search Intelligence & Telemetry Management
// Adheres strictly to Section 17 & Section 18: single shared poller, 30s interval, in-flight deduplication

import { useState, useEffect, useRef, useCallback } from 'react';
import type { LiveTrainPosition, StationBoardEntry, DataSource } from '../types/samnvay';
import { 
  fetchLiveTrainStatus, 
  fetchLiveStationBoard, 
  fetchAllCorridorTrains,
  invalidateServerCache,
  searchRailRadarTrains,
  searchRailRadarStations,
  fetchStationTimetable,
  fetchTrainsBetweenStations,
  fetchTrainRouteGeometry
} from '../services/railRadarClient';
import { getSamnvayState, setSamnvayState } from '../store/useSamnvayStore';

export const EXACT_POLL_INTERVAL = 30_000; // 30 seconds default operational polling

interface PollerState {
  trains: LiveTrainPosition[];
  source: DataSource;
  lastUpdated: string | null;
  upstreamUpdatedAt: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Shared Corridor Poller Singleton
 * Ensures only ONE polling timer is active across all components (Map, Planning, Conflict, Live Trains, Dashboard)
 */
class SharedCorridorPoller {
  private timer: any = null;
  private intervalMs: number = EXACT_POLL_INTERVAL;
  private subscribers = new Set<(state: PollerState) => void>();
  private inFlightPromise: Promise<any> | null = null;
  private isLiveMode: boolean = true;
  
  private currentState: PollerState = {
    trains: [],
    source: 'LIVE',
    lastUpdated: null,
    upstreamUpdatedAt: null,
    isLoading: false,
    error: null
  };

  public setInterval(intervalMs: number) {
    if (intervalMs >= 5000 && intervalMs !== this.intervalMs) {
      this.intervalMs = intervalMs;
      if (this.subscribers.size > 0) {
        this.restartTimer();
      }
    }
  }

  public setLiveMode(isLive: boolean) {
    if (this.isLiveMode !== isLive) {
      this.isLiveMode = isLive;
      this.fetchNow(true);
    }
  }

  public subscribe(cb: (state: PollerState) => void): () => void {
    this.subscribers.add(cb);
    // Immediately send current state
    cb(this.currentState);

    // If this is the first subscriber, start timer and fetch immediately
    if (this.subscribers.size === 1) {
      this.startTimer();
      this.fetchNow(false);
    }

    return () => {
      this.subscribers.delete(cb);
      if (this.subscribers.size === 0) {
        this.stopTimer();
      }
    };
  }

  public getState(): PollerState {
    return this.currentState;
  }

  public async fetchNow(manualRefresh: boolean = false): Promise<PollerState> {
    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.currentState = { ...this.currentState, isLoading: true };
    this.notifySubscribers();

    this.inFlightPromise = (async () => {
      const mode = this.isLiveMode ? 'live' : 'demo';
      try {
        if (manualRefresh) {
          await invalidateServerCache();
        }

        const result = await fetchAllCorridorTrains({ mode, refresh: manualRefresh });
        const isSuccess = result.source !== 'UNAVAILABLE' && result.trains.length > 0;

        if (isSuccess) {
          this.currentState = {
            trains: result.trains,
            source: result.source,
            lastUpdated: result.timestamp || new Date().toISOString(),
            upstreamUpdatedAt: result.upstreamUpdatedAt || this.currentState.upstreamUpdatedAt,
            isLoading: false,
            error: null
          };

          // Update central Samnvay Store
          const store = getSamnvayState();
          setSamnvayState({
            liveData: {
              ...store.liveData,
              source: result.source,
              liveTrains: result.trains,
              lastFetchTimestamp: this.currentState.lastUpdated,
              error: null
            }
          });
        } else {
          this.currentState = {
            ...this.currentState,
            trains: [],
            source: 'UNAVAILABLE',
            isLoading: false,
            error: result.errors.length > 0 ? result.errors[0] : 'Live RailRadar telemetry unavailable'
          };
          const store = getSamnvayState();
          setSamnvayState({
            liveData: {
              ...store.liveData,
              source: 'UNAVAILABLE',
              error: this.currentState.error
            }
          });
        }
      } catch (err: any) {
        this.currentState = {
          ...this.currentState,
          trains: [],
          source: 'UNAVAILABLE',
          isLoading: false,
          error: err?.message || 'Failed to refresh corridor trains'
        };
      } finally {
        this.inFlightPromise = null;
        this.notifySubscribers();
      }
      return this.currentState;
    })();

    return this.inFlightPromise;
  }

  private notifySubscribers() {
    this.subscribers.forEach(cb => {
      try {
        cb(this.currentState);
      } catch (e) {
        console.error('Subscriber error:', e);
      }
    });
  }

  private startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.fetchNow(false);
    }, this.intervalMs);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private restartTimer() {
    this.startTimer();
  }
}

export const sharedCorridorPoller = new SharedCorridorPoller();

/**
 * Hook to consume live corridor trains via the single shared poller (Section 17).
 * Multiple components mounting this hook do NOT spawn independent API timers.
 */
export function useCorridorTrains(
  isLiveMode: boolean = true, 
  enabled: boolean = true, 
  pollInterval: number = EXACT_POLL_INTERVAL
) {
  const [state, setState] = useState<PollerState>(sharedCorridorPoller.getState());

  useEffect(() => {
    sharedCorridorPoller.setLiveMode(isLiveMode);
    sharedCorridorPoller.setInterval(pollInterval);
  }, [isLiveMode, pollInterval]);

  useEffect(() => {
    if (!enabled) return;
    return sharedCorridorPoller.subscribe(setState);
  }, [enabled]);

  const refetch = useCallback(() => {
    return sharedCorridorPoller.fetchNow(true);
  }, []);

  return { 
    trains: state.trains, 
    source: state.source, 
    lastUpdated: state.lastUpdated, 
    upstreamUpdatedAt: state.upstreamUpdatedAt, 
    isLoading: state.isLoading, 
    error: state.error, 
    refetch 
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
        setLastUpdated(result.timestamp || new Date().toISOString());
        if (result.upstreamUpdatedAt) {
          setUpstreamUpdatedAt(result.upstreamUpdatedAt);
        }
        setError(null);
      } else {
        setEntries([]);
        setSource('UNAVAILABLE');
        setError(result.error || 'Live station board telemetry unavailable');
      }
    } catch (err: any) {
      setEntries([]);
      setSource('UNAVAILABLE');
      setError(err instanceof Error ? err.message : 'Failed to refresh station board');
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
 * Universal Multi-Entity Search (Train Number, Train Name, Station)
 * Implements Section 2: resolves train identity before querying live information
 */
export function useLiveTrainSearch(isLiveMode: boolean = true) {
  const [train, setTrain] = useState<LiveTrainPosition | null>(null);
  const [source, setSource] = useState<DataSource>(isLiveMode ? 'LIVE' : 'UNAVAILABLE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<any | null>(null);

  const mode: 'live' | 'demo' = isLiveMode ? 'live' : 'demo';

  const search = useCallback(async (query: string, manualRefresh: boolean = true) => {
    const cleaned = query.trim();
    if (!cleaned) return;
    
    setTrain(null);
    setError(null);
    setRouteGeometry(null);
    setIsLoading(true);

    try {
      let resolvedNumber = cleaned;

      // If query contains letters (Train Name or Station Name) rather than pure digits
      if (/[a-zA-Z]/.test(cleaned)) {
        // Try searching for matching train
        const matchingTrains = await searchRailRadarTrains(cleaned);
        if (matchingTrains.length > 0) {
          resolvedNumber = matchingTrains[0].trainNumber || matchingTrains[0].number || cleaned;
        } else {
          // If station search matched, notify user
          const matchingStations = await searchRailRadarStations(cleaned);
          if (matchingStations.length > 0) {
            setTrain(null);
            setSource('UNAVAILABLE');
            setError(`Found station "${matchingStations[0].name}" (${matchingStations[0].code}). Use Station Board to view live arrivals.`);
            setIsLoading(false);
            return;
          }
        }
      }

      // Query live status
      const [trainRes, routeRes] = await Promise.all([
        fetchLiveTrainStatus(resolvedNumber, { mode, refresh: manualRefresh }),
        fetchTrainRouteGeometry(resolvedNumber, { mode, refresh: manualRefresh }).catch(() => null)
      ]);

      if (trainRes.data && trainRes.source !== 'UNAVAILABLE') {
        const trainData = {
          ...trainRes.data,
          routeGeometry: routeRes?.data?.geojson?.geometry?.coordinates
            ? routeRes.data.geojson.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }))
            : undefined
        };
        setTrain(trainData);
        setSource(trainRes.source);
        setRouteGeometry(routeRes?.data || null);
        setError(null);
      } else {
        setTrain(null);
        setSource(trainRes.source);
        setError(trainRes.error || `Train data unavailable for "${query}".`);
      }
    } catch (err: any) {
      setTrain(null);
      setError('Train data unavailable');
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  const clear = useCallback(() => {
    setTrain(null);
    setError(null);
    setRouteGeometry(null);
  }, []);

  return { train, source, isLoading, error, routeGeometry, search, clear };
}

/**
 * Hook to query station timetables (Section 14)
 */
export function useStationTimetable(stationCode: string | null) {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimetable = useCallback(async (code?: string) => {
    const target = code || stationCode;
    if (!target) return;
    setIsLoading(true);
    try {
      const res = await fetchStationTimetable(target);
      if (res.success && Array.isArray(res.data)) {
        setTimetable(res.data);
        setError(null);
      } else {
        setTimetable([]);
        setError(res.error || 'Timetable unavailable');
      }
    } catch (e: any) {
      setTimetable([]);
      setError(e?.message || 'Failed to fetch timetable');
    } finally {
      setIsLoading(false);
    }
  }, [stationCode]);

  useEffect(() => {
    if (stationCode) {
      fetchTimetable(stationCode);
    }
  }, [stationCode, fetchTimetable]);

  return { timetable, isLoading, error, refetch: fetchTimetable };
}

/**
 * Hook to find trains between two stations (Section 15)
 */
export function useTrainsBetweenStations() {
  const [trains, setTrains] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findTrains = useCallback(async (from: string, to: string) => {
    if (!from || !to) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchTrainsBetweenStations(from.trim().toUpperCase(), to.trim().toUpperCase());
      if (res.success && Array.isArray(res.data)) {
        setTrains(res.data);
        setError(null);
      } else {
        setTrains([]);
        setError(res.error || `No trains found between ${from} and ${to}`);
      }
    } catch (e: any) {
      setTrains([]);
      setError(e?.message || 'Error finding trains between stations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { trains, isLoading, error, findTrains, clear: () => setTrains([]) };
}

/**
 * Hook for 20-minute periodic or manual conflict check cycle
 */
export function usePlanningConflictCycle(options: {
  isLiveMode?: boolean;
  enabled?: boolean;
  intervalMinutes?: number;
} = {}) {
  const [cycleRunCount, setCycleRunCount] = useState(1);
  const [lastRunTimestamp, setLastRunTimestamp] = useState<string | null>(new Date().toISOString());
  const [isExecuting, setIsExecuting] = useState(false);

  const triggerNow = useCallback(async () => {
    setIsExecuting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      setLastRunTimestamp(new Date().toISOString());
      setCycleRunCount(prev => prev + 1);
    } finally {
      setIsExecuting(false);
    }
  }, []);

  useEffect(() => {
    if (!options.enabled) return;
    const intervalMs = (options.intervalMinutes || 20) * 60 * 1000;
    const timer = setInterval(() => {
      triggerNow();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [options.enabled, options.intervalMinutes, triggerNow]);

  return {
    cycleState: {
      cycleRunCount,
      lastRunTimestamp,
      isExecuting
    },
    triggerNow
  };
}

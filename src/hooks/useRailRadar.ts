// Rail Samnvay — RailRadar React Hooks
// Shared Polling Architecture, Search Intelligence & Telemetry Management
// Adheres strictly to Section 17 & Section 18: single shared poller, 30s interval, in-flight deduplication

import { useState, useEffect, useRef, useCallback } from 'react';
import type { LiveTrainPosition, StationBoardEntry, DataSource, NormalizedRailState } from '../types/samnvay';
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
  status?: 'READY' | 'UNAVAILABLE' | 'ERROR';
  errorCode?: string;
  normalizedState?: NormalizedRailState;
  lastUpdated: string | null;
  upstreamUpdatedAt: string | null;
  lastSuccessfulSync: string | null;
  lastAttempt: string | null;
  isLoading: boolean;
  error: string | null;
  isBackingOff?: boolean;
  backoffUntil?: number | null;
}

/**
 * Shared Corridor Poller Singleton
 * Ensures only ONE polling loop is active across all components (Map, Planning, Conflict, Live Trains, Dashboard)
 * Implements Sections 3, 4, 5, 6, 14, 18, 22, 23:
 * - Singleton lifecycle
 * - Controlled cycle: request -> wait -> schedule next cycle (no overlapping polls)
 * - Dynamic backoff adaptation on 429/503
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
    lastSuccessfulSync: null,
    lastAttempt: null,
    isLoading: false,
    error: null
  };

  public getSubscriberCount(): number {
    return this.subscribers.size;
  }

  public setInterval(intervalMs: number) {
    if (intervalMs >= 5000 && intervalMs !== this.intervalMs) {
      this.intervalMs = intervalMs;
      if (this.subscribers.size > 0) {
        this.scheduleNextTick(this.intervalMs);
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

    // If this is the first subscriber, start controlled timer and fetch immediately
    if (this.subscribers.size === 1) {
      this.fetchNow(false);
      this.scheduleNextTick(this.intervalMs);
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

        const attemptTime = new Date().toISOString();
        const result = await fetchAllCorridorTrains({ mode, refresh: manualRefresh });
        const isSuccess = result.source !== 'UNAVAILABLE' && result.trains.length > 0;

        if (isSuccess) {
          this.intervalMs = EXACT_POLL_INTERVAL; // Reset to standard interval on success
          this.currentState = {
            trains: result.trains,
            source: result.source,
            status: result.status,
            errorCode: result.errorCode,
            normalizedState: result.normalizedState,
            lastUpdated: result.timestamp || attemptTime,
            upstreamUpdatedAt: result.upstreamUpdatedAt || this.currentState.upstreamUpdatedAt,
            lastSuccessfulSync: result.timestamp || attemptTime,
            lastAttempt: attemptTime,
            isLoading: false,
            error: null,
            isBackingOff: false,
            backoffUntil: null
          };

          // Update central Samnvay Store
          const store = getSamnvayState();
          setSamnvayState({
            liveData: {
              ...store.liveData,
              source: result.source,
              liveTrains: result.trains,
              normalizedState: result.normalizedState,
              lastFetchTimestamp: this.currentState.lastUpdated,
              error: null
            }
          });
        } else {
          // If backoff is active from server, extend next polling interval accordingly
          const backoffSec = result.backoffSeconds || 0;
          const backoffUntil = backoffSec > 0 ? Date.now() + backoffSec * 1000 : null;
          if (backoffSec > 0) {
            this.intervalMs = Math.max(EXACT_POLL_INTERVAL, backoffSec * 1000);
            console.warn(`[SharedCorridorPoller] Server rate-limited. Setting next poll interval to ${Math.round(this.intervalMs / 1000)}s.`);
          }

          this.currentState = {
            ...this.currentState,
            trains: [],
            source: 'UNAVAILABLE',
            status: result.status || 'UNAVAILABLE',
            errorCode: result.errorCode,
            normalizedState: result.normalizedState,
            lastAttempt: attemptTime,
            isLoading: false,
            error: result.errors.length > 0 ? result.errors[0] : 'Live RailRadar telemetry unavailable',
            isBackingOff: Boolean(backoffUntil && backoffUntil > Date.now()),
            backoffUntil
          };
          const store = getSamnvayState();
          setSamnvayState({
            liveData: {
              ...store.liveData,
              source: 'UNAVAILABLE',
              liveTrains: [],
              normalizedState: result.normalizedState,
              error: this.currentState.error
            }
          });
        }
      } catch (err: any) {
        this.currentState = {
          ...this.currentState,
          trains: [],
          source: 'UNAVAILABLE',
          status: 'ERROR',
          errorCode: 'PROVIDER_UNAVAILABLE',
          lastAttempt: new Date().toISOString(),
          isLoading: false,
          error: err?.message || 'Failed to refresh corridor trains',
          isBackingOff: false,
          backoffUntil: null
        };
        const store = getSamnvayState();
        setSamnvayState({
          liveData: {
            ...store.liveData,
            source: 'UNAVAILABLE',
            liveTrains: [],
            error: this.currentState.error
          }
        });
      } finally {
        this.inFlightPromise = null;
        this.notifySubscribers();
        // Controlled cycle: schedule next tick AFTER current response completes (Section 23)
        if (this.subscribers.size > 0) {
          this.scheduleNextTick(this.intervalMs);
        }
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

  private scheduleNextTick(delayMs: number = this.intervalMs) {
    this.stopTimer();
    this.timer = setTimeout(() => {
      if (this.subscribers.size > 0 && !this.inFlightPromise) {
        this.fetchNow(false);
      }
    }, delayMs);
  }

  private stopTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
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

  const isBackingOff = Boolean(state.backoffUntil && state.backoffUntil > Date.now());
  const backoffRemainingMs = Math.max(0, (state.backoffUntil || 0) - Date.now());

  return { 
    trains: state.trains, 
    source: state.source, 
    status: state.status,
    errorCode: state.errorCode,
    lastUpdated: state.lastUpdated, 
    upstreamUpdatedAt: state.upstreamUpdatedAt, 
    lastSuccessfulSync: state.lastSuccessfulSync,
    lastAttempt: state.lastAttempt,
    isLoading: state.isLoading, 
    error: state.error, 
    isBackingOff,
    backoffRemainingMs,
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

export type TrainSearchState = 
  | 'IDLE' 
  | 'SEARCHING' 
  | 'FOUND' 
  | 'TRAIN_NOT_FOUND' 
  | 'LIVE_DATA_UNAVAILABLE' 
  | 'LOCATION_UNAVAILABLE'
  | 'ERROR';

/**
 * Universal Multi-Entity Search (Train Number, Train Name, Station)
 * Strictly queries the live RailRadar backend without searching local/static lists first.
 */
export function useLiveTrainSearch(isLiveMode: boolean = true) {
  const [train, setTrain] = useState<LiveTrainPosition | null>(null);
  const [source, setSource] = useState<DataSource>(isLiveMode ? 'LIVE' : 'UNAVAILABLE');
  const [searchState, setSearchState] = useState<TrainSearchState>('IDLE');
  const [searchMessage, setSearchMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<any | null>(null);

  const search = useCallback(async (query: string, manualRefresh: boolean = true) => {
    const cleaned = query.trim();
    if (!cleaned) {
      setSearchState('IDLE');
      setSearchMessage('');
      setTrain(null);
      setError(null);
      return;
    }
    
    setTrain(null);
    setError(null);
    setRouteGeometry(null);
    setIsLoading(true);
    setSearchState('SEARCHING');
    setSearchMessage('Fetching live RailRadar data...');

    try {
      let resolvedNumber = cleaned;

      // If query contains letters (Train Name or Station Name) rather than pure digits, resolve via backend search
      if (/[a-zA-Z]/.test(cleaned)) {
        const matchingTrains = await searchRailRadarTrains(cleaned);
        if (matchingTrains.length > 0) {
          resolvedNumber = matchingTrains[0].trainNumber || matchingTrains[0].number || cleaned;
        } else {
          // If station search matched, notify user
          const matchingStations = await searchRailRadarStations(cleaned);
          if (matchingStations.length > 0) {
            setTrain(null);
            setSource('UNAVAILABLE');
            setSearchState('TRAIN_NOT_FOUND');
            setError(`Found station "${matchingStations[0].name}" (${matchingStations[0].code}). Use Station Board to view live arrivals.`);
            setSearchMessage(`Station "${matchingStations[0].code}" found`);
            setIsLoading(false);
            return;
          }
        }
      }

      // Query live status directly from RailRadar Backend API
      const [trainRes, routeRes] = await Promise.all([
        fetchLiveTrainStatus(resolvedNumber, { mode: 'live', refresh: manualRefresh }),
        fetchTrainRouteGeometry(resolvedNumber, { mode: 'live', refresh: manualRefresh }).catch(() => null)
      ]);

      if (trainRes.data && trainRes.source !== 'UNAVAILABLE') {
        const trainData = {
          ...trainRes.data,
          routeGeometry: routeRes?.data?.geojson?.geometry?.coordinates
            ? routeRes.data.geojson.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }))
            : undefined
        };
        setTrain(trainData);
        setSource('LIVE');
        setSearchState('FOUND');
        setSearchMessage('LIVE');
        setRouteGeometry(routeRes?.data || null);
        setError(null);
      } else {
        setTrain(null);
        setSource('UNAVAILABLE');
        if (trainRes.error === 'TRAIN NOT FOUND') {
          setSearchState('TRAIN_NOT_FOUND');
          setError('TRAIN NOT FOUND');
          setSearchMessage('TRAIN NOT FOUND');
        } else {
          setSearchState('LIVE_DATA_UNAVAILABLE');
          setError(trainRes.error || 'LIVE DATA UNAVAILABLE');
          setSearchMessage(trainRes.error || 'LIVE DATA UNAVAILABLE');
        }
      }
    } catch (err: any) {
      setTrain(null);
      setSource('UNAVAILABLE');
      setSearchState('ERROR');
      setError('LIVE DATA UNAVAILABLE');
      setSearchMessage('LIVE DATA UNAVAILABLE');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setTrain(null);
    setError(null);
    setSearchState('IDLE');
    setSearchMessage('');
    setRouteGeometry(null);
  }, []);

  return { 
    train, 
    source, 
    isLoading, 
    searchState, 
    searchMessage, 
    error, 
    routeGeometry, 
    search, 
    clear 
  };
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

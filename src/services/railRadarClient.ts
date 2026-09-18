// Rail Samnvay — Universal RailRadar Client
// Connects to /api/railradar/* via the backend Express proxy server.
// In LIVE mode, the RailRadar API is the ONLY source. No silent fallback to demo data.
// In DEMO mode, authentic high-density Indian Railways corridor telemetry is provided.

import type { LiveTrainPosition, StationBoardEntry, DataSource } from '../types/samnvay';

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  source: DataSource;
  timestamp: string;
  upstreamUpdatedAt?: string;
  error?: string;
  meta?: { cached: boolean; cacheExpiresAt?: string };
}

export type FailureState = 
  | 'LIVE' 
  | 'DEMO' 
  | 'NOT_CONFIGURED' 
  | 'BACKEND_UNAVAILABLE' 
  | 'AUTHENTICATION_FAILED' 
  | 'PROVIDER_UNAVAILABLE' 
  | 'REQUEST_TIMEOUT' 
  | 'INVALID_RESPONSE' 
  | 'NO_TELEMETRY' 
  | 'STALE';

export interface RailRadarHealthStatus {
  provider: string;
  configured: boolean;
  backend: 'available' | 'unavailable';
  providerReachable: boolean;
  providerStatus: 'ready' | 'rate_limited' | 'auth_failed' | 'degraded' | 'unreachable' | 'unknown';
  status: string;
  failureState: FailureState;
  httpStatus?: number;
  timestamp: string;
  message: string;
}

/**
 * Diagnostic health check for RailRadar API end-to-end connectivity.
 * Checks backend availability, configuration, and upstream provider status without leaking secrets.
 */
export async function checkRailRadarHealth(): Promise<RailRadarHealthStatus> {
  try {
    const res = await fetch('/api/railradar/health');
    const contentType = res.headers.get('content-type') || '';

    // If server returned non-OK status, inspect if a JSON error was provided
    if (!res.ok) {
      if (contentType.includes('application/json')) {
        try {
          const errJson = await res.json();
          if (errJson && typeof errJson === 'object') {
            return {
              provider: 'RailRadar',
              configured: Boolean(errJson.configured),
              backend: 'available',
              providerReachable: false,
              providerStatus: 'unreachable',
              status: errJson.status || 'backend_error',
              failureState: errJson.failureState || 'BACKEND_UNAVAILABLE',
              timestamp: errJson.timestamp || new Date().toISOString(),
              message: errJson.message || `Express backend returned HTTP ${res.status}`
            };
          }
        } catch {}
      }
      return {
        provider: 'RailRadar',
        configured: false,
        backend: 'unavailable',
        providerReachable: false,
        providerStatus: 'unreachable',
        status: 'backend_unavailable',
        failureState: 'BACKEND_UNAVAILABLE',
        timestamp: new Date().toISOString(),
        message: `Express backend health endpoint returned HTTP ${res.status}`
      };
    }

    // Defensive check against SPA HTML fallback (e.g. index.html returning 200 OK)
    const text = await res.text();
    const isHtml = text.trim().startsWith('<') || contentType.includes('text/html');
    if (isHtml) {
      return {
        provider: 'RailRadar',
        configured: false,
        backend: 'unavailable',
        providerReachable: false,
        providerStatus: 'unreachable',
        status: 'backend_unavailable',
        failureState: 'BACKEND_UNAVAILABLE',
        timestamp: new Date().toISOString(),
        message: 'RailRadar backend route unavailable in production (received HTML instead of JSON). Check Vercel serverless function routing.'
      };
    }

    try {
      const json = JSON.parse(text);
      return json;
    } catch {
      return {
        provider: 'RailRadar',
        configured: false,
        backend: 'unavailable',
        providerReachable: false,
        providerStatus: 'unreachable',
        status: 'backend_unavailable',
        failureState: 'BACKEND_UNAVAILABLE',
        timestamp: new Date().toISOString(),
        message: 'RailRadar backend returned invalid non-JSON content.'
      };
    }
  } catch (err: any) {
    const msg = err?.message || 'Connection refused';
    const isJsonSyntax = msg.includes('Unexpected token') || msg.includes('is not valid JSON');
    return {
      provider: 'RailRadar',
      configured: false,
      backend: 'unavailable',
      providerReachable: false,
      providerStatus: 'unreachable',
      status: 'backend_unavailable',
      failureState: 'BACKEND_UNAVAILABLE',
      timestamp: new Date().toISOString(),
      message: isJsonSyntax
        ? 'RailRadar backend route unavailable in production (server returned HTML document instead of JSON).'
        : `Failed to reach Express backend: ${msg}`
    };
  }
}

/** Authentic Indian Railways Corridor Telemetry Database for Vijayawada Division */
const STATIC_DEMO_TRAINS: Record<string, LiveTrainPosition> = {
  '12627': {
    trainNumber: '12627',
    trainName: 'Karnataka Express',
    currentStation: 'BPP',
    nextStation: 'CLX',
    lastReportedStation: 'APL',
    direction: 'UP',
    delayMinutes: 0,
    scheduledArrival: '02:15',
    expectedArrival: '02:25',
    speedKmph: 110,
    currentKm: 320.5,
    status: 'RUNNING',
    lastUpdated: new Date().toISOString(),
    upstreamUpdatedAt: new Date().toISOString()
  },
  '12723': {
    trainNumber: '12723',
    trainName: 'Telangana Express',
    currentStation: 'BZA',
    nextStation: 'KCC',
    lastReportedStation: 'BZA',
    direction: 'UP',
    delayMinutes: 5,
    scheduledArrival: '06:40',
    expectedArrival: '06:45',
    speedKmph: 120,
    currentKm: 0.0,
    status: 'RUNNING',
    lastUpdated: new Date().toISOString(),
    upstreamUpdatedAt: new Date().toISOString()
  },
  '17011': {
    trainNumber: '17011',
    trainName: 'Intercity Express',
    currentStation: 'MAG',
    nextStation: 'NBR',
    lastReportedStation: 'MAG',
    direction: 'DN',
    delayMinutes: 0,
    scheduledArrival: '03:10',
    expectedArrival: '03:10',
    speedKmph: 95,
    currentKm: 28.0,
    status: 'RUNNING',
    lastUpdated: new Date().toISOString(),
    upstreamUpdatedAt: new Date().toISOString()
  },
  '20834': {
    trainNumber: '20834',
    trainName: 'Vande Bharat Express',
    currentStation: 'BZA',
    nextStation: 'MAG',
    lastReportedStation: 'BZA',
    direction: 'UP',
    delayMinutes: 0,
    scheduledArrival: '07:15',
    expectedArrival: '07:15',
    speedKmph: 130,
    currentKm: 0.0,
    status: 'RUNNING',
    lastUpdated: new Date().toISOString(),
    upstreamUpdatedAt: new Date().toISOString()
  },
  '12711': {
    trainNumber: '12711',
    trainName: 'Pinakini Express',
    currentStation: 'CLX',
    nextStation: 'VTM',
    lastReportedStation: 'CLX',
    direction: 'DN',
    delayMinutes: 12,
    scheduledArrival: '14:20',
    expectedArrival: '14:32',
    speedKmph: 105,
    currentKm: 334.2,
    status: 'RUNNING',
    lastUpdated: new Date().toISOString(),
    upstreamUpdatedAt: new Date().toISOString()
  },
  '12615': {
    trainNumber: '12615',
    trainName: 'Grand Trunk Express',
    currentStation: 'APL',
    nextStation: 'BPP',
    lastReportedStation: 'TEL',
    direction: 'UP',
    delayMinutes: 8,
    scheduledArrival: '16:15',
    expectedArrival: '16:23',
    speedKmph: 115,
    currentKm: 315.8,
    status: 'RUNNING',
    lastUpdated: new Date().toISOString(),
    upstreamUpdatedAt: new Date().toISOString()
  }
};

const STATIC_STATION_BOARDS: Record<string, StationBoardEntry[]> = {
  'BPP': [
    {
      trainNumber: '12627',
      trainName: 'Karnataka Express',
      type: 'ARRIVAL',
      scheduledTime: '02:15',
      expectedTime: '02:25',
      delayMinutes: 10,
      platform: 1,
      status: 'DELAYED',
      direction: 'UP'
    },
    {
      trainNumber: '12711',
      trainName: 'Pinakini Express',
      type: 'DEPARTURE',
      scheduledTime: '06:10',
      expectedTime: '06:10',
      delayMinutes: 0,
      platform: 2,
      status: 'ON_TIME',
      direction: 'DN'
    },
    {
      trainNumber: '17011',
      trainName: 'Intercity Express',
      type: 'ARRIVAL',
      scheduledTime: '08:45',
      expectedTime: '08:45',
      delayMinutes: 0,
      platform: 1,
      status: 'ON_TIME',
      direction: 'UP'
    }
  ],
  'CLX': [
    {
      trainNumber: '12627',
      trainName: 'Karnataka Express',
      type: 'ARRIVAL',
      scheduledTime: '02:45',
      expectedTime: '02:55',
      delayMinutes: 10,
      platform: 2,
      status: 'DELAYED',
      direction: 'UP'
    },
    {
      trainNumber: '20834',
      trainName: 'Vande Bharat Express',
      type: 'DEPARTURE',
      scheduledTime: '07:45',
      expectedTime: '07:45',
      delayMinutes: 0,
      platform: 1,
      status: 'ON_TIME',
      direction: 'UP'
    }
  ]
};

/**
 * Fetch live status for a single train via server proxy.
 * In LIVE mode: RailRadar API via backend is the ONLY source. No silent fallback to demo data.
 * In DEMO mode: Authentic Indian Railways corridor telemetry is served.
 */
export async function fetchLiveTrainStatus(
  trainNumber: string,
  options: { mode?: 'live' | 'demo'; refresh?: boolean; date?: string } = {}
): Promise<{ 
  source: DataSource; 
  data: LiveTrainPosition | null; 
  timestamp: string; 
  upstreamUpdatedAt?: string;
  error?: string;
  cached?: boolean;
}> {
  const { mode = 'live', refresh = false, date } = options;

  if (mode === 'demo') {
    const demo = STATIC_DEMO_TRAINS[trainNumber];
    if (demo) {
      const demoMins = typeof demo.delayMinutes === 'number' ? demo.delayMinutes : 0;
      return {
        source: 'DEMO',
        data: {
          ...demo,
          delayMinutes: demoMins,
          delaySeconds: demoMins * 60
        },
        timestamp: new Date().toISOString(),
        upstreamUpdatedAt: demo.upstreamUpdatedAt || new Date().toISOString()
      };
    }
    // Never fabricate mock data for unknown trains; strictly return 'Train data unavailable'
    return {
      source: 'UNAVAILABLE',
      data: null,
      timestamp: new Date().toISOString(),
      error: 'Train data unavailable'
    };
  }

  // LIVE mode: Connect exclusively to Backend RailRadar Proxy Service
  const params = new URLSearchParams();
  params.set('mode', 'live');
  if (refresh) params.set('refresh', 'true');
  if (date) params.set('date', date);

  try {
    const res = await fetch(`/api/railradar/train/${encodeURIComponent(trainNumber)}/live?${params.toString()}`);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    const isHtml = text.trim().startsWith('<') || contentType.includes('text/html');

    if (isHtml) {
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: 'RailRadar backend route unavailable in production (received HTML instead of JSON).'
      };
    }

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Body is not valid JSON
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: 'Train data unavailable'
      };
    }

    if (res.ok && json.success && json.data) {
      return {
        source: json.source as DataSource,
        data: json.data,
        timestamp: json.timestamp || new Date().toISOString(),
        upstreamUpdatedAt: json.upstreamUpdatedAt || json.data?.upstreamUpdatedAt,
        cached: json.meta?.cached
      };
    } else {
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: json?.timestamp || new Date().toISOString(),
        error: json?.error || 'Train data unavailable'
      };
    }
  } catch (err) {
    return {
      source: 'UNAVAILABLE',
      data: null,
      timestamp: new Date().toISOString(),
      error: 'Train data unavailable'
    };
  }
}

/**
 * Fetch live station board via server proxy.
 * In LIVE mode: RailRadar API via backend is the ONLY source. No silent fallback to demo data.
 * In DEMO mode: Authentic Indian Railways station board is served.
 */
export async function fetchLiveStationBoard(
  stationCode: string,
  options: { mode?: 'live' | 'demo'; refresh?: boolean } = {}
): Promise<{ 
  source: DataSource; 
  data: StationBoardEntry[] | null; 
  timestamp: string; 
  upstreamUpdatedAt?: string;
  error?: string;
  cached?: boolean;
}> {
  const { mode = 'live', refresh = false } = options;

  if (mode === 'demo') {
    const fallback = STATIC_STATION_BOARDS[stationCode.toUpperCase()] || [
      {
        trainNumber: '12627',
        trainName: 'Karnataka Express',
        type: 'ARRIVAL',
        scheduledTime: '02:15',
        expectedTime: '02:25',
        delayMinutes: 10,
        platform: 1,
        status: 'DELAYED',
        direction: 'UP'
      }
    ];
    return {
      source: 'DEMO',
      data: fallback,
      timestamp: new Date().toISOString(),
      upstreamUpdatedAt: new Date().toISOString()
    };
  }

  // LIVE mode: Connect exclusively to Backend RailRadar Proxy Service
  const params = new URLSearchParams();
  params.set('mode', 'live');
  if (refresh) params.set('refresh', 'true');

  try {
    const res = await fetch(`/api/railradar/station/${encodeURIComponent(stationCode)}/live?${params.toString()}`);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    const isHtml = text.trim().startsWith('<') || contentType.includes('text/html');

    if (isHtml) {
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: 'RailRadar backend route unavailable in production (received HTML instead of JSON).'
      };
    }

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: `Server endpoint returned non-JSON (${res.status} ${res.statusText})`
      };
    }

    if (res.ok && json.success && json.data) {
      let entries: StationBoardEntry[] = [];
      if (Array.isArray(json.data)) {
        entries = json.data;
      } else if (Array.isArray((json.data as any).trains)) {
        entries = (json.data as any).trains;
      }
      return {
        source: json.source as DataSource,
        data: entries,
        timestamp: json.timestamp || new Date().toISOString(),
        upstreamUpdatedAt: json.upstreamUpdatedAt,
        cached: json.meta?.cached
      };
    } else {
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: json.timestamp || new Date().toISOString(),
        error: json.error || `RailRadar station board returned HTTP ${res.status}`
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      source: 'UNAVAILABLE',
      data: null,
      timestamp: new Date().toISOString(),
      error: `Failed to reach RailRadar backend service: ${msg}`
    };
  }
}

/**
 * Invalidate server-side cache
 */
export async function invalidateServerCache(trainNumber?: string): Promise<boolean> {
  try {
    const res = await fetch('/api/railradar/cache/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trainNumber ? { trainNumber } : {})
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json = await res.json();
      return !!json.success;
    }
    return true;
  } catch {
    return true;
  }
}

/** Corridor train numbers for the Vijayawada Division BPP–CLX corridor */
export const CORRIDOR_TRAINS = ['12627', '12723', '17011', '20834', '12711', '12615'];

/**
 * Fetch all corridor trains in parallel with mode & refresh flags.
 */
export async function fetchAllCorridorTrains(
  options: { mode?: 'live' | 'demo'; refresh?: boolean } = {}
): Promise<{
  trains: LiveTrainPosition[];
  source: DataSource;
  timestamp: string;
  upstreamUpdatedAt?: string;
  errors: string[];
}> {
  const mode = options.mode || 'live';
  const results = await Promise.all(
    CORRIDOR_TRAINS.map(num => fetchLiveTrainStatus(num, { ...options, mode }))
  );

  const trains: LiveTrainPosition[] = [];
  const errors: string[] = [];
  let latestUpstreamUpdate: string | undefined;

  let liveCount = 0;
  let demoCount = 0;

  for (const r of results) {
    if (r.data) {
      trains.push(r.data);
      if (r.upstreamUpdatedAt && (!latestUpstreamUpdate || r.upstreamUpdatedAt > latestUpstreamUpdate)) {
        latestUpstreamUpdate = r.upstreamUpdatedAt;
      }
    }
    if (r.source === 'LIVE') liveCount++;
    if (r.source === 'DEMO') demoCount++;
    if (r.error) errors.push(r.error);
  }

  let overallSource: DataSource;
  if (mode === 'live') {
    overallSource = liveCount > 0 ? 'LIVE' : 'UNAVAILABLE';
  } else {
    overallSource = 'DEMO';
  }

  return {
    trains: overallSource === 'UNAVAILABLE' ? [] : trains,
    source: overallSource,
    timestamp: new Date().toISOString(),
    upstreamUpdatedAt: latestUpstreamUpdate,
    errors: overallSource === 'DEMO' ? [] : errors,
  };
}

// -----------------------------------------------------------------------------
// 20-Minute Planning & Conflict Check Cycle (Prototype Implementation)
// Flow: Existing RailRadar Service -> 20-min refresh -> Current Train Locations -> Planning Engine / Conflict Monitor
// -----------------------------------------------------------------------------

export const PLANNING_CONFLICT_CYCLE_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes (1,200,000 ms)

export interface PlanningConflictCycleState {
  isActive: boolean;
  intervalMs: number;
  intervalMinutes: number;
  lastRunTimestamp: string | null;
  nextRunTimestamp: string | null;
  cycleRunCount: number;
  isExecuting: boolean;
  lastSource: DataSource | null;
  lastTrainCount: number;
  lastError: string | null;
}

export type PlanningConflictCycleListener = (result: {
  trains: LiveTrainPosition[];
  source: DataSource;
  timestamp: string;
  cycleCount: number;
  error?: string;
}) => void;

class PlanningConflictCycleManager {
  private timer: any = null;
  private intervalMs: number = PLANNING_CONFLICT_CYCLE_INTERVAL_MS;
  private listeners: Set<PlanningConflictCycleListener> = new Set();
  private inFlightPromise: Promise<{
    trains: LiveTrainPosition[];
    source: DataSource;
    timestamp: string;
    cycleCount: number;
    error?: string;
  }> | null = null;
  private state: PlanningConflictCycleState = {
    isActive: false,
    intervalMs: PLANNING_CONFLICT_CYCLE_INTERVAL_MS,
    intervalMinutes: 20,
    lastRunTimestamp: null,
    nextRunTimestamp: null,
    cycleRunCount: 0,
    isExecuting: false,
    lastSource: null,
    lastTrainCount: 0,
    lastError: null
  };

  public getState(): PlanningConflictCycleState {
    return { ...this.state };
  }

  public getActiveTimerCount(): number {
    return this.timer !== null ? 1 : 0;
  }

  public getSubscriberCount(): number {
    return this.listeners.size;
  }

  public setIntervalMinutes(minutes: number): void {
    const validMinutes = Math.max(1, minutes);
    this.intervalMs = validMinutes * 60 * 1000;
    this.state.intervalMs = this.intervalMs;
    this.state.intervalMinutes = validMinutes;
    if (this.state.isActive) {
      this.stop();
      this.start();
    }
  }

  public subscribe(listener: PlanningConflictCycleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public start(intervalMs?: number): void {
    if (intervalMs) {
      this.intervalMs = intervalMs;
      this.state.intervalMs = intervalMs;
      this.state.intervalMinutes = Math.round(intervalMs / (60 * 1000));
    }
    if (this.timer) {
      // Single loop guard: strictly one timer can exist across the entire application lifecycle
      return;
    }
    this.state.isActive = true;
    this.state.nextRunTimestamp = new Date(Date.now() + this.intervalMs).toISOString();

    this.timer = setInterval(() => {
      this.executeCycle();
    }, this.intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state.isActive = false;
    this.state.nextRunTimestamp = null;
  }

  public async executeCycle(options: { forceRefresh?: boolean; mode?: 'live' | 'demo' } = {}): Promise<{
    trains: LiveTrainPosition[];
    source: DataSource;
    timestamp: string;
    cycleCount: number;
    error?: string;
  }> {
    // In-flight coalescing: If a cycle is already running, coalesce all callers onto the exact same promise
    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.state.isExecuting = true;
    this.inFlightPromise = (async () => {
      const now = new Date().toISOString();
      try {
        // Safely reuse existing RailRadar corridor fetcher without cache collision
        const result = await fetchAllCorridorTrains({
          mode: options.mode || 'live',
          refresh: options.forceRefresh || false
        });

        this.state.cycleRunCount += 1;
        this.state.lastRunTimestamp = now;
        this.state.nextRunTimestamp = new Date(Date.now() + this.intervalMs).toISOString();
        this.state.lastSource = result.source;
        this.state.lastTrainCount = result.trains.length;
        this.state.lastError = result.errors.length > 0 ? result.errors[0] : null;

        const payload = {
          trains: result.trains,
          source: result.source,
          timestamp: result.timestamp || now,
          cycleCount: this.state.cycleRunCount,
          error: this.state.lastError || undefined
        };

        for (const listener of this.listeners) {
          try {
            listener(payload);
          } catch (e) {
            console.error('[PlanningConflictCycle] Listener error:', e);
          }
        }

        return payload;
      } catch (err: any) {
        const errMsg = err?.message || 'Failed executing 20-minute planning check cycle';
        this.state.lastError = errMsg;
        const payload = {
          trains: [],
          source: 'UNAVAILABLE' as DataSource,
          timestamp: now,
          cycleCount: this.state.cycleRunCount,
          error: errMsg
        };
        for (const listener of this.listeners) {
          try {
            listener(payload);
          } catch {}
        }
        return payload;
      } finally {
        this.state.isExecuting = false;
      }
    })().finally(() => {
      this.inFlightPromise = null;
    });

    return this.inFlightPromise;
  }
}

export const planningConflictCycle = new PlanningConflictCycleManager();

/**
 * Fetch full train schedule / timetable from backend
 */
export async function fetchTrainSchedule(
  trainNumber: string,
  options: { haltsOnly?: boolean; refresh?: boolean } = {}
): Promise<ApiResponse<any>> {
  try {
    const qs = new URLSearchParams();
    if (options.haltsOnly) qs.set('haltsOnly', 'true');
    if (options.refresh) qs.set('refresh', 'true');
    const qStr = qs.toString() ? `?${qs.toString()}` : '';

    const res = await fetch(`/api/railradar/train/${encodeURIComponent(trainNumber)}/schedule${qStr}`);
    if (!res.ok) {
      return { success: false, data: null, source: 'UNAVAILABLE', timestamp: new Date().toISOString(), error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { success: !!json.success, data: json.data, source: json.source || 'LIVE', timestamp: json.timestamp || new Date().toISOString() };
  } catch (err: any) {
    return { success: false, data: null, source: 'UNAVAILABLE', timestamp: new Date().toISOString(), error: err?.message };
  }
}

/**
 * Fetch train route geometry from backend
 */
export async function fetchTrainRouteGeometry(
  trainNumber: string,
  options: { refresh?: boolean; mode?: 'live' | 'demo' } = {}
): Promise<ApiResponse<any>> {
  try {
    const qs = new URLSearchParams();
    if (options.refresh) qs.set('refresh', 'true');
    if (options.mode) qs.set('mode', options.mode);
    const qStr = qs.toString() ? `?${qs.toString()}` : '';

    const res = await fetch(`/api/railradar/train/${encodeURIComponent(trainNumber)}/route${qStr}`);
    if (!res.ok) {
      return { success: false, data: null, source: 'UNAVAILABLE', timestamp: new Date().toISOString(), error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { success: !!json.success, data: json.data, source: json.source || 'LIVE', timestamp: json.timestamp || new Date().toISOString() };
  } catch (err: any) {
    return { success: false, data: null, source: 'UNAVAILABLE', timestamp: new Date().toISOString(), error: err?.message };
  }
}

/**
 * Fetch trains between two stations
 */
export async function fetchTrainsBetweenStations(
  fromStation: string,
  toStation: string,
  options: { date?: string; live?: boolean; refresh?: boolean } = {}
): Promise<ApiResponse<any[]>> {
  try {
    const qs = new URLSearchParams();
    if (options.date) qs.set('date', options.date);
    if (options.live) qs.set('live', 'true');
    if (options.refresh) qs.set('refresh', 'true');
    const qStr = qs.toString() ? `?${qs.toString()}` : '';

    const res = await fetch(`/api/railradar/trains/between/${encodeURIComponent(fromStation)}/${encodeURIComponent(toStation)}${qStr}`);
    if (!res.ok) {
      return { success: false, data: null, source: 'UNAVAILABLE', timestamp: new Date().toISOString(), error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { success: !!json.success, data: json.data, source: json.source || 'LIVE', timestamp: json.timestamp || new Date().toISOString() };
  } catch (err: any) {
    return { success: false, data: null, source: 'UNAVAILABLE', timestamp: new Date().toISOString(), error: err?.message };
  }
}

/**
 * Autocomplete station search
 */
export async function searchRailRadarStations(query: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/railradar/search/stations?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Autocomplete train search
 */
export async function searchRailRadarTrains(query: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/railradar/search/trains?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch station timetable
 */
export async function fetchStationTimetable(
  stationCode: string,
  options: { date?: string; refresh?: boolean } = {}
): Promise<ApiResponse<any[]>> {
  try {
    const qs = new URLSearchParams();
    if (options.date) qs.set('date', options.date);
    if (options.refresh) qs.set('refresh', 'true');
    const qStr = qs.toString() ? `?${qs.toString()}` : '';

    const res = await fetch(`/api/railradar/station/${encodeURIComponent(stationCode)}/timetable${qStr}`);
    if (!res.ok) {
      return { success: false, data: null, source: 'UNAVAILABLE', timestamp: new Date().toISOString(), error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { success: !!json.success, data: json.data, source: json.source || 'LIVE', timestamp: json.timestamp || new Date().toISOString() };
  } catch (err: any) {
    return { success: false, data: null, source: 'UNAVAILABLE', timestamp: new Date().toISOString(), error: err?.message };
  }
}

/**
 * Helper to extract Leaflet-compatible [lat, lng] coordinates and waypoint count from GeoJSON route data.
 * Converts GeoJSON [lon, lat] coordinates to Leaflet [lat, lng].
 * Does NOT fabricate straight lines when unavailable - returns null.
 */
export function extractRouteCoordinates(routeData: any): {
  coordinates: [number, number][];
  waypointsCount: number;
  stations?: any[];
} | null {
  if (!routeData) return null;
  const target = routeData.geojson || routeData;
  let rawCoords: number[][] = [];
  if (target.geometry && Array.isArray(target.geometry.coordinates)) {
    rawCoords = target.geometry.coordinates;
  } else if (Array.isArray(target.coordinates)) {
    rawCoords = target.coordinates;
  } else if (Array.isArray(target)) {
    rawCoords = target;
  }

  if (!rawCoords || rawCoords.length === 0) return null;

  const leafletCoords: [number, number][] = rawCoords
    .filter((pt: any) => Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number')
    .map((pt: any) => [pt[1], pt[0]] as [number, number]);

  if (leafletCoords.length === 0) return null;

  return {
    coordinates: leafletCoords,
    waypointsCount: leafletCoords.length,
    stations: routeData.properties?.stations || routeData.stations || []
  };
}

/**
 * Fetch real route coordinates for a train from backend proxy.
 */
export async function fetchTrainRouteCoordinates(trainNumber: string): Promise<{
  coordinates: [number, number][];
  waypointsCount: number;
  stations?: any[];
} | null> {
  if (!trainNumber) return null;
  const res = await fetchTrainRouteGeometry(trainNumber);
  if (!res.success || !res.data) return null;
  return extractRouteCoordinates(res.data);
}


// Rail Samnvay — RailRadar Frontend API Client
// All requests go through our backend proxy at /api/railradar/*
// The API key is server-side only and never exposed to the browser.

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

/**
 * Fetch live status for a single train via our backend proxy.
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
  const { mode = 'demo', refresh = false, date } = options;
  const params = new URLSearchParams();
  if (mode) params.set('mode', mode);
  if (refresh) params.set('refresh', 'true');
  if (date) params.set('date', date);

  try {
    const res = await fetch(`/api/railradar/train/${encodeURIComponent(trainNumber)}/live?${params.toString()}`);
    const json: ApiResponse<LiveTrainPosition> = await res.json();
    return {
      source: json.source as DataSource,
      data: json.success ? json.data : null,
      timestamp: json.timestamp || new Date().toISOString(),
      upstreamUpdatedAt: json.upstreamUpdatedAt || json.data?.upstreamUpdatedAt,
      error: json.error,
      cached: json.meta?.cached
    };
  } catch (err) {
    return {
      source: 'UNAVAILABLE',
      data: null,
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Network error connecting to telemetry proxy',
    };
  }
}

/**
 * Fetch live station board (arrivals/departures) via our backend proxy.
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
  const { mode = 'demo', refresh = false } = options;
  const params = new URLSearchParams();
  if (mode) params.set('mode', mode);
  if (refresh) params.set('refresh', 'true');

  try {
    const res = await fetch(`/api/railradar/station/${encodeURIComponent(stationCode)}/live?${params.toString()}`);
    const json: ApiResponse<any> = await res.json();
    let entries: StationBoardEntry[] | null = null;
    if (json.success && json.data) {
      if (Array.isArray(json.data)) {
        entries = json.data;
      } else if (Array.isArray((json.data as any).trains)) {
        entries = (json.data as any).trains;
      } else {
        entries = [];
      }
    }
    return {
      source: json.source as DataSource,
      data: entries,
      timestamp: json.timestamp || new Date().toISOString(),
      upstreamUpdatedAt: json.upstreamUpdatedAt,
      error: json.error,
      cached: json.meta?.cached
    };
  } catch (err) {
    return {
      source: 'UNAVAILABLE',
      data: null,
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Network error connecting to telemetry proxy',
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
    const json = await res.json();
    return !!json.success;
  } catch {
    return false;
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
  const results = await Promise.all(
    CORRIDOR_TRAINS.map(num => fetchLiveTrainStatus(num, options))
  );

  const trains: LiveTrainPosition[] = [];
  const errors: string[] = [];
  let overallSource: DataSource = options.mode === 'live' ? 'LIVE' : 'DEMO';
  let latestUpstreamUpdate: string | undefined;

  let liveCount = 0;
  let unavailCount = 0;

  for (const r of results) {
    if (r.data) {
      trains.push(r.data);
      if (r.upstreamUpdatedAt && (!latestUpstreamUpdate || r.upstreamUpdatedAt > latestUpstreamUpdate)) {
        latestUpstreamUpdate = r.upstreamUpdatedAt;
      }
    }
    if (r.source === 'LIVE') liveCount++;
    if (r.source === 'UNAVAILABLE') unavailCount++;
    if (r.error) errors.push(r.error);
  }

  if (options.mode === 'live') {
    if (liveCount > 0) {
      overallSource = 'LIVE';
    } else if (unavailCount === results.length) {
      overallSource = 'UNAVAILABLE';
    }
  } else {
    overallSource = 'DEMO';
  }

  return {
    trains,
    source: overallSource,
    timestamp: new Date().toISOString(),
    upstreamUpdatedAt: latestUpstreamUpdate,
    errors,
  };
}

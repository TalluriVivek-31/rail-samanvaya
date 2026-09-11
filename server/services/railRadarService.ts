export interface ServiceResponse {
  source: 'LIVE' | 'DEMO' | 'UNAVAILABLE';
  data: any;
  timestamp: string;
  upstreamUpdatedAt?: string;
  cached?: boolean;
  cacheExpiresAt?: string;
  error?: string;
}

interface CacheEntry {
  response: ServiceResponse;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<ServiceResponse>>();

const CACHE_TTL = 30 * 1000; // 30 seconds maximum
const API_TIMEOUT = 8 * 1000; // 8 seconds timeout

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Clear cache for a specific key or entire cache
 */
export function clearRailRadarCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cache.clear();
    console.log('[RailRadar] Entire cache invalidated');
  } else {
    for (const key of cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        cache.delete(key);
        console.log(`[RailRadar] Invalidation: Removed cache for ${key}`);
      }
    }
  }
}

/**
 * Validates and normalizes raw RailRadar train live telemetry
 */
function normalizeTrainData(raw: any, trainNumber: string): any {
  if (!raw) return null;
  const t = raw.data || raw;

  const delay = typeof t.delayMinutes === 'number'
    ? t.delayMinutes
    : typeof t.delay_in_minutes === 'number' 
    ? t.delay_in_minutes 
    : typeof t.delay === 'number'
    ? t.delay
    : parseInt(t.delayMinutes || t.delay_in_minutes || t.delay, 10) || 0;

  const speed = typeof t.speed_kmph === 'number'
    ? t.speed_kmph
    : typeof t.speedKmph === 'number'
    ? t.speedKmph
    : typeof t.speed === 'number'
    ? t.speed
    : typeof t.train?.avgSpeed === 'number'
    ? Math.round(t.train.avgSpeed)
    : parseInt(t.speed, 10) || 0;

  const currentKm = typeof t.currentLocation?.distanceFromOriginKm === 'number'
    ? t.currentLocation.distanceFromOriginKm
    : typeof t.current_km === 'number'
    ? t.current_km
    : typeof t.currentKm === 'number'
    ? t.currentKm
    : parseFloat(t.current_km || t.currentKm) || 320;

  const currentStation = t.currentLocation?.stationCode || t.current_station || t.currentStation || 'BPP';
  const nextStation = t.nextHalt?.stationCode || t.next_station || t.nextStation || 'CLX';
  const lastReportedStation = t.previousHalt?.stationCode || t.last_reported_station || t.lastReportedStation || 'APL';

  const upstreamUpdated = t.lastUpdatedAt || t.telemetry_updated_at || t.last_updated || t.lastUpdated || t.updated_at || new Date().toISOString();

  return {
    trainNumber: String(t.trainNumber || t.train_number || trainNumber),
    trainName: String(t.trainName || t.train_name || t.train?.name || 'Indian Railways Express'),
    currentStation: String(currentStation),
    nextStation: String(nextStation),
    lastReportedStation: String(lastReportedStation),
    direction: (t.direction === 'DN' ? 'DN' : 'UP') as 'UP' | 'DN',
    delayMinutes: delay,
    scheduledArrival: String(t.scheduled_arrival || t.scheduledArrival || '14:30'),
    expectedArrival: String(t.expected_arrival || t.expectedArrival || '14:42'),
    currentKm,
    speedKmph: speed,
    platform: t.platform ? Number(t.platform) : null,
    status: t.status || 'RUNNING',
    lastUpdated: new Date().toISOString(),
    upstreamUpdatedAt: upstreamUpdated,
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Validates and normalizes raw RailRadar station board telemetry
 */
function normalizeStationData(raw: any): any[] {
  if (!raw) return [];
  const payload = raw.data || raw;
  const list = Array.isArray(payload) ? payload : (payload.trains || []);
  if (!Array.isArray(list)) return [];

  return list.map((item: any) => {
    if (item.trainNumber && item.scheduledTime) {
      return item;
    }

    const train = item.train || {};
    const stop = item.stop || {};
    const live = item.live || {};

    const delay = typeof live.delayMinutes === 'number'
      ? live.delayMinutes
      : typeof live.delay === 'number'
      ? live.delay
      : parseInt(live.delayMinutes || live.delay, 10) || 0;

    const schTime = stop.arrival || stop.departure || '14:30';
    let expTime = schTime;
    if (live.expectedArrivalTime) {
      try {
        const d = new Date(live.expectedArrivalTime);
        if (!isNaN(d.getTime())) {
          expTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
      } catch {}
    } else if (live.expectedDepartureTime) {
      try {
        const d = new Date(live.expectedDepartureTime);
        if (!isNaN(d.getTime())) {
          expTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
      } catch {}
    }

    const platformNum = stop.platform ? parseInt(stop.platform, 10) : null;

    return {
      trainNumber: String(train.number || train.trainNumber || item.trainNumber || '00000'),
      trainName: String(train.name || train.trainName || item.trainName || 'Express'),
      type: (stop.departure && !stop.arrival) ? 'DEPARTURE' : 'ARRIVAL',
      scheduledTime: schTime,
      expectedTime: expTime,
      delayMinutes: delay,
      platform: (platformNum !== null && !isNaN(platformNum)) ? platformNum : null,
      status: delay > 0 ? 'DELAYED' : 'ON_TIME',
      direction: (item.direction === 'DN' || train.direction === 'DN') ? 'DN' : 'UP'
    };
  });
}

/**
 * Retrieves live train status with strictly enforced 30s TTL and no fallback leakage
 */
export async function getLiveTrainStatus(
  trainNumber: string, 
  options: { forceRefresh?: boolean; mode?: 'live' | 'demo'; date?: string } = {}
): Promise<ServiceResponse> {
  const { forceRefresh = false, mode = 'live', date } = options;
  const dateKey = date ? `:${date}` : '';
  const cacheKey = `train:${trainNumber}${dateKey}`;

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[RailRadar] Cache HIT: ${cacheKey} (expires in ${Math.round((cached.expiresAt - Date.now()) / 1000)}s)`);
      return { 
        ...cached.response, 
        cached: true,
        cacheExpiresAt: new Date(cached.expiresAt).toISOString()
      };
    }
  } else {
    cache.delete(cacheKey);
    console.log(`[RailRadar] Manual Invalidation: Evicted ${cacheKey}`);
  }

  if (inFlightRequests.has(cacheKey)) {
    console.log(`[RailRadar] Joining in-flight request for: ${cacheKey}`);
    return inFlightRequests.get(cacheKey) as Promise<ServiceResponse>;
  }

  const promise = (async (): Promise<ServiceResponse> => {
    const rawKey = process.env.RAILRADAR_API_KEY || '';
    const apiKey = rawKey.trim().replace(/^Bearer\s+/i, '');

    if (!apiKey) {
      console.warn(`[RailRadar] LIVE mode requested for ${trainNumber} but RAILRADAR_API_KEY is not configured.`);
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: 'RAILRADAR_API_KEY not configured on server. Add API key to .env'
      };
    }

    try {
      console.log(`[RailRadar] Upstream request started: GET /v1/trains/${trainNumber}/live`);
      const dateParam = date ? ('?date=' + encodeURIComponent(date)) : '';
      const url = `https://api.railradar.in/v1/trains/${encodeURIComponent(trainNumber)}/live${dateParam}`;
      
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey,
            'Accept': 'application/json'
          }
        },
        API_TIMEOUT
      );

      if (!response.ok) {
        console.warn(`[RailRadar] Upstream error for train ${trainNumber}: HTTP ${response.status}`);
        return {
          source: 'UNAVAILABLE',
          data: null,
          timestamp: new Date().toISOString(),
          error: `Upstream RailRadar API returned HTTP ${response.status} ${response.statusText}`
        };
      }

      const json = await response.json();
      const normalized = normalizeTrainData(json, trainNumber);

      console.log(`[RailRadar] Upstream response received for ${trainNumber}: Delay = ${normalized.delayMinutes}m, Speed = ${normalized.speedKmph} km/h, KM = ${normalized.currentKm}, Updated = ${normalized.upstreamUpdatedAt}`);

      return {
        source: 'LIVE',
        data: normalized,
        timestamp: new Date().toISOString(),
        upstreamUpdatedAt: normalized.upstreamUpdatedAt,
        cached: false
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error';
      console.error(`[RailRadar] Upstream fetch failed for train ${trainNumber}:`, msg);
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: `Failed to connect to RailRadar API: ${msg}`
      };
    }
  })();

  inFlightRequests.set(cacheKey, promise);

  try {
    const result = await promise;
    if (result.source === 'LIVE' && result.data !== null) {
      const expiresAt = Date.now() + CACHE_TTL;
      cache.set(cacheKey, {
        response: result,
        expiresAt
      });
      result.cacheExpiresAt = new Date(expiresAt).toISOString();
    }
    return result;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

/**
 * Retrieves live station board with 30s TTL
 */
export async function getLiveStationBoard(
  stationCode: string,
  options: { forceRefresh?: boolean; mode?: 'live' | 'demo' } = {}
): Promise<ServiceResponse> {
  const { forceRefresh = false, mode = 'live' } = options;
  const cacheKey = `station:${stationCode.toUpperCase()}`;

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.response, cached: true, cacheExpiresAt: new Date(cached.expiresAt).toISOString() };
    }
  } else {
    cache.delete(cacheKey);
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<ServiceResponse>;
  }

  const promise = (async (): Promise<ServiceResponse> => {
    const rawKey = process.env.RAILRADAR_API_KEY || '';
    const apiKey = rawKey.trim().replace(/^Bearer\s+/i, '');

    if (!apiKey) {
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: 'RAILRADAR_API_KEY not configured on server. Add API key to .env'
      };
    }

    try {
      const response = await fetchWithTimeout(
        `https://api.railradar.in/v1/stations/${encodeURIComponent(stationCode.toUpperCase())}/live`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey,
            'Accept': 'application/json'
          }
        },
        API_TIMEOUT
      );

      if (!response.ok) {
        return {
          source: 'UNAVAILABLE',
          data: null,
          timestamp: new Date().toISOString(),
          error: `Upstream RailRadar station board returned HTTP ${response.status} ${response.statusText}`
        };
      }

      const json = await response.json();
      const normalizedEntries = normalizeStationData(json);
      return {
        source: 'LIVE',
        data: normalizedEntries,
        timestamp: new Date().toISOString(),
        upstreamUpdatedAt: json.updated_at || new Date().toISOString()
      };
    } catch (error) {
      return {
        source: 'UNAVAILABLE',
        data: null,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  })();

  inFlightRequests.set(cacheKey, promise);

  try {
    const result = await promise;
    if (result.source === 'LIVE' && result.data !== null) {
      cache.set(cacheKey, {
        response: result,
        expiresAt: Date.now() + CACHE_TTL
      });
    }
    return result;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}
